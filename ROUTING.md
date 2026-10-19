# 技能路由表

> 优先级高于对 `description` 的语义猜测，冲突时以本表为准。
> MCP 的 `list_skills` 会自动附加本文件；修改后需 `npm run sync && npm run build`。

总原则：**要决策 → 设计类技能；要数字/公式/曲线 → `game-numerical-design`；要出图出资源 → `game-art-production`。**

---

## 0. 执行前计划确认（优先于下面所有规则）

选定技能后，**先报计划再执行**：

- 命中 **1 个**技能 → 直接调用 `get_skill` 开始工作，不用确认，别拿废话拦住用户
- 命中 **2 个以上**或需要组合 → 先用 3-5 行说明：**按什么顺序调哪些技能、每个产出什么、需要用户先提供什么输入**，等用户确认后再逐个调用
- 意图不明确 → 先问一句，不要猜

计划示例（用户说「根据设计稿做个消消乐」）：

> 打算这样走：① `game-system-design` 定核心规则（交换/三消/连锁/特殊块）；② `game-level-design` 出关卡目标与难度曲线；③ `game-numerical-design` 算掉落分布与连锁期望；④ `game-qa-testing` 验死局与无限连锁；⑤ `game-tech-implementation` 出棋盘结构与消除算法。
> 需要你先确认：设计稿是视觉稿还是玩法稿？目标平台是移动端还是 H5？
> 确认后从第 ① 步开始。

---

## 1. 强歧义对（描述判断不出来的部分）

| 用户说法 | 正确技能 | 常见误调 |
|---|---|---|
| 「算一下伤害公式的数值」 | `game-numerical-design` | `game-combat-design` |
| 「把这个系统的数值配平」 | `game-numerical-design` | `game-system-design` |
| 「设计抽卡的概率」 | `game-system-design` 定规则 → `game-numerical-design` 算概率与期望 | 只调其中一个 |
| 「设计关卡的难度曲线」 | `game-level-design` 定节奏与挑战结构 → `game-numerical-design` 量化 | 只调其中一个 |
| 「画一下这个角色的立绘」 | `game-art-production` | `game-character-design` |

---

## 2. 组合场景（给原则 + 举例，不枚举）

**判断原则**：先完成上游决策，再进下游推导；要交付收口到 `game-full-workflow`，要落地交给 `game-tech-implementation`。通常 2-3 个技能足够，不要为了走流程而硬串。

**从零做一个游戏**（最常见场景，按下面判断，不要套固定链条）：

- 玩法已定型（推箱子、俄罗斯方块、消消乐这类成熟品类）→ 直接从 `game-system-design` 起步，跳过 `game-creative-discussion`
- 玩法未定型 / 要做差异化 → 先走 `game-creative-discussion`
- 再按品类挑**一个**核心模块：关卡类走 `game-level-design`，战斗类走 `game-combat-design`，剧情类走 `game-narrative-design`
- 核心设计做完**紧跟 `game-qa-testing`**（关卡可解性、死锁形态、数值校验），不要留到最后——关卡不可解等于白做
- 数值只在需要成长曲线/经济系统时才进 `game-numerical-design`，纯解谜类通常不需要

**其余场景举例**（仅示范顺序，新组合按上面的原则自行推导）：

- 只做战斗模块 → `game-combat-design` → `game-numerical-design` → `game-qa-testing`
- 已有策划案要落地 → `game-full-workflow` → `game-tech-implementation`
- 角色要出图 → `game-character-design` → `game-art-production`

---

## 3. 判定优先级

1. 用户点名技能 → 直接调用
2. 命中第 1 节 → 按表裁决
3. 跨多个技能 → 按第 2 节原则推导顺序
4. 仍不确定 → 问用户一句，不要猜
5. 与游戏设计无关 → 不调用任何技能
