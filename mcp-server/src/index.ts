#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listSkills,
  getSkill,
  getReference,
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

// ----- Tool: list_skills -----
// Main entry point: returns all skills with name + description.
// LLM selects the best match based on description (When to use + capabilities).
server.tool(
  "list_skills",
  "列出所有可用的游戏设计技能及其描述。这是首选入口：先调用此工具查看所有技能的名称和“何时使用”描述，根据用户意图选择最匹配的技能后，再调用 get_skill 获取完整工作流。每个技能的 description 已包含“何时使用 + 能力说明 + 边界”三部分，可直接据此选择。",
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
      (s) => `- **${s.name}** — ${s.description || "(未设置描述)"}`,
    );
    const text =
      `# 可用游戏设计技能 (${skills.length})\n\n` +
      `根据用户意图，从以下技能中选择最匹配的一个，然后调用 \`get_skill\` 获取完整工作流指令：\n\n` +
      lines.join("\n") +
      `\n\n---\n选择依据：每个技能的 description 包含“何时使用”（适用场景）、“能力”（产出内容）、“边界”（职责划分）三部分。若用户意图与多个技能相关，选择最核心的一个；若无法确定，可让用户明确具体方向。`;

    return {
      content: [{ type: "text" as const, text }],
    };
  },
);

// ----- Tool: get_skill -----
server.tool(
  "get_skill",
  "获取指定技能的完整 SKILL.md 内容，包括工作流程、模块路由、输出模板和可用的参考文件列表。已加载的技能会在内存中缓存，重复调用不会重新读取磁盘。使用前请先调用 list_skills 查看所有可用技能，根据 description 选择最匹配的技能名称。",
  {
    name: z.string().describe("技能名称，如 'game-combat-design'。从 list_skills 的返回结果中选择"),
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

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const skills = listSkills();
  if (process.env.DEBUG) {
    console.error(
      `[mcp-game-design] 已加载 ${skills.length} 个技能：${skills.map((s) => s.name).join(", ")}`,
    );
    console.error(
      `[mcp-game-design] 共 3 个工具：list_skills / get_skill / get_reference`,
    );
  }
}

main().catch((err) => {
  console.error("MCP Server 启动失败：", err);
  process.exit(1);
});
