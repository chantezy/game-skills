# game-skills

游戏策划案 AI 生成工作流技能集合。通过 MCP 协议暴露给 AI 智能体使用，覆盖从创意点讨论到完整 GDD 输出的全流程。

内置 **Intent Router**：根据 `trigger` 字段做轻量级关键词匹配，自动路由到最合适的技能，无需加载完整 Skill 内容；重复调用同一技能时通过内存缓存避免重复读取磁盘。

## 仓库结构

```
game-skills/
├── game-creative-discussion/   ← 创意点引导式讨论
├── game-system-design/         ← 系统策划（6大知识库）
├── game-level-design/          ← 关卡策划（节奏/空间/难度）
├── game-combat-design/         ← 战斗策划（手感/Boss/公式）
├── game-narrative-design/      ← 剧情策划（四阶段工作流）
├── game-character-design/      ← 角色与单位设计（五阶段）
├── game-numerical-design/      ← 数值策划（战斗/经济/成长）
├── game-art-production/        ← 美术生产（提示词/资源规格）
├── game-qa-testing/            ← QA测试（六维度框架）
├── game-programming/           ← 程序开发（技术选型/架构）
├── game-dev-bridge/            ← 策划→开发映射规范
├── game-full-workflow/         ← 全流程编排（GDD组装）
├── mcp-server/                 ← MCP Server（通用技能加载器 + Intent Router）
│   ├── src/
│   │   ├── index.ts            ← MCP 工具定义（route_intent / list_skills / get_skill / get_reference）
│   │   └── skill-loader.ts     ← 技能加载、LRU 缓存、意图路由算法
│   ├── scripts/
│   │   └── sync-skills.sh
│   ├── package.json
│   └── tsconfig.json
└── .github/workflows/
    └── publish-mcp.yml         ← Push 到 main 自动同步 + 发布到 npm
```

每个技能目录包含一个自包含的 `SKILL.md`，frontmatter 必须包含 `name` / `description` / `trigger` 三个字段：

```yaml
---
name: "game-combat-design"
description: "游戏战斗策划工作流——基于攻击手感参数、Boss战模式和伤害公式产出可落地的战斗策划案"
trigger: "当用户需要设计战斗系统、攻击手感、技能连招、Boss战模式或伤害公式时"
---
```

## 技能列表

| 技能 | 触发条件 |
|------|---------|
| game-creative-discussion | 有一个游戏创意想法需要讨论、打磨或扩展为设计大纲 |
| game-system-design | 设计游戏核心系统（背包、强化、匹配、社交、成就、抽卡等） |
| game-level-design | 设计关卡、地图布局、难度曲线、节奏控制 |
| game-combat-design | 设计战斗系统、攻击手感、技能连招、Boss战模式 |
| game-narrative-design | 设计游戏剧情、世界观、角色对白、故事线结构 |
| game-character-design | 设计角色、单位、英雄、怪物的外观和属性设定 |
| game-numerical-design | 推导战斗数值、设计经济系统、平衡成长曲线 |
| game-art-production | 生成美术资源、角色立绘、场景概念图、UI界面 |
| game-qa-testing | 测试用例设计、配置校验、可玩性保障、问题定位 |
| game-programming | 将策划案转化为代码、选择引擎架构、代码审查 |
| game-dev-bridge | 策划案→代码映射、配置表Schema、状态机、网络同步 |
| game-full-workflow | 从一句话创意生成完整GDD、编排多模块策划工作流 |

## MCP 工具

| 工具 | 说明 | 典型调用时机 |
|------|------|-------------|
| `route_intent` | **意图路由器**：基于 trigger + description 做关键词匹配，返回最佳技能 / top-3 候选 / 兜底全部列表 | 优先调用，做快速匹配 |
| `list_skills` | 列出所有技能及触发条件 | 需要浏览全部技能时 |
| `get_skill` | 获取完整 `SKILL.md` 内容（命中内存缓存时免重复读取） | 匹配后取完整工作流 |
| `get_reference` | 获取技能的参考资料文件 | 需要详细领域知识时 |

### 推荐使用流程

```
1. route_intent("我想设计一个背包系统") → 高置信度匹配 → 返回 game-system-design
2. get_skill("game-system-design")     → 获取完整 SKILL.md
3. 按 SKILL.md 中的工作流路由表完成策划产出
4. 如需全流程：route_intent("从一句话创意生成完整GDD") → game-full-workflow
```

**兜底策略**：当 `route_intent` 无法明确匹配时（如用户输入"帮我设计游戏"这类模糊表述），会返回所有技能的 `name + trigger` 列表让用户选择，避免选错技能。

## 在各 IDE 中配置

> 通用配置：使用 `npx --yes @chantezy/mcp-game-design@latest` 拉取最新发布版本。`--yes` 跳过交互确认，`@latest` 强制拉最新版（避免本地缓存旧版本）。

### Claude Desktop

配置文件路径：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "game-design": {
      "command": "npx",
      "args": ["--yes", "@chantezy/mcp-game-design@latest"]
    }
  }
}
```

### Cursor

`Settings → Cursor Settings → Features → Model Context Protocol → Add MCP Server`：

```json
{
  "mcpServers": {
    "game-design": {
      "command": "npx",
      "args": ["--yes", "@chantezy/mcp-game-design@latest"]
    }
  }
}
```

或编辑 `~/.cursor/mcp.json`（全局）或项目根 `.cursor/mcp.json`。

### Trae / VSCode (MCP 扩展)

```json
{
  "mcpServers": {
    "game-design": {
      "command": "npx",
      "args": ["--yes", "@chantezy/mcp-game-design@latest"]
    }
  }
}
```

### 本地调试模式

```json
{
  "mcpServers": {
    "game-design": {
      "command": "node",
      "args": ["/absolute/path/to/game-skills/mcp-server/dist/index.js"],
      "env": { "DEBUG": "1" }
    }
  }
}
```

启动后 `stderr` 会输出已加载的技能数量和名称，方便排查同步问题。

## 添加新技能

在仓库根目录创建新目录，包含 `SKILL.md` 即可：

```
new-skill/
└── SKILL.md    ← 必须包含 frontmatter（name, description, trigger）
```

push 到 main 后，`sync-skills.sh` 会自动同步到 `mcp-server/skills/` 并打包发布。Intent Router 会自动把新技能纳入匹配池。

## 本地开发

```bash
cd mcp-server
bash scripts/sync-skills.sh   # 同步 skills 到 mcp-server/skills/
npm install
npm run build
DEBUG=1 node dist/index.js     # 启动并查看加载的技能数量 + Intent Router 状态
```

验证 Intent Router 是否工作（另开一个终端调用 MCP）：

```bash
# 通过 stdio 测试 route_intent
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"route_intent","arguments":{"user_intent":"我想设计一个抽卡系统"}}}' | node dist/index.js
```

## License

MIT
