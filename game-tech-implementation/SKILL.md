---
name: "game-tech-implementation"
description: "何时使用:需要将策划案转化为代码、设计配置表结构、定义状态机、确定网络同步策略、选择引擎架构、生成代码或进行代码审查时。能力:覆盖策划案到代码的完整路径——规范层(配置表Schema、状态机模板、字段映射、网络同步、工程规范)+ 执行层(技术选型、实现链路、代码生成、代码审查)。"
---

# 游戏技术实现全链路

## 概述

本技能合并原"策划案到开发映射规范(Dev Bridge)"与"程序开发(Programming)"两个技能,覆盖**策划案到代码的完整路径**。

分为两层:
- **规范层(上游)**:定义策划案如何转化为程序员/AI 可直接消费的技术规范——配置表 Schema、状态机模板、字段映射规则、网络同步策略、项目工程规范、参数默认值参考
- **执行层(下游)**:定义如何把规范落地为可运行代码——技术选型、实现链路(客户端/服务端/引擎)、代码生成示例、代码审查、实现检查清单

解决的核心问题:策划案写了"移动速度 3 m/s,闪避无敌帧 0.3s",程序员需要知道——这些参数放在哪个配置表?表结构是什么?客户端还是服务端校验?状态机怎么切?用什么引擎实现?本技能给出从规范到执行的标准化答案。

---

# 第一部分:规范层(策划案到开发的映射)

## 一、配置表 Schema 规范

### 设计原则

1. **配置驱动**:所有策划参数必须从配置表读取,禁止硬编码
2. **前后端共用**:客户端和服务端使用同一份 Schema 定义,确保数据一致
3. **类型安全**:每个字段明确类型、单位、取值范围、默认值
4. **自文档化**:每个字段附带 `description` 和 `design_intent`(设计意图)
5. **版本兼容**:新增字段必须有 `default` 值,旧版客户端可忽略新字段

### 配置表命名规范

```
{模块}_{子模块}_{数据类型}.json

示例:
- character_movement_params.json     # 角色移动参数
- combat_skill_defs.json             # 技能定义
- level_enemy_spawns.json            # 关卡敌人配置
- economy_item_prices.json           # 物品定价
- ui_screen_configs.json             # UI界面配置
```

### 标准 Schema 模板库

#### 1. 角色移动参数

```json
{
  "$schema": "character_movement_params",
  "$version": "1.0.0",
  "character_movement": {
    "walk": {
      "speed": {
        "type": "float",
        "unit": "m/s",
        "default": 2.5,
        "range": [0.5, 10.0],
        "description": "步行速度",
        "design_intent": "探索时的默认移动速度,平衡移动效率与场景观察"
      },
      "acceleration": {
        "type": "float",
        "unit": "m/s²",
        "default": 8.0,
        "description": "从静止到步行的加速时间约 0.3s"
      }
    },
    "run": {
      "speed": {
        "type": "float",
        "unit": "m/s",
        "default": 5.0,
        "range": [2.0, 15.0],
        "description": "跑步速度",
        "design_intent": "赶路/战斗走位速度,约为步行 2 倍"
      },
      "stamina_drain": {
        "type": "float",
        "unit": "point/s",
        "default": 10.0,
        "range": [0, 100],
        "description": "跑步每秒消耗的体力值"
      },
      "stamina_regen_delay": {
        "type": "float",
        "unit": "s",
        "default": 1.5,
        "description": "停止跑步后多久开始回复体力"
      },
      "stamina_regen_rate": {
        "type": "float",
        "unit": "point/s",
        "default": 15.0,
        "description": "体力回复速度"
      }
    },
    "jump": {
      "height": {
        "type": "float",
        "unit": "m",
        "default": 1.5,
        "range": [0.5, 5.0],
        "description": "跳跃最大高度"
      },
      "horizontal_distance": {
        "type": "float",
        "unit": "m",
        "default": 2.0,
        "description": "跳跃最大水平距离"
      },
      "air_control_factor": {
        "type": "float",
        "unit": "ratio",
        "default": 0.6,
        "range": [0.0, 1.0],
        "description": "空中操控系数,1.0 = 完全可控"
      },
      "coyote_time": {
        "type": "float",
        "unit": "s",
        "default": 0.15,
        "description": "离开平台边缘后仍可跳跃的宽容时间"
      }
    },
    "dodge": {
      "distance": {
        "type": "float",
        "unit": "m",
        "default": 3.0,
        "description": "闪避位移距离"
      },
      "invincible_duration": {
        "type": "float",
        "unit": "s",
        "default": 0.3,
        "range": [0.1, 1.0],
        "description": "无敌帧持续时间",
        "design_intent": "占闪避总动画的 40-60%,给玩家明确的安全窗口"
      },
      "cooldown": {
        "type": "float",
        "unit": "s",
        "default": 1.5,
        "range": [0.5, 5.0],
        "description": "闪避冷却"
      },
      "stamina_cost": {
        "type": "float",
        "unit": "point",
        "default": 15.0,
        "description": "闪避消耗体力(如体力系统启用)"
      }
    }
  }
}
```

