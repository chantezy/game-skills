#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, "..", "skills");

export interface SkillMeta {
  name: string;
  description: string;
  trigger: string;
  directory: string;
}

export interface SkillDetail extends SkillMeta {
  content: string;
  body: string;
  references: string[];
}

export interface RouteResult {
  matched: boolean;
  best?: SkillMeta;
  candidates: SkillMeta[];
  fallback: boolean;
  total: number;
  scores?: { name: string; score: number; matchedKeywords: string[] }[];
}

interface Frontmatter {
  name?: string;
  description?: string;
  trigger?: string;
}

// ----- LRU Cache for full skill details -----
const SKILL_CACHE_MAX = 32;
const skillDetailCache = new Map<string, SkillDetail>();
const skillDetailOrder: string[] = [];

function cachePut(key: string, value: SkillDetail): void {
  if (skillDetailCache.has(key)) {
    skillDetailCache.delete(key);
    skillDetailCache.set(key, value);
    return;
  }
  if (skillDetailCache.size >= SKILL_CACHE_MAX) {
    const oldest = skillDetailOrder.shift();
    if (oldest !== undefined) skillDetailCache.delete(oldest);
  }
  skillDetailCache.set(key, value);
  skillDetailOrder.push(key);
}

function cacheGet(key: string): SkillDetail | undefined {
  const value = skillDetailCache.get(key);
  if (value) {
    // refresh recency
    skillDetailCache.delete(key);
    skillDetailCache.set(key, value);
    const idx = skillDetailOrder.indexOf(key);
    if (idx >= 0) {
      skillDetailOrder.splice(idx, 1);
      skillDetailOrder.push(key);
    }
  }
  return value;
}

export function cacheStats() {
  return {
    size: skillDetailCache.size,
    keys: Array.from(skillDetailCache.keys()),
    max: SKILL_CACHE_MAX,
  };
}

export function clearCache(): void {
  skillDetailCache.clear();
  skillDetailOrder.length = 0;
}

// ----- Frontmatter parsing -----
function parseFrontmatter(content: string): { fm: Frontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { fm: {}, body: content };
  }

  let fm: Frontmatter = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.+)$/);
    if (kv) {
      const key = kv[1].trim();
      let val = kv[2].trim().replace(/^["']|["']$/g, "");
      (fm as Record<string, string>)[key] = val;
    }
  }

  return { fm, body: match[2] || "" };
}

function normalizeSkillDir(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function sanitizeRef(ref: string): string | null {
  const sanitized = ref.replace(/[^a-zA-Z0-9_-]/g, "");
  return sanitized || null;
}

// ----- Lightweight metadata index (no full content) -----
// Built once on first access, cached for process lifetime.
let skillIndexCache: SkillMeta[] | null = null;
let skillIndexTimestamp = 0;

function buildSkillIndex(): SkillMeta[] {
  if (skillIndexCache) return skillIndexCache;

  const skills: SkillMeta[] = [];
  if (!fs.existsSync(SKILLS_DIR)) {
    skillIndexCache = skills;
    return skills;
  }

  const entries = fs.readdirSync(SKILLS_DIR);
  for (const entry of entries) {
    const entryPath = path.join(SKILLS_DIR, entry);
    const skillMdPath = path.join(entryPath, "SKILL.md");
    if (fs.statSync(entryPath).isDirectory() && fs.existsSync(skillMdPath)) {
      // Only read frontmatter head (first ~1KB) to avoid loading entire file
      const fd = fs.openSync(skillMdPath, "r");
      const buf = Buffer.alloc(1024);
      const bytesRead = fs.readSync(fd, buf, 0, 1024, 0);
      fs.closeSync(fd);
      const head = buf.subarray(0, bytesRead).toString("utf-8");
      const { fm } = parseFrontmatter(head);
      let trigger = fm.trigger || "";
      if (!trigger && fm.description) {
        const triggerMatch = fm.description.match(/当[^触发]*?(?:时|触发)/);
        if (triggerMatch) trigger = triggerMatch[0];
      }
      skills.push({
        name: fm.name || normalizeSkillDir(entry),
        description: fm.description || "",
        trigger,
        directory: entry,
      });
    }
  }
  skillIndexCache = skills;
  skillIndexTimestamp = Date.now();
  return skills;
}

export function listSkills(): SkillMeta[] {
  return buildSkillIndex();
}

// ----- Intent Router: keyword-based fast matching on trigger + description -----
// Tokenization for CJK + latin: split by non-word chars but keep CJK chars as singles.
function tokenize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  // Extract CJK runs and latin words separately
  const tokens: string[] = [];
  const cjkRe = /[\u4e00-\u9fff]+/g;
  const latinRe = /[a-z][a-z0-9_-]{1,}/g;

  let m: RegExpExecArray | null;
  while ((m = cjkRe.exec(lower)) !== null) {
    // For CJK runs, split into single chars AND bigrams for better recall
    const run = m[0];
    for (const ch of run) tokens.push(ch);
    for (let i = 0; i < run.length - 1; i++) {
      tokens.push(run.substring(i, i + 2));
    }
  }
  while ((m = latinRe.exec(lower)) !== null) {
    tokens.push(m[0]);
  }
  return tokens;
}

// Common Chinese stopwords (single char) to reduce noise
const STOPWORDS = new Set([
  "的", "了", "是", "在", "和", "或", "与", "时", "当", "需", "要",
  "一", "个", "些", "等", "中",
]);

