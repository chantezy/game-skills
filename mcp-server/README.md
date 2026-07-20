# game-skills

游戏策划案 AI 生成工作流技能集合。通过 MCP 协议暴露给 AI 智能体使用,覆盖从创意框架完善到完整 GDD 输出的全流程。**任意阶段可介入,不强制从头到尾走完整流程。**

内置 **技能加载器**:每个技能的 `description` 已包含"何时使用 + 能力说明 + 边界"三部分,LLM 可直接根据 description 选择最匹配的技能;重复调用同一技能时通过内存缓存避免重复读取磁盘。

## 设计理念

技能之间**解耦但有协作边界**:
- 每个技能职责单一,不重复产出其他技能的内容
- 技能间通过**跳转指引**和**引用**协作,而非各自包含完整内容
- `game-full-workflow` 作为组装器,负责校验各模块产出的一致性

### 事前框架化 + 事后校验的闭环

```
┌──────────────────────┐         ┌──────────────────────┐
│  事前:框架完善          │         │  事后:一致性校验        │
│  (game-creative-       │         │  (game-full-workflow) │
│   discussion)          │         │                      │
│                        │         │                      │
│  ├── 策略分析(5要素)   │         │  ├── 数值自洽性        │
│  ├── 创意发散(5维度)   │  ──→    │  ├── 角色一致性        │
│  ├── 功能规划(互联方向) │         │  ├── 字段一致性        │
│  ├── 五要素自检         │         │  ├── 状态机一致性      │
│  └── 用户确认框架        │         │  ├── 经济闭环          │
│                        │         │  └── 术语统一          │
│  减少事后返工            │         │  最后一道防线           │
└──────────────────────┘         └──────────────────────┘
```

`game-creative-discussion` 负责事前框架化(产出用户确认的"游戏创意框架"),`game-full-workflow` 负责事后校验(六维度一致性检查),形成完整保障。**已有各模块内容时可省略框架完善,但建议先做框架确认。**

## 仓库结构

```
game-skills/
├── game-creative-discussion/   ← 游戏创意框架完善工具(三层递进:策略分析→创意发散→功能规划)
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
├── mcp-server/                 ← MCP Server(通用技能加载器)
│   ├── src/
│   │   ├── index.ts            ← MCP 工具定义(list_skills / get_skill / get_reference)
│   │   └── skill-loader.ts     ← 技能加载、LRU 缓存、frontmatter 解析
│   ├── scripts/
│   │   └── sync-skills.sh
│   ├── package.json
│   └── tsconfig.json
└── .github/workflows/
    └── publish-mcp.yml         ← Push 到 main 自动同步 + 发布到 npm
```

每个技能目录包含一个自包含的 `SKILL.md`,frontmatter 必须包含 `name` / `description` 两个字段(`description` 采用"何时使用 + 能力说明 + 边界"三段式写法,让 LLM 可直接据此选择技能):

```yaml
---
name: "game-combat-design"
description: "何时使用:需要设计战斗系统、攻击手感、技能连招、Boss战模式或伤害公式的结构设计时。能力:基于攻击手感参数(前摇/后摇/命中停顿/击退)、Boss战模式和伤害公式标准形式产出可落地的战斗策划案。边界:只定义设计意图,具体数值反推归 game-numerical-design。"
---
```

## 技能列表

| 技能 | 何时使用 |
|------|---------|
| game-creative-discussion | 有游戏创意想法需要讨论、打磨,或某个模块设计前需要先完善框架,或需要做玩家分析/动机分析/设备适配等策略规划时 |
| game-system-design | 需要设计游戏核心系统(背包、技能、经济、任务、社交、抽卡、成就等)的玩法循环和规则时 |
| game-level-design | 需要设计关卡、地图布局、难度曲线、节奏控制或关卡流程时 |
| game-combat-design | 需要设计战斗系统、攻击手感、技能连招、Boss战模式或伤害公式的结构设计时 |
| game-narrative-design | 需要设计游戏剧情、世界观、角色对白、任务文本或故事线结构时 |
| game-character-design | 需要设计游戏角色、单位、英雄、怪物或NPC的外观、背景、技能和属性设定时 |
| game-numerical-design | 需要推导战斗数值、设计经济系统、平衡成长曲线或计算资源产出消耗比时 |
| game-art-production | 需要生成游戏美术资源、设计角色立绘、场景概念图、UI界面、特效或动画方案时 |
| game-qa-testing | 需要测试用例设计、配置校验、可玩性保障或问题定位时 |
| game-tech-implementation | 需要将策划案转化为代码、设计配置表结构、定义状态机、确定网络同步策略、选择引擎架构、生成代码或进行代码审查时 |
| game-full-workflow | 已有各模块策划案内容,需要整合为完整GDD,或需要校验多模块策划案之间的一致性与前后逻辑时 |