#### 2. 技能定义

```json
{
  "$schema": "combat_skill_defs",
  "$version": "1.0.0",
  "skills": [
    {
      "id": {
        "type": "int",
        "description": "技能唯一ID,全局不重复"
      },
      "name": {
        "type": "string",
        "description": "技能显示名"
      },
      "type": {
        "type": "enum",
        "values": ["active", "passive", "ultimate"],
        "description": "技能类型"
      },
      "target_type": {
        "type": "enum",
        "values": ["single", "aoe_circle", "aoe_cone", "aoe_line", "self", "ally"],
        "description": "目标选择方式"
      },
      "aoe_radius": {
        "type": "float",
        "unit": "m",
        "default": 0,
        "description": "AOE 半径(仅 aoe 类型有效)"
      },
      "damage": {
        "base": {
          "type": "float",
          "description": "基础伤害值"
        },
        "multiplier": {
          "type": "float",
          "default": 1.0,
          "description": "技能倍率,最终伤害 = 基础攻击 × multiplier"
        },
        "element": {
          "type": "enum",
          "values": ["physical", "fire", "ice", "lightning", "wind", "earth", "holy", "dark"],
          "description": "伤害属性"
        }
      },
      "timing": {
        "cast_time": {
          "type": "float",
          "unit": "s",
          "default": 0,
          "description": "施法前摇"
        },
        "duration": {
          "type": "float",
          "unit": "s",
          "default": 0,
          "description": "持续效果时长(0=瞬发)"
        },
        "cooldown": {
          "type": "float",
          "unit": "s",
          "description": "冷却时间"
        }
      },
      "cost": {
        "resource_type": {
          "type": "enum",
          "values": ["mp", "hp", "stamina", "energy", "rage", "none"],
          "description": "消耗资源类型"
        },
        "amount": {
          "type": "float",
          "description": "消耗量"
        }
      },
      "effects": [
        {
          "type": {
            "type": "enum",
            "values": ["damage", "heal", "buff", "debuff", "shield", "teleport", "summon"],
            "description": "效果类型"
          },
          "value": {
            "type": "float",
            "description": "效果数值"
          },
          "duration": {
            "type": "float",
            "unit": "s",
            "default": 0,
            "description": "效果持续时间"
          }
        }
      ]
    }
  ]
}
```

#### 3. 关卡敌人配置

```json
{
  "$schema": "level_enemy_spawns",
  "$version": "1.0.0",
  "level_id": "LV-001",
  "spawns": [
    {
      "spawn_id": "SP-001",
      "enemy_id": {
        "type": "string",
        "description": "关联 enemy_defs 中的敌人ID"
      },
      "position": {
        "type": "vector3",
        "description": "出生点坐标"
      },
      "patrol_path": {
        "type": "vector3[]",
        "default": [],
        "description": "巡逻路径点序列,空=不巡逻"
      },
      "detection_range": {
        "type": "float",
        "unit": "m",
        "default": 10.0,
        "description": "索敌范围"
      },
      "respawn": {
        "enabled": {
          "type": "bool",
          "default": true
        },
        "delay": {
          "type": "float",
          "unit": "s",
          "default": 30.0,
          "description": "死亡后重生延迟"
        },
        "max_count": {
          "type": "int",
          "default": -1,
          "description": "最大重生次数,-1=无限"
        }
      },
      "loot_table_id": {
        "type": "string",
        "description": "关联掉落表ID"
      }
    }
  ]
}
```

#### 4. 经济系统物品定价

```json
{
  "$schema": "economy_item_prices",
  "$version": "1.0.0",
  "items": [
    {
      "item_id": "IT-001",
      "buy_price": {
        "type": "int",
        "currency": "gold",
        "description": "商店购买价格"
      },
      "sell_price": {
        "type": "int",
        "currency": "gold",
        "description": "商店卖出价格,通常为买入价的 40-60%"
      },
      "craft_cost": [
        {
          "material_id": "string",
          "quantity": "int"
        }
      ],
      "time_price_minutes": {
        "type": "float",
        "description": "该物品的'时间价格':玩家平均需要多少分钟的游戏时间才能获得",
        "design_intent": "所有物品定价的锚点基准,确保经济系统平衡"
      }
    }
  ]
}
```

#### 5. 属性克制矩阵

