# game-skills

游戏策划案 AI 生成工作流技能集合。通过 MCP 协议暴露给 AI 智能体使用,覆盖从创意点讨论到完整 GDD 输出的全流程。

内置 **Intent Router**:根据 `trigger` 字段做轻量级关键词匹配,自动路由到最合适的技能,无需加载完整 Skill 内容;重复调用同一技能时通过内存缓存避免重复读取磁盘。

## 设计理念

技能之间**解耦但有协作边界**:
- 每个技能职责单一,不重复产出其他技能的内容
- 技能间通过**跳转指引**和**引用**协作,而非各自包含完整内容
- `game-full-workflow` 作为组装器,负责校验各模块产出的一致性

## 仓库结构

```
game-skills/
├── game-creative-discussion/   ← 创意发散工具(任意阶段可用,产出初步大纲)
├── game-system-design/         ← 系统策划(6大知识库,只定义决策项)
├── game-level-design/          ← 关卡策划(节奏/空间/难度)
├── game-combat-design/         ← 战斗策划(手感/Boss/公式,数值引用数值策划)
├── game-narrative-design/      ← 剧情策划(四阶段工作流)
├── game-character-design/      ← 角色与单位设计(五阶段)
├── game-numerical-design/      ← 数值策划(战斗/经济/成长的数值推导)
├── game-art-production/        ← 美术生产(提示词/资源规格)
├── game-qa-testing/            ← QA测试(六维度框架)
├── game-tech-implementation/   ← 技术实现全链路(规范层+执行层,原 programming+dev-bridge 合并)
├── game-full-workflow/         ← GDD组装器+一致性校验器(整合各模块,校验前后逻辑)
├── mcp-server/                 ← MCP Server(通用技能加载器 + Intent Router)
│   ├── src/
│   │   ├── index.ts            ← MCP 工具定义(route_intent / list_skills / get_skill / get_reference)
│   │   └── skill-loader.ts     ← 技能加载、LRU 缓存、意图路由算法
│   ├── scripts/
│   │   └── sync-skills.sh
│   ├── package.json
│   └── tsconfig.json
└── .github/workflows/
    └── publish-mcp.yml         ← Push 到 main 自动同步 + 发布到 npm
```

每个技能目录包含一个自包含的 `SKILL.md`,frontmatter 必须包含 `name` / `description` / `trigger` 三个字段:

```yaml
---
name: "game-combat-design"
description: "游戏战斗策划工作流——基于攻击手感参数、Boss战模式和伤害公式产出可落地的战斗策划案"
trigger: "当用户需要设计战斗系统、攻击手感、技能连招、Boss战模式或伤害公式时"
---
```

## 技能列表

| 技能 | 定位 | 触发条件 |
|------|------|---------|
| game-creative-discussion | 创意发散工具 | 有一个游戏创意想法需要讨论、打磨或扩展为设计大纲 |
| game-system-design | 系统策划(定义决策项) | 设计游戏核心系统(背包、强化、匹配、社交、成就、抽卡等) |
| game-level-design | 关卡策划 | 设计关卡、地图布局、难度曲线、节奏控制 |
| game-combat-design | 战斗策划(手感/Boss/公式) | 设计战斗系统、攻击手感、技能连招、Boss战模式 |
| game-narrative-design | 剧情策划 | 设计游戏剧情、世界观、角色对白、故事线结构 |
| game-character-design | 角色与单位设计 | 设计角色、单位、英雄、怪物的外观和属性设定 |
| game-numerical-design | 数值策划(推导主力) | 推导战斗数值、设计经济系统、平衡成长曲线 |
| game-art-production | 美术生产 | 生成美术资源、角色立绘、场景概念图、UI界面 |
| game-qa-testing | QA测试 | 测试用例设计、配置校验、可玩性保障、问题定位 |
| game-tech-implementation | 技术实现全链路 | 策划案→代码映射、配置表Schema、状态机、网络同步、引擎选型、代码生成 |
| game-full-workflow | GDD组装器+一致性校验器 | 已有各模块策划案,需要整合为完整GDD或校验多模块一致性 |

### 技能间协作关系

```
game-creative-discussion(创意发散) → 产出初步大纲
        │
        ▼
各单模块技能(系统/关卡/战斗/剧情/角色/数值/美术/QA) → 产出各模块策划案
        │
        ├── 技术对接 → game-tech-implementation(规范层+执行层)
        │
        ▼
game-full-workflow(组装器+校验器) → 整合 + 前后逻辑校验 → 完整 GDD
```

**协作边界:**
- 系统策划只定义"经济系统要做哪些决策",数值推导归 `game-numerical-design`
- 系统策划只定义"技能系统的结构与成长",战斗表现归 `game-combat-design`
- 战斗策划只定义"设计意图"(打几轮/持续多久),数值反推归 `game-numerical-design`
- 配置表 Schema、状态机、网络同步归 `game-tech-implementation`,不在各策划模块重复
- `game-full-workflow` 会在组装时对上述边界做一致性校验

**引用语规范(区分三种语义,避免歧义):**

各技能的"与其他技能的协作"小节统一使用以下三种措辞,明确区分引用语义:

| 引用类型 | 措辞 | 语义 | 示例 |
|---------|------|------|------|
| 协作式 | "由 `xxx` 产出" / "由 `xxx` 基于本模块的 XX 反推产出" | 目标模块从零工作,不需要前置内容 | 数值参数由 `game-numerical-design` 基于设计意图反推产出 |
| 查阅式 | "见 `xxx`" / "参见 `xxx`" | 目标模块需已有内容,本模块直接引用 | 角色清单见 `game-character-design` |
| 前置依赖 | "需先完成 `xxx`" | 明确标注先后顺序,未完成则本模块无法进行 | 需先完成 `game-character-design` 的角色清单 |

**设计意图:** 避免出现"详见 xxx"这类歧义措辞——既可理解为"去查阅已有内容"(会因目标模块无内容而卡住),也可理解为"去产出"(语义不清)。统一规范后,用户和 AI 都能明确知道是去产出、去查阅、还是需要先完成前置。

## MCP 工具

| 工具 | 说明 | 典型调用时机 |
|------|------|-------------|
| `route_intent` | **意图路由器**:基于 trigger + description 做关键词匹配,返回最佳技能 / top-3 候选 / 兜底全部列表 | 优先调用,做快速匹配 |
| `list_skills` | 列出所有技能及触发条件 | 需要浏览全部技能时 |
| `get_skill` | 获取完整 `SKILL.md` 内容(命中内存缓存时免重复读取) | 匹配后取完整工作流 |
| `get_reference` | 获取技能的参考资料文件 | 需要详细领域知识时 |

### 推荐使用流程

```
1. route_intent("我想设计一个背包系统") → 高置信度匹配 → 返回 game-system-design
2. get_skill("game-system-design")     → 获取完整 SKILL.md
3. 按 SKILL.md 中的工作流路由表完成策划产出
4. 如需组装:route_intent("我已有各模块策划案,帮我整合为完整GDD") → game-full-workflow
```

**兜底策略**:当 `route_intent` 无法明确匹配时(如用户输入"帮我设计游戏"这类模糊表述),会返回所有技能的 `name + trigger` 列表让用户选择,避免选错技能。

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
