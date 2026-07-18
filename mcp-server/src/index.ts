#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listSkills,
  getSkill,
  getReference,
  routeIntent,
} from "./skill-loader.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

const server = new McpServer({
  name: "mcp-game-design",
  version: pkg.version,
});

// ----- Tool: route_intent (Intent Router) -----
// Fast skill matching based on trigger + description. Does NOT load full skill content.
// Returns: best match (high confidence), top-3 candidates (medium confidence), or all skills (fallback).
server.tool(
  "route_intent",
  "意图路由器：根据用户输入快速匹配最合适的技能。仅基于 trigger + description 做轻量级关键词匹配，不加载完整 Skill 内容。匹配策略：高置信度直接返回最佳技能，中置信度返回 top-3 候选，无法匹配时返回所有技能列表让用户选择。优先调用此工具做快速匹配，匹配后再调用 get_skill 获取完整内容。",
  {
    user_intent: z
      .string()
      .describe("用户的原始意图描述或问题文本，例如 '我想设计一个背包系统'"),
  },
  async ({ user_intent }) => {
    const result = routeIntent(user_intent);

    if (result.matched && result.best) {
      // High confidence match
      const best = result.best;
      const text =
        `# 意图匹配结果：高置信度 ✅\n\n` +
        `**输入意图：** ${user_intent}\n\n` +
        `**推荐技能：** \`${best.name}\`\n\n` +
        `**触发场景：** ${best.trigger || "(未设置)"}\n\n` +
        `**描述：** ${best.description}\n\n` +
        `---\n` +
        `匹配分数：${result.scores?.[0]?.score ?? "N/A"}，命中关键词：${result.scores?.[0]?.matchedKeywords.join("、") || "无"}\n\n` +
        `**下一步：** 调用 \`get_skill\` 工具，参数 name="${best.name}" 获取完整工作流指令。`;

      return {
        content: [{ type: "text" as const, text }],
      };
    }

    if (!result.fallback && result.candidates.length > 0) {
      // Medium confidence: top-3 candidates
      const lines = result.candidates.map((s, i) => {
        const score = result.scores?.[i];
        return `### ${i + 1}. \`${s.name}\`\n` +
          `- **触发场景：** ${s.trigger || "(未设置)"}\n` +
          `- **描述：** ${s.description}\n` +
          `- **匹配分数：** ${score?.score ?? "N/A"}，命中：${score?.matchedKeywords.join("、") || "无"}`;
      });
      const text =
        `# 意图匹配结果：中置信度 ⚠️\n\n` +
        `**输入意图：** ${user_intent}\n\n` +
        `找到 ${result.candidates.length} 个候选技能，请根据具体需求选择：\n\n` +
        lines.join("\n\n") +
        `\n\n---\n**下一步：** 调用 \`get_skill\` 工具，参数 name=\"<选中的技能名>\" 获取完整工作流指令。`;

      return {
        content: [{ type: "text" as const, text }],
      };
    }

    // Fallback: no match, return all skills
    const lines = result.candidates.map((s) => {
      return `- **${s.name}** — ${s.trigger || s.description}`;
    });
    const text =
      `# 意图匹配结果：未找到匹配（兜底策略）\n\n` +
      `**输入意图：** ${user_intent}\n\n` +
      `无法明确匹配到具体技能，以下是全部 ${result.total} 个可用技能，请选择最合适的一个：\n\n` +
      lines.join("\n") +
      `\n\n---\n**下一步：** 调用 \`get_skill\` 工具，参数 name=\"<选中的技能名>\" 获取完整工作流指令。`;

    return {
      content: [{ type: "text" as const, text }],
    };
  },
);