```json
{
  "$schema": "element_matrix",
  "$version": "1.0.0",
  "elements": ["fire", "ice", "lightning", "wind", "earth"],
  "matrix": {
    "description": "attack_element → defend_element → multiplier",
    "fire":      { "fire": 1.0, "ice": 1.5, "lightning": 1.0, "wind": 0.5, "earth": 1.0 },
    "ice":       { "fire": 0.5, "ice": 1.0, "lightning": 1.0, "wind": 1.5, "earth": 1.0 },
    "lightning": { "fire": 1.0, "ice": 1.0, "lightning": 1.0, "wind": 1.0, "earth": 0.5 },
    "wind":      { "fire": 1.5, "ice": 0.5, "lightning": 1.0, "wind": 1.0, "earth": 1.0 },
    "earth":     { "fire": 1.0, "ice": 1.0, "lightning": 1.5, "wind": 1.0, "earth": 1.0 }
  }
}
```

---

## 二、状态机模板

### 设计原则

1. **状态枚举化**:所有状态用枚举定义,禁止字符串硬编码
2. **转换条件显式化**:每个状态转换必须明确触发条件
3. **转换附带动作**:进入/退出状态时执行的动作(onEnter/onExit)
4. **安全默认**:异常状态(如被击飞中死亡)必须有兜底转换

### 通用角色状态机

```
状态枚举:
  Idle          # 待机
  Walking       # 步行
  Running       # 跑步
  Jumping       # 跳跃上升段
  Falling       # 下落段
  Landing       # 落地缓冲
  Dodging       # 闪避
  Attacking     # 攻击
  Hitstun       # 受击硬直
  Dead          # 死亡
  Interacting   # 交互(拾取/对话/开门)

转换表:
  Idle      → (移动输入)     → Walking    [onEnter: 播放步行动画]
  Idle      → (跳跃键)       → Jumping    [onEnter: 施加向上冲量]
  Walking   → (移动停止)     → Idle       [onEnter: 播放待机动画]
  Walking   → (按下跑)       → Running    [onEnter: 加速到 run_speed]
  Walking   → (跳跃键)       → Jumping
  Running   → (移动停止)     → Idle       [onExit: 减速到 0]
  Running   → (体力耗尽)     → Walking    [onEnter: 播放喘息动画 0.5s]
  Running   → (闪避键 && CD结束) → Dodging
  Any_Ground → (跳跃键)      → Jumping
  Any       → (空中)         → Falling    [条件: isGrounded == false]
  Falling   → (isGrounded)   → Landing    [onEnter: 播放落地动画 0.2s]
  Landing   → (动画结束)     → Idle
  Any       → (攻击键)       → Attacking  [onEnter: 锁定移动 0.1s]
  Attacking → (前摇结束)     → Attack_Hit [onEnter: 检测攻击判定框]
  Attack_Hit → (后摇结束)    → Idle
  Any       → (受击)         → Hitstun    [onEnter: 施加击退力, 锁定输入]
  Hitstun   → (硬直结束)     → Idle
  Any       → (HP <= 0)      → Dead       [onEnter: 播放死亡动画, 锁定所有输入]
  Jumping   → (顶点)         → Falling
```

### Boss 战斗状态机

```
状态枚举:
  Boss_Idle         # 待机/对峙
  Boss_Chase        # 追击玩家
  Boss_Attack       # 执行攻击招式
  Boss_Recover      # 攻击后硬直(玩家输出窗口)
  Boss_PhaseShift   # 阶段切换演出
  Boss_Enrage       # 狂暴状态
  Boss_Dead         # 死亡

转换表:
  Boss_Idle    → (玩家进入仇恨范围)  → Boss_Chase
  Boss_Chase   → (进入攻击范围)     → Boss_Attack   [onEnter: 从招式池中选择]
  Boss_Chase   → (脱离追击范围)     → Boss_Idle     [onEnter: 返回出生点]
  Boss_Attack  → (招式动画结束)     → Boss_Recover  [onEnter: 开放输出窗口]
  Boss_Recover → (恢复时间结束)     → Boss_Chase
  Any          → (HP <= 阶段阈值)   → Boss_PhaseShift [onEnter: 无敌+演出 2s]
  Boss_PhaseShift → (演出结束)      → Boss_Chase    [onEnter: 解锁新招式]
  Any          → (HP <= 10% && 超时) → Boss_Enrage  [onEnter: 攻速+50%, 伤害+30%]
  Any          → (HP <= 0)          → Boss_Dead

阶段阈值配置(从配置表读取):
  phase_thresholds: [0.7, 0.4, 0.1]  # 70%/40%/10% 时切阶段
  enrage_timeout: 300                # 战斗超过 300s 进入狂暴
```

### 招式选择逻辑

Boss 选择攻击招式时,使用加权随机:

