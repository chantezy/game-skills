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

## 自动发布流程（Trusted Publisher）

采用 npm 官方推荐的 **Trusted Publisher**（基于 OIDC 的无 token 发布，类似 PyPI Trusted Publishers）[$TRAE_REF](https://docs.npmjs.com/trusted-publishers)。每次发布时 GitHub Actions 会用 OIDC 短期令牌向 npm 换取临时发布权限，无需管理长期 npm token，同时自动生成 provenance 签名证明（可验证包的源码仓库、commit、CI workflow）。

### 前置要求

- npm CLI ≥ 11.5.1，Node ≥ 22.14.0（workflow 已配 `node-version: '24'`）
- GitHub-hosted runner（不支持 self-hosted）
- npm 包必须已存在（首次发布需要手动创建包）

### 流程图

```
git push origin main
    ↓
GitHub Actions 触发（.github/workflows/publish-mcp.yml）
    ↓
sync-skills.sh 同步 game-*/  →  mcp-server/skills/
    ↓
npm ci && npm run build  →  编译 TS + 打包 dist 和 skills
    ↓
npm version patch  →  自增 patch 版本号
    ↓
npm publish --access public  →  OIDC 自动换取短期令牌 → 发布到 npmjs.com
                                  ↓
                                自动生成 provenance 签名证明（Sigstore + 透明日志）
    ↓
git commit & push version bump  →  把版本号变更回写到仓库
```

**触发路径**：修改 `mcp-server/src/**`、`mcp-server/package.json`、`mcp-server/scripts/**`、任意 `game-*/**` 文件、或任意 `*/SKILL.md` 都会触发自动发布。也支持 `workflow_dispatch` 手动触发。

**各 IDE 拉最新版**：由于配置里用了 `@latest`，IDE 重启后会通过 npx 拉最新发布的版本。

## 首次发布配置（Trusted Publisher）

Trusted Publisher 必须先创建包才能配置，所以流程是：**先手动首次发布 → 再配 Trusted Publisher → 之后 CI 无 token 自动发布**。

### 1. 首次手动发布（一次性）

```bash
cd "/Users/Fronter/4399/AI IDE/game-skills/github/mcp-server"

# 确认已登录 npm（应该已登录，因为 @chantezy/mcp-product-design 还在发版）
npm whoami   # 应输出: chantezy

# 同步 + 构建
bash scripts/sync-skills.sh
npm install
npm run build

# 首次发布（scope 包首次必须 --access public）
# 注意：本地发布不要加 --provenance（provenance 只在 CI 生效）
npm publish --access public
```

发布成功后到 https://www.npmjs.com/package/@chantezy/mcp-game-design 确认包已上线。

### 2. 在 npmjs.com 配置 Trusted Publisher

1. 访问 https://www.npmjs.com/package/@chantezy/mcp-game-design/access
2. 滚动到 **"Trusted Publisher"** 区域，点击 **"GitHub Actions"**
3. 填入配置（**严格匹配，大小写敏感**）：
   - **Organization or user**: `chantezy`
   - **Repository**: `game-skills`
   - **Workflow filename**: `publish-mcp.yml`  ← 必须和 `.github/workflows/publish-mcp.yml` 文件名完全一致
   - **Environment name**: 留空（不使用 environments）
   - **Allowed actions**: 勾选 `npm publish`
4. 保存

### 3. （可选）最大化安全：禁止 token 发布

配好 Trusted Publisher 后，建议在包设置里禁止传统 token 发布：

1. 包设置 → **Publishing access**
2. 选 **"Require two-factor authentication and disallow tokens"**
3. 保存

之后只能通过 Trusted Publisher（OIDC）发布，token 任何方式都发不了，最大化防泄露。

### 4. 验证 CI 无 token 发布

```bash
# 推送到 main 触发 CI
cd "/Users/Fronter/4399/AI IDE/game-skills/github"
git add .
git commit -m "feat: enable Trusted Publisher (OIDC) for npm publishing"
git push origin main
```

到 GitHub Actions 页面观察 workflow 执行：
- ✅ 看到 `npm publish` 成功，且**没有 `NODE_AUTH_TOKEN` 环境变量**
- ✅ npmjs.com 包页面显示 `Provenance ✅` 标识

### 故障排查

| 错误 | 原因 | 解决 |
|------|------|------|
| `npm ERR! code ENEEDAUTH` | OIDC 认证失败 | 确认 npmjs.com 的 Trusted Publisher 配置（org/repo/workflow filename 大小写完全匹配） |
| `Unable to authenticate` | workflow filename 不匹配 | npmjs.com 配置里的 filename 必须是 `publish-mcp.yml`（含 .yml 后缀） |
| `npm ERR! invalid version` | Node/npm 版本过低 | workflow 已配 `node-version: '24'`，确保 CI 跑的是 Node 24 |
| `E403 Forbidden` | 包名被占用或无权限 | 已发布过手动版本应无此问题 |
| Provenance 未生成 | 仓库不是 public 或包不是 public | 确保 GitHub 仓库 public + npm 包 public |

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