> 每个技能的 `SKILL.md` frontmatter `description` 字段包含完整的三段式说明(何时使用 + 能力 + 边界),LLM 通过 `list_skills` 工具获取后可直接据此选择。

### game-creative-discussion:游戏创意框架完善工具

本技能是**事前框架化**的核心,基于**交互设计五要素**(用户/场景/目的/媒介/行为),通过**三层递进**完善一份用户确认的"游戏创意框架":

```
第一层:策略分析(用户 / 目的 / 媒介)
  ├── 用户:玩家分析(Bartle 分群 / 认知模型 / 心理效应)
  ├── 目的:玩家动机(内部 / 外部动机 / 引导方向)
  └── 媒介:游戏设备环境预判(平台 / 输入 / 使用情境)
        │
        ▼
第二层:创意发散(5 维度,接收第一层输入)
  ├── 游戏类型与核心机制 / 目标受众与平台
  ├── 视觉风格与情绪体验 / 核心循环与玩法深度
  └── 风险与可行性
        │
        ▼
第三层:功能规划(行为 / 场景细化 + 互联方向 + 自检)
  ├── 行为:核心玩法流程 + 模块互联方向表
  ├── 场景:特定场景下的游戏需求(设计思路三角 + 社交行为矩阵)
  └── 交互五要素自检
        │
        ▼
  产出:用户确认的"游戏创意框架"
```

**两个核心原则:**
- **框架先行**——无论用户想法是否明确,建议全流程都走本技能,产出一份用户确认的框架后再进入各模块细化,减少后期返工成本
- **已有内容不重写**——用户已提供的想法直接采用,本技能只做确认、补全、框架化

**两种使用深度:**

| 用户情况 | 走法 | 深度 |
|---------|------|------|
| 想法模糊(仅一句话/关键词) | 从第一层完整走 | 发散讨论(深度引导) |
| 想法明确(已有部分信息) | 按快速启动模式跳过已有部分 | 确认+补全+框架化(不重写已有想法) |

**任意阶段可介入**——不假设只在项目启动时使用。某个模块设计前的思路梳理、项目中期方向迷茫时的重新对齐都可调用。已有各模块内容时可省略本技能,但建议先做框架确认。

### 技能间协作关系

```
[建议流程] game-creative-discussion(框架完善) → 产出"游戏创意框架"(用户确认)
        │
        ▼
各单模块技能(系统/关卡/战斗/剧情/角色/数值/美术/QA) → 产出各模块策划案
        │
        ├── 技术对接 → game-tech-implementation(规范层+执行层)
        │
        ▼
game-full-workflow(组装器+校验器) → 整合 + 前后逻辑校验 → 完整 GDD
```

> **任意阶段可介入**:不强制从头到尾走完整流程。可只做单模块发散(直接进入对应技能)、只做整合(已有各模块内容进入 game-full-workflow)、或只做一致性体检(已有完整 GDD 进入 game-full-workflow 跑校验)。

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
| `list_skills` | **首选入口**:列出所有技能的 name + description(含"何时使用 + 能力 + 边界") | 第一次调用,查看所有可用技能并选择 |
| `get_skill` | 获取指定技能的完整 `SKILL.md` 内容(命中内存缓存时免重复读取) | 从 list_skills 选定后取完整工作流 |
| `get_reference` | 获取技能的参考资料文件 | 需要详细领域知识时 |

### 推荐使用流程

```
1. list_skills()                              → 获取所有技能的 name + description
2. LLM 根据 description 的"何时使用"选择最匹配的技能
3. get_skill("game-system-design")            → 获取完整 SKILL.md
4. 按 SKILL.md 中的工作流路由表完成策划产出
5. 如需组装:get_skill("game-full-workflow")  → 获取 GDD 组装器工作流
```

**设计理念:** 不使用独立的路由工具。每个技能的 `description` 已包含"何时使用 + 能力说明 + 边界"三段式说明,LLM 可直接从 `list_skills` 返回结果中做语义匹配选择——这比基于关键词打分的路由器更准确,尤其能处理中文同义词和俚语场景(如"肉鸽"匹配 Roguelike)。

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
└── SKILL.md    ← 必须包含 frontmatter(name, description),description 采用"何时使用 + 能力说明 + 边界"三段式
```

push 到 main 后，`sync-skills.sh` 会自动同步到 `mcp-server/skills/` 并打包发布。新技能会自动出现在 `list_skills` 的返回结果中。

## 本地开发

```bash
cd mcp-server
bash scripts/sync-skills.sh   # 同步 skills 到 mcp-server/skills/
npm install
npm run build
DEBUG=1 node dist/index.js     # 启动并查看加载的技能数量
```

验证 list_skills 是否工作（另开一个终端调用 MCP）：

```bash
# 通过 stdio 测试 list_skills
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_skills","arguments":{}}}' | node dist/index.js
```

## License

MIT