```
招式选择 = WeightedRandom(可用招式列表)

权重计算:
  base_weight          # 配置表中的基础权重
  × distance_factor    # 根据与玩家距离调整(近战招式近距离权重高)
  × cooldown_factor    # 冷却中的招式权重为 0
  × phase_factor       # 当前阶段解锁的招式权重加成
  × avoid_repeat       # 连续使用同一招式时权重衰减(如 ×0.3)
```

---

## 三、策划案字段到代码的映射规则

### 映射总表

| 策划案描述类型 | 配置表字段 | 实现层 | 同步策略 | 关键注意事项 |
|--------------|-----------|--------|---------|------------|
| "移动速度 X m/s" | `character_movement.walk.speed` | 客户端 CharacterController | 客户端预测 + 服务端校验上限 | 服务端需检测加速外挂 |
| "跑步消耗体力 X/s" | `character_movement.run.stamina_drain` | 客户端表现 + 服务端权威 | 服务端计算实际体力值 | 体力为 0 时服务端通知客户端强制停止跑步 |
| "闪避无敌帧 Xs" | `character_movement.dodge.invincible_duration` | 客户端表现 + 服务端判定 | 服务端判定闪避开始时间 | 无敌期间服务端忽略伤害包 |
| "技能伤害 = 攻击×倍率" | `combat_skill_defs.damage.multiplier` | **服务端权威计算** | 客户端预计算用于表现 | 最终伤害以服务端为准,防作弊 |
| "技能冷却 Xs" | `combat_skill_defs.timing.cooldown` | 双端各自计算 | 服务端权威 | 客户端显示 CD,服务端决定是否可用 |
| "属性克制倍率" | `element_matrix.matrix` | 服务端计算伤害时使用 | 双端各持一份(客户端用于 UI 提示) | 配置表版本必须一致 |
| "怪物血量 X" | `enemy_defs.hp` | 服务端权威 | 客户端仅显示 | 血量为 0 由服务端判定死亡 |
| "掉落概率 X%" | `loot_tables.drop_rate` | 服务端计算 | 仅服务端 | 客户端不可见掉落计算过程 |
| "商店价格 X 金币" | `economy_item_prices.buy_price` | 服务端权威 | 双端各持一份 | 交易操作必须服务端校验余额 |
| "升级经验 = f(level)" | `progression.exp_curve` | 服务端计算 | 双端各持一份 | 客户端预计算用于进度条显示 |
| "关卡目标:到达终点" | `level_defs.objectives` | 客户端检测触发 + 服务端确认 | 服务端确认 | 防客户端伪造完成事件 |

### 同步策略规则

#### 规则 1:客户端预测 + 服务端校验(移动类)

```
[客户端]                          [服务端]
  玩家按下W键                        |
  → 立即开始移动(预测)              |
  → 发送移动包(方向, 时间戳)  ──→    |
                                    → 校验速度是否合法
                                    → 校验是否穿墙
                                    ← 如果合法:接受位置
                                    ← 如果不合法:回传正确位置(拉回)
  ← 收到确认/修正                    |
  → 应用修正(如有)                  |
```

适用参数:移动速度、跳跃高度、闪避距离

#### 规则 2:服务端权威 + 客户端表现(战斗类)

```
[客户端]                          [服务端]
  玩家按下攻击键                     |
  → 播放攻击动画前摇                |
  → 发送攻击包(技能ID, 目标)  ──→    |
                                    → 检查技能CD
                                    → 检查MP/资源
                                    → 计算伤害(使用公式+配置表)
                                    → 扣减目标HP
                                    ← 返回结果包(伤害值, 目标HP, 是否暴击)
  ← 收到结果                         |
  → 播放命中特效+伤害数字            |
  → 更新目标血条                     |
```

适用参数:技能伤害、冷却、消耗、暴击率

#### 规则 3:纯客户端(表现类)

```
不发送网络包,仅客户端本地处理:
  - UI 动画、转场效果
  - 特效播放(粒子、屏幕震动)
  - 音效/BGM 播放
  - 相机运动
  - 非关键 NPC 的行为(如背景动物)
```

#### 规则 4:服务端权威 + 客户端只读(经济/物品类)

```
[客户端]                          [服务端]
  玩家点击"购买"                    |
  → 显示"购买中..."          ──→    |
                                    → 检查余额
                                    → 检查物品可用性
                                    → 扣款 + 发放物品
                                    ← 返回结果(成功/失败, 新余额, 新物品)
  ← 收到结果                         |
  → 更新 UI(余额、背包)              |
```

---

## 四、网络同步策略速查