function scoreSkill(skill: SkillMeta, queryTokens: string[]): {
  score: number;
  matchedKeywords: string[];
} {
  const nameTokens = tokenize(skill.name);
  const triggerTokens = tokenize(skill.trigger + " " + skill.description);

  const nameSet = new Set(nameTokens);
  const triggerSet = new Set(triggerTokens);

  let score = 0;
  const matched: string[] = [];
  const seenTokens = new Set<string>();

  for (const tok of queryTokens) {
    if (tok.length < 2 && STOPWORDS.has(tok)) continue;
    if (seenTokens.has(tok)) continue;
    seenTokens.add(tok);

    // Name match: high weight (5)
    if (nameSet.has(tok)) {
      score += 5;
      matched.push(tok);
      continue;
    }
    // Trigger/description match: medium weight (2)
    if (triggerSet.has(tok)) {
      score += 2;
      matched.push(tok);
      continue;
    }
    // Partial substring match in trigger (CJK single char fallback): weight 1
    if (tok.length >= 2 && (skill.trigger.includes(tok) || skill.description.includes(tok))) {
      score += 1;
      if (!matched.includes(tok)) matched.push(tok);
    }
  }
  return { score, matchedKeywords: matched };
}

export function routeIntent(userIntent: string): RouteResult {
  const skills = listSkills();
  if (skills.length === 0) {
    return { matched: false, candidates: [], fallback: true, total: 0 };
  }

  const queryTokens = tokenize(userIntent);

  // Empty query or very short → fallback to full list
  if (queryTokens.length === 0) {
    return {
      matched: false,
      candidates: skills,
      fallback: true,
      total: skills.length,
    };
  }

  const scored = skills.map((s) => ({
    skill: s,
    ...scoreSkill(s, queryTokens),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];

  // Score thresholds for confident match:
  // - top score >= 4 (i.e. one name hit OR two trigger hits OR strong overlap)
  // - and top strictly greater than second
  const HIGH_CONFIDENCE = 4;
  const isHighConfidence =
    top.score >= HIGH_CONFIDENCE &&
    (second.score === 0 || top.score - second.score >= 2);

  if (isHighConfidence) {
    return {
      matched: true,
      best: top.skill,
      candidates: [top.skill, ...(second.score > 0 ? [second.skill] : [])],
      fallback: false,
      total: skills.length,
      scores: scored.slice(0, 5).map((s) => ({
        name: s.skill.name,
        score: s.score,
        matchedKeywords: s.matchedKeywords,
      })),
    };
  }

  // Medium confidence: return top 3 candidates for the LLM/user to choose
  const top3 = scored.filter((s) => s.score > 0).slice(0, 3);
  if (top3.length > 0) {
    return {
      matched: false,
      candidates: top3.map((s) => s.skill),
      fallback: false,
      total: skills.length,
      scores: scored.slice(0, 5).map((s) => ({
        name: s.skill.name,
        score: s.score,
        matchedKeywords: s.matchedKeywords,
      })),
    };
  }

  // No match at all → return ALL skills for user selection (fallback strategy)
  return {
    matched: false,
    candidates: skills,
    fallback: true,
    total: skills.length,
    scores: scored.slice(0, 5).map((s) => ({
      name: s.skill.name,
      score: s.score,
      matchedKeywords: s.matchedKeywords,
    })),
  };
}

export function getSkill(name: string): SkillDetail | null {
  const normalized = name.toLowerCase().replace(/\s+/g, "-");

  // Try cache first (by normalized key)
  const cached = cacheGet(normalized);
  if (cached) return cached;

  const skills = listSkills();
  const skill = skills.find(
    (s) =>
      s.name === name ||
      s.name === normalized ||
      s.directory === name ||
      s.directory === normalized,
  );
  if (!skill) return null;

  const skillMdPath = path.join(SKILLS_DIR, skill.directory, "SKILL.md");
  const content = fs.readFileSync(skillMdPath, "utf-8");
  const { fm, body } = parseFrontmatter(content);

  const refDir = path.join(SKILLS_DIR, skill.directory, "references");
  const references: string[] = [];
  if (fs.existsSync(refDir) && fs.statSync(refDir).isDirectory()) {
    const files = fs.readdirSync(refDir);
    for (const file of files) {
      if (file.endsWith(".md")) {
        references.push(file.replace(/\.md$/, ""));
      }
    }
  }

  const detail: SkillDetail = {
    name: fm.name || skill.name,
    description: fm.description || skill.description,
    trigger: fm.trigger || skill.trigger || "",
    directory: skill.directory,
    content,
    body,
    references,
  };

  cachePut(normalized, detail);
  return detail;
}

export function getReference(name: string, ref: string): string | null {
  const safeRef = sanitizeRef(ref);
  if (!safeRef) return null;

  const skills = listSkills();
  const normalized = name.toLowerCase().replace(/\s+/g, "-");
  const skill = skills.find(
    (s) =>
      s.name === name ||
      s.name === normalized ||
      s.directory === name ||
      s.directory === normalized,
  );
  if (!skill) return null;

  const refPath = path.join(SKILLS_DIR, skill.directory, "references", `${safeRef}.md`);
  if (!fs.existsSync(refPath)) {
    return null;
  }

  return fs.readFileSync(refPath, "utf-8");
}