// ----- Tool: list_skills -----
server.tool(
  "list_skills",
  "列出所有可用的游戏设计技能及其触发条件。使用策略：1. 优先调用 route_intent 做意图匹配。2. 当用户明确指定技能时，直接调用 get_skill。3. 仅当需要浏览全部技能时才调用此工具。",
  {},
  async () => {
    const skills = listSkills();

    if (skills.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "未找到任何技能。skills 目录可能为空或未正确同步，请检查 mcp-server/skills/ 目录。",
          },
        ],
      };
    }

    const lines = skills.map(
      (s) => `- **${s.name}** — ${s.trigger || "查看描述了解适用场景"}`,
    );
    const text =
      `# 可用游戏设计技能 (${skills.length})\n\n` +
      `请根据用户意图，选择最匹配的 skill 调用 \`get_skill\`：\n\n` +
      lines.join("\n") +
      `\n\n---\n使用 \`get_skill\` 工具并提供技能名称来获取完整的工作流程指令。\n使用 \`route_intent\` 工具传入用户意图，可自动匹配最合适的技能。`;

    return {
      content: [{ type: "text" as const, text }],
    };
  },
);

// ----- Tool: get_skill -----
server.tool(
  "get_skill",
  "获取指定技能的完整 SKILL.md 内容，包括工作流程、模块路由、输出模板和可用的参考文件列表。已加载的技能会在内存中缓存，重复调用不会重新读取磁盘。调用后按 SKILL.md 中的工作流路由表引导用户使用各模块。",
  {
    name: z.string().describe("技能名称，如 'game-combat-design'"),
  },
  async ({ name }) => {
    const skill = getSkill(name);

    if (!skill) {
      const available = listSkills().map((s) => s.name).join("、");
      return {
        content: [
          {
            type: "text" as const,
            text: `未找到技能 "${name}"。可用技能：${available}`,
          },
        ],
        isError: true,
      };
    }

    const refSection =
      skill.references.length > 0
        ? `\n\n---\n## 可用参考资料\n${skill.references.map((r) => `- ${r}`).join("\n")}\n\n使用 \`get_reference\` 工具并提供技能名称和参考资料名称来读取。`
        : "";

    if (process.env.DEBUG) {
      const stats = cacheStats();
      console.error(
        `[mcp-game-design] get_skill("${name}") — cache size: ${stats.size}/${stats.max}`,
      );
    }

    return {
      content: [
        {
          type: "text" as const,
          text: skill.content + refSection,
        },
      ],
    };
  },
);

// ----- Tool: get_reference -----
server.tool(
  "get_reference",
  "获取指定技能的参考资料文件内容。参考资料包含详细的领域知识，如设计工作流、开发映射规范、美术生产流程、测试方法等。",
  {
    name: z.string().describe("技能名称"),
    ref: z
      .string()
      .describe("参考资料文件名，不含 .md 扩展名（如 'design-workflows'、'dev-bridge-spec'）"),
  },
  async ({ name, ref }) => {
    const content = getReference(name, ref);

    if (!content) {
      const skill = getSkill(name);
      const available = skill ? skill.references.join("、") : "技能不存在";
      return {
        content: [
          {
            type: "text" as const,
            text: `未找到技能 "${name}" 的资料 "${ref}"。可用资料：${available}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: content }],
    };
  },
);

// ----- Tool: cache_stats (debug) -----
server.tool(
  "cache_stats",
  "查看技能缓存状态（调试用）。返回当前内存中已缓存的技能数量和名称列表。已加载的技能会保留在缓存中，重复调用 get_skill 不会重新读取磁盘。",
  {},
  async () => {
    const stats = cacheStats();
    const text =
      `# 技能缓存状态\n\n` +
      `- **已缓存：** ${stats.size} / ${stats.max}\n` +
      `- **缓存键：** ${stats.keys.length > 0 ? stats.keys.join("、") : "(空)"}`;

    return {
      content: [{ type: "text" as const, text }],
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const skills = listSkills();
  if (process.env.DEBUG) {
    console.error(
      `[mcp-game-design] 已加载 ${skills.length} 个技能：${skills.map((s) => s.name).join(", ")}`,
    );
    console.error(
      `[mcp-game-design] Intent Router 已就绪（route_intent 工具）`,
    );
  }
}

main().catch((err) => {
  console.error("MCP Server 启动失败：", err);
  process.exit(1);
});