| 数据类型 | 同步策略 | 原因 | 反作弊要点 |
|---------|---------|------|----------|
| 角色位置/朝向 | 客户端预测 + 服务端校验 | 需要即时响应 | 校验速度上限、穿墙、瞬移 |
| 战斗伤害 | 服务端权威 | 涉及核心数值 | 服务端独立计算,不接受客户端伤害值 |
| 技能释放 | 客户端请求 + 服务端批准 | 需检查CD/资源 | 服务端校验CD和资源 |
| 物品/货币 | 服务端权威 | 涉及经济系统 | 所有交易操作服务端校验 |
| 掉落计算 | 仅服务端 | 防篡改 | 客户端不可见计算过程 |
| UI 状态 | 纯客户端 | 不涉及游戏逻辑 | 无 |
| 特效/音效 | 纯客户端 | 纯表现层 | 无 |
| 关卡进度 | 客户端触发 + 服务端确认 | 防伪造完成 | 服务端校验完成条件 |
| 排行榜/社交 | 服务端权威 | 防篡改 | 服务端统一计算排名 |
| NPC 行为 | 视情况 | 关键NPC服务端计算,装饰NPC客户端 | Boss/商人服务端,背景动物客户端 |

---

## 五、策划案参数的合理默认值参考

当策划案未指定某参数时,AI 应根据游戏类型给出合理默认值。

### 按游戏类型的移动参数参考

| 参数 | 动作/ARPG | RPG/冒险 | 解谜/休闲 | 平台跳跃 |
|------|----------|---------|----------|---------|
| 步行速度 | 3.0-5.0 m/s | 2.0-3.5 m/s | 2.0-3.0 m/s | 3.0-4.0 m/s |
| 跑步速度 | 6.0-10.0 m/s | 4.0-6.0 m/s | 不启用 | 不启用 |
| 跳跃高度 | 1.5-2.5 m | 1.0-1.5 m | 0.5-1.0 m | 2.0-4.0 m |
| 闪避距离 | 3.0-5.0 m | 2.0-3.0 m | 不启用 | 不启用 |
| 闪避无敌帧 | 0.2-0.4 s | 0.2-0.3 s | 不启用 | 0.1-0.2 s |
| 空中操控系数 | 0.4-0.7 | 0.3-0.5 | 0.2-0.4 | 0.7-1.0 |

### 按游戏类型的战斗参数参考

| 参数 | 快节奏动作 | 中等节奏RPG | 回合制 |
|------|----------|-----------|--------|
| 轻攻击前摇 | 0.08-0.15 s | 0.15-0.25 s | N/A |
| 重攻击前摇 | 0.2-0.4 s | 0.4-0.6 s | N/A |
| 攻击后摇 | 0.05-0.25 s | 0.1-0.4 s | N/A |
| 命中停顿 | 0.02-0.05 s | 0.05-0.08 s | N/A |
| 技能冷却(基础) | 2-5 s | 5-15 s | 回合数:1-3 |
| Boss 阶段切换演出 | 1.5-2.5 s | 2-3 s | N/A |

### 按游戏类型的经济参数参考

| 参数 | F2P 手游 | 买断制单机 | 独立小品 |
|------|---------|----------|---------|
| 日产/日消比 | 1.3-1.8 | 1.1-1.3 | 1.2-1.5 |
| 物品出售/买入比 | 40-50% | 50-60% | 50-70% |
| 单次游玩时长目标 | 5-15 min | 1-3 h | 30-60 min |
| 核心消耗品时间价格 | 3-5 min | 10-20 min | 5-10 min |

---

## 六、项目工程规范

### 标准目录结构

```
project/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/                   # 核心框架
│   │   │   ├── EventBus/           # 事件系统(全局事件总线)
│   │   │   ├── ObjectPool/         # 对象池(子弹、特效复用)
│   │   │   ├── StateMachine/       # 通用状态机框架
│   │   │   ├── Singleton.cs        # 单例基类
│   │   │   └── ServiceLocator.cs   # 服务定位器
│   │   ├── Character/              # 角色相关
│   │   │   ├── Movement/           # 移动系统
│   │   │   ├── Combat/             # 战斗系统
│   │   │   ├── Skills/             # 技能系统
│   │   │   └── Inventory/          # 背包系统
│   │   ├── Level/                  # 关卡相关
│   │   │   ├── LevelManager.cs     # 关卡加载/卸载
│   │   │   ├── SpawnManager.cs     # 敌人生成管理
│   │   │   └── Objectives/         # 关卡目标检测
│   │   ├── UI/                     # UI 控制器
│   │   │   ├── HUD/                # 战斗HUD
│   │   │   ├── Menu/               # 菜单界面
│   │   │   └── Common/             # 通用UI组件
│   │   ├── Data/                   # 数据层
│   │   │   ├── ConfigLoader.cs     # 配置表加载器
│   │   │   ├── SaveSystem.cs       # 存档系统
│   │   │   └── Configs/            # 配置表定义(自动生成)
│   │   └── Network/                # 网络层
│   │       ├── NetworkManager.cs   # 网络管理器
│   │       ├── Protocol/           # 通信协议定义
│   │       └── SyncHandlers/       # 同步处理器
│   ├── Configs/                    # 配置表(JSON)
│   │   ├── character_movement_params.json
│   │   ├── combat_skill_defs.json
│   │   ├── level_enemy_spawns/
│   │   └── economy_item_prices.json
│   ├── Prefabs/                    # 预制体
│   ├── Scenes/                     # 场景
│   ├── Art/                        # 美术资源
│   │   ├── Sprites/
│   │   ├── Models/
│   │   ├── VFX/
│   │   └── UI/
│   └── Audio/                      # 音频资源
├── Server/                         # 服务端代码(如有)
│   ├── src/
│   │   ├── handlers/               # 请求处理器
│   │   ├── models/                 # 数据模型
│   │   ├── services/               # 业务逻辑
│   │   └── protocol/               # 协议定义
│   └── config/                     # 服务端配置
├── Docs/                           # 文档
│   ├── GDD/                        # 策划案
│   └── TechSpec/                   # 技术方案
└── Tests/                          # 测试
    ├── Unit/                       # 单元测试
    └── Integration/                # 集成测试
```

