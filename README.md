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
│   │   ├── index.ts            ← MCP 工具定义（route_intent / list_skills / get_skill / get_reference / cache_stats）
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
| `cache_stats` | 查看内存缓存状态（调试用） | 排查缓存命中情况 |

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

## 自动发布流程（Trusted Publishing）

采用 npm 官方推荐的 **Trusted Publishing** 方案（基于 OIDC 的 `--provenance` 发布）：每次发布会通过 Sigstore 签名 + 透明日志生成可验证的来源证明，使用者可在 npmjs.com 上看到包的源码仓库、构建 commit、CI 工作流等溯源信息。

> ⚠️ **关于 Trusted Publishing 的一个常见误解**：npm 的 `--provenance` 与 PyPI 的 Trusted Publishers 不同。npm 目前**仍然需要 npm token 做发布身份认证**，`--provenance` 只是额外生成 OIDC 签名的来源证明。完全无 token 发布 npm 暂不支持。

```
git push origin main
    ↓
GitHub Actions 触发（.github/workflows/publish-mcp.yml）
    ↓
actions/setup-node + 升级 npm 到最新（确保支持 OIDC）
    ↓
sync-skills.sh 同步 game-*/  →  mcp-server/skills/
    ↓
npm ci && npm run build  →  编译 TS + 打包 dist 和 skills
    ↓
npm version patch  →  自增 patch 版本号
    ↓
npm publish --provenance --access public  →  发布到 npmjs.com + 生成 Sigstore 签名证明
    ↓
git commit & push version bump  →  把版本号变更回写到仓库
```

**触发路径**：修改 `mcp-server/src/**`、`mcp-server/package.json`、`mcp-server/scripts/**`、任意 `game-*/**` 文件、或任意 `*/SKILL.md` 都会触发自动发布。也支持 `workflow_dispatch` 手动触发。

**各 IDE 拉最新版**：由于配置里用了 `@latest`，IDE 重启后会通过 npx 拉最新发布的版本。

## 首次发布前需要做的（Trusted Publishing 配置）

### 1. 在 npm 创建 organization（scope 包需要）

访问 https://www.npmjs.com/org/create 创建名为 `chantezy` 的 org（免费），让 scope 包 `@chantezy/...` 可以发布。如果不想创建 org，把 `package.json` 的 `name` 改成无 scope 的 `mcp-game-design-gdd`。

### 2. 启用 npm 账号的安全设置

登录 npm 后：

```bash
# 启用 2FA（auth and writes 模式，Trusted Publishing 前置条件）
npm profile enable-2fa auth-and-writes

# 把 GitHub Actions 配置为受信任的 OIDC issuer
npm profile set oidc-issuer "https://token.actions.githubusercontent.com"
```

或在 npm 网站：`Account Settings → Authentication` 启用 2FA。

### 3. 生成 npm access token（用于身份认证）

访问 https://www.npmjs.com/settings/~/tokens → **Generate New Token** → 选 **Automation** 类型（专为 CI 用，不会过期也不会触发 2FA 交互）。复制 token 值。

### 4. 配置 GitHub Secret

仓库 `Settings → Secrets and variables → Actions → New repository secret`：
- **Name**：`NPM_TOKEN`
- **Value**：粘贴上一步的 token

### 5. 确认仓库 Actions 权限

仓库 `Settings → Actions → General → Workflow permissions`：
- 选 **Read and write permissions**
- 勾选 **Allow GitHub Actions to create and approve pull requests**

### 6. 首次 push 触发

```bash
cd github
git add .
git commit -m "feat: add Intent Router + cache + fallback, enable Trusted Publishing"
git push origin main
```

到 GitHub Actions 页面观察工作流执行，再到 https://www.npmjs.com/package/@chantezy/mcp-game-design 验证包已上线，页面会显示 `Provenance ✅` 标识。

### 故障排查

| 错误 | 原因 | 解决 |
|------|------|------|
| `npm ERR! code ENEEDAUTH` | OIDC 认证失败 | 检查 `id-token: write` 权限、npm 版本 ≥ 10 |
| `Access token expired or revoked` | npm 版本过低不支持 OIDC | workflow 已含 `npm install -g npm@latest` 升级步骤 |
| `Provenance not enabled` | npm 账号未开 provenance | 执行 `npm profile set oidc-issuer`（见步骤 2） |
| `E403 Forbidden` | 包名被占用或无权限 | 检查包名唯一性、确认 npm org 已创建 |

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