### 策划案字段 → 代码文件映射

| 策划案章节 | 对应代码模块 | 对应配置表 |
|-----------|------------|----------|
| 2.1 操控方式 | `Scripts/Character/Movement/` | `character_movement_params.json` |
| 2.2.1 移动 | `Scripts/Character/Movement/CharacterMover.cs` | `character_movement_params.json` |
| 2.2.2 战斗 | `Scripts/Character/Combat/` | `combat_skill_defs.json` |
| 2.2.3 成长 | `Scripts/Character/Progression/` | `progression_exp_curve.json` |
| 2.3.1 经济 | `Scripts/Data/Economy/` | `economy_item_prices.json` |
| 2.3.2 数值体系 | `Scripts/Character/Combat/DamageCalculator.cs` | `element_matrix.json` |
| 2.3.3 AI 设计 | `Scripts/Level/AI/` | `enemy_ai_params.json` |
| 3.2 关卡设计 | `Scripts/Level/` | `level_enemy_spawns/` 目录 |
| 3.3 角色与单位 | `Scripts/Character/` | `character_defs.json` |
| 3.4 物品与装备 | `Scripts/Character/Inventory/` | `item_defs.json` |

### 配置表加载器设计

```
ConfigLoader 职责:
1. 启动时加载所有配置表到内存
2. 提供类型安全的访问接口
3. 支持热更新(运行时重新加载指定配置表)
4. 数据校验(加载时检查必填字段、值范围)
5. 版本兼容(新字段使用默认值,旧字段忽略)

访问模式:
  ConfigLoader.Get<CharacterMovementConfig>().walk.speed
  ConfigLoader.Get<SkillConfig>(skillId).damage.base
  ConfigLoader.GetAll<EnemySpawnConfig>("LV-001")
```

---

# 第二部分:执行层(代码实现)

## 七、实现链路

### 客户端实现链路(7步)

| 步骤 | 内容 | 实现要点 |
|------|------|---------|
| 1 | UI切图+效果图 | 根据美术规范文档,将UI设计转化为可用的切图资源 |
| 2 | 拼接 | 根据UI线框图,搭建界面布局,实现基础交互 |
| 3 | 特效 | 接入特效帧序列,实现特效播放与时机控制 |
| 4 | 相关逻辑编码 | 实现玩法逻辑,对接配置表数据 |
| 5 | 数据处理 | 实现本地数据存储、缓存、数据序列化 |
| 6 | 联合调试 | 与服务端联调,验证数据通信 |
| 7 | 打包发布 | 构建发布包,多平台适配测试 |

### 服务端实现链路(5步)

| 步骤 | 内容 | 实现要点 |
|------|------|---------|
| 1 | 协议定义 | 定义客户端与服务端的通信协议(请求/响应格式) |
| 2 | 数据库表设计 | 根据策划案数据需求,设计数据库表结构 |
| 3 | 数据记录和功能逻辑编码 | 实现数据持久化、业务逻辑处理 |
| 4 | 联合调试 | 与客户端联调,验证协议正确性 |
| 5 | 打包发布 | 部署服务端,配置环境 |

### 引擎侧(Creator)实现链路(7步)

| 步骤 | 内容 | 实现要点 |
|------|------|---------|
| 1 | 分析与设计 | 分析策划案,确定引擎内实现方案 |
| 2 | 界面资源 | 导入UI资源,配置资源规则 |
| 3 | 场景、剧情 | 搭建游戏场景,配置剧情触发逻辑 |
| 4 | 配置表 | 根据数值策划案,配置游戏数据表 |
| 5 | 资源规则和大小维护 | 管理资源引用,控制包体大小 |
| 6 | 代码管理 | 版本控制,代码审查 |
| 7 | 打包发布与版本管理 | 构建多平台包,管理版本号 |

---

## 八、技术选型指南

### 按游戏类型推荐引擎/框架

| 游戏类型 | 推荐引擎/框架 | 推荐理由 |
|---------|-------------|---------|
| 2D 像素/手绘 | Unity 2D / Godot / Cocos Creator | 2D工具链成熟,精灵动画友好,Tilemap编辑器完善 |
| 3D 动作/冒险 | Unity 3D / Unreal | 3D渲染管线成熟,物理引擎稳定,动画状态机强大 |
| 回合制/卡牌 | Unity / Cocos Creator / Web (Phaser) | 逻辑为主,渲染需求低,UI系统灵活,热更新方便 |
| 模拟经营 | Unity / Godot | UI系统强大,数据驱动友好,节点/组件树便于管理复杂界面 |
| 多人在线 | Unity + Photon / Unreal + Epic Online | 网络框架深度集成,同步方案成熟,匹配/房间管理开箱即用 |
| Roguelike/独立 | Godot / Unity | 轻量快速迭代,GDScript上手成本低,适合小团队快速验证玩法 |

### 按游戏类型推荐架构模式

| 游戏类型 | 推荐架构模式 | 适用原因 |
|---------|------------|---------|
| 动作/战斗密集 | ECS(实体组件系统) | 大量实体高频更新,数据与逻辑分离带来缓存友好性,性能优先 |
| RPG/剧情驱动 | MVC + 状态机 | 数据和表现分离便于存档/读档,剧情状态复杂需要清晰的转换规则 |
| 策略/模拟 | 数据驱动 + 命令模式 | 配置表驱动游戏行为,命令模式支持撤销/回放/AI复用 |
| 卡牌/回合制 | 状态机 + 事件系统 | 离散状态切换(抽牌→出牌→结算),事件驱动解耦各子系统 |
| 平台跳跃 | 组件模式 + 物理代理 | 物理交互频繁,组件化便于灵活组合角色能力(移动/跳跃/攀墙) |

### 引擎特性对比

| 对比维度 | Unity | Unreal | Godot | Cocos Creator |
|---------|-------|--------|-------|--------------|
| 2D支持 | 良好(Sprite/Tilemap/Cinemachine2D) | 一般(以3D为主,2D为附属) | 优秀(原生2D引擎,像素精确) | 优秀(2D工作流完善) |
| 3D支持 | 优秀(URP/HDRP管线) | 顶级(Nanite/Lumen/Chaos) | 一般(Vulkan后端持续改进) | 一般(3D能力持续补齐) |
| 网络方案 | Photon/Mirror/Netcode for GameObjects | Epic Online Services/自研 | 社区插件为主,需自研较多 | Cocos Service/第三方SDK |
| 编程语言 | C# | C++ / 蓝图 | GDScript / C# / C++ | TypeScript / JavaScript |
| 适合团队规模 | 3~50人 | 10~200人 | 1~10人 | 3~30人 |
| 学习曲线 | 中等 | 较陡 | 平缓 | 平缓 |
| 包体大小 | 中等(~15MB起步) | 较大(~50MB起步) | 小(~5MB起步) | 小(~3MB起步) |

> **选型决策流程:** 先确定游戏类型和目标平台 → 用"按游戏类型推荐引擎"表缩小范围 → 用"引擎特性对比"表评估团队匹配度 → 用"按游戏类型推荐架构模式"表确定代码架构。

---

## 九、代码组织原则

| 原则 | 说明 | 反模式 |
|------|------|--------|
| 策划案可编码 | 策划案中的规则必须精确到程序员可直接编码,无歧义 | 策划案用"大概"、"可能"等模糊词 |
| 配置驱动 | 尽可能用配置表驱动逻辑,而非硬编码 | 代码中充斥魔法数字 |
| 接口先行 | 客户端与服务端先定义协议接口,再各自实现 | 两端各自定义数据结构,联调时才对齐 |
| 数据一致 | 前后端数据、配置表与策划案数据必须一致 | 策划案改了数值但配置表没同步 |
| 资源规范 | 美术资源按规范命名、分类、压缩,引擎可正确加载 | 资源命名随意、散落各处 |

---

## 十、代码生成:从GDD到代码

AI可根据策划案中的规则定义,系统性地生成可执行代码。核心过程为:**提取配置参数 → 定义状态枚举 → 实现完整逻辑**。

### 示例1:移动系统

**GDD描述:** "角色有三种移动方式:步行速度3m/s;跑步速度5m/s,持续消耗体力(每秒-15点,体力上限100,为0时强制停止跑步);闪避位移3m,带0.3s无敌帧,冷却1s。"

**映射过程:**
1. 提取配置参数 → 定义 `MovementConfig` 接口(walkSpeed, runSpeed, staminaMax, staminaDrainRate, dodgeDistance, dodgeInvincibleTime, dodgeCooldown)
2. 定义状态枚举 → `MoveState { Idle, Walking, Running, Dodging }`
3. 实现 `CharacterMover` 类,所有数值从 config 读取(零硬编码),体力为0时自动降级(跑步→步行),`isInvincible()` 暴露给伤害系统实现解耦

### 示例2:技能冷却系统

**GDD描述:** "角色有3个技能槽,每个技能有独立冷却时间(CD)和魔法值(MP)消耗。技能使用时先检查CD和MP,均满足才可释放。"

**映射过程:**
1. 提取配置参数 → 定义 `SkillConfig` 接口(id, name, cooldown, mpCost, castTime, damageMultiplier, element)
2. 实现 `SkillSystem` 类:`canUseSkill` 和 `useSkill` 分离(UI先查询再触发),`SkillUseResult` 返回失败原因(如"MP不足"),通过事件总线 `EventBus` 通知战斗系统(技能系统不直接操作伤害逻辑)

### 示例3:伤害计算器

**GDD描述:** "伤害公式:最终伤害 = max(1, (基础攻击 × 技能倍率 - 目标防御 × 减伤系数) × 暴击系数 × 元素克制系数 × 随机浮动)。暴击率受等级差影响,暴击伤害固定150%。元素克制:火克冰、冰克风、风克火、雷克地、地克雷,克制×1.5、被克×0.5。随机浮动0.95-1.05。伤害下限为1。"

**映射过程:**
1. 定义元素枚举 + `DamageInput`/`DamageResult` 接口
2. 元素克制用矩阵查表(新增元素只需扩展矩阵,不改逻辑)
3. 等级差修正暴击率有上下限 clamp,最终伤害保底为1
4. 计算过程为纯函数,无副作用,便于单元测试

---

## 十一、代码审查模板

审查输入参数:Git提交人、代码目录路径、提交起止时间、项目、审查维度(语言规范/安全/逻辑等)。

**报告格式:**

```markdown
# 代码审查报告

## 摘要
[审查范围、代码量、问题总数概述]

## 问题列表
| 序号 | 问题内容 | 问题类型 | 严重等级 | 所在文件 |
|------|---------|---------|---------|---------|
| 1 | [描述] | 语言规范/安全/逻辑 | P0/P1/P2/P3 | [文件路径] |

## 修复方向建议
- 问题1:[修复建议]
- 问题2:[修复建议]
```

审查完成后:提交报告 → 触发邮件周知流程。

---

## 十二、技术实现检查清单(合并去重版)

| 检查项 | 标准 | 验证方法 |
|-------|------|---------|
| 配置表驱动 | 参数从配置表读取,无硬编码 | 搜索代码中是否有魔法数字 |
| Schema 完整 | 每个字段有类型、单位、范围、默认值 | 配置表加载时自动校验 |
| 前后端一致 | 客户端和服务端使用同一 Schema | Schema 文件放在共享目录 |
| 同步策略明确 | 每个参数标注同步策略 | 对照第三节映射表确认 |
| 边界处理 | 数值有 clamp(上下限),空值有兜底 | 单元测试覆盖边界值 |
| 异常兜底 | 网络断开/资源缺失/非法输入有处理 | 异常场景测试用例 |
| 状态机完整 | 所有状态有进入/退出条件,无死锁 | 状态机穷举测试 |
| 性能基线 | 单帧逻辑 < 8ms(60fps 目标) | Profiler 实测 |
| 内存控制 | 对象池复用高频对象,无泄漏 | 内存快照对比 |
| 资源规范 | 命名规范、分类清晰、压缩合理 | 资源管理工具检查 |
| 版本兼容 | 新增字段有默认值,旧版可忽略 | 版本回退测试 |
| 接口文档 | 协议接口有文档,字段有注释 | 人工审查 |

---

## 使用方式

### 典型场景

1. **策划案落地前**:用规范层(第一部分)把策划案转化为配置表 Schema、状态机、映射规则
2. **开发启动时**:用执行层(第二部分)做技术选型、确定实现链路
3. **编码过程中**:用代码生成示例指导从 GDD 到代码的映射
4. **代码完成后**:用代码审查模板和检查清单做质量验证

### 与其他技能的协作

- 策划模块(系统/数值/战斗等)产出时,可参考本技能的"配置表 Schema 模板库",在策划案中直接标注字段定义
- `game-full-workflow` 组装 GDD 时,用本技能的"映射规则"做字段一致性校验
- QA 测试用例可参考本技能的"检查清单"设计配置校验用例
