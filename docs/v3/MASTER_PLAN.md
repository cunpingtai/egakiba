# Moji Blade V3 — 产品与核心代码重构总规划

状态：设计冻结草案（Planning Baseline V1），2026-10-23。不是已经实现或验证的 V3 游戏代码。

## 0. 来源与边界

依据用户提供的 V2 主程序（约 1069 行）和 2026-10-23 线上 v2.4.1 页面说明。**尚未取得完整的 `physics.js`、`glyph.js`、`render.js`、Scout 控制器、存档等依赖源文件**；以下所有数值、伤害、数据库设计均为 V3 方案，不应误标为旧版事实。

确认的旧版特征：字形+字体创建 3D 物理陀螺；速度/力量/平衡显示；鼠标/触屏拉拽发射、旋转方向；标准/连胜/Scout/本地双人/活动等；图鉴与皮肤；本地存档；在线排名模块暂被 `BUDGET_PAUSED` 关闭；游戏主文件同时承担输入、UI、异步联机、渲染、战斗和存档调度。旧版规则 45 秒未决出结果为平局。

## 1. V3 产品定义

一句话：以文字轮廓决定物理特性、以玩家的发射判断决定战斗结果、以关卡与文字收集驱动长期成长的跨设备竞技游戏。

核心原则：
- **形状是真正玩法**：文字和字体必须影响物理碰撞、速度、稳定性；不做纯数值换皮。
- **赢输可解释**：血量、旋转力、暴击、出界以及结算说明来源于可记录的真实规则事件。
- **单机优先，云端增值**：游客可立即游玩；云存档、排行榜独立失败、可降级；不可阻塞第一局。
- **PVP-ready, not PVP-first**：从第一天定义网络确定性契约与 ruleset，但不在物理重构未成熟时推出实时对战。
- **旧记录安全**：旧纪录归档，新赛季新规则单独计分；迁移须可回滚。

## 2. 战斗规则（首次需要冻结的决定）

主显示属性：Speed 速度、Power 力量、HP 血量。辅助信息：Balance 平衡（可放详情）、Spin 旋转力（战斗 HUD 中单独显示）；不使用同一条数值同时代指 HP 与 Spin。

### 2.1 四种资源/属性区别

| 名称 | 语义 | 数值生命周期 | 玩家呈现 |
|---|---|---|---|
| Speed | 标准发射测试下的机动倾向，受质量/惯量/发射规则影响 | 字形/字体确定；场地临时影响 | 角色卡主属性 0-100（相对刻度） |
| Power | 标准碰撞条件下的冲击输出倾向 | 字形/字体确定；事件修正 | 角色卡主属性 0-100 |
| Max HP / HP | 结构耐久，实际碰撞伤害消耗 HP | MaxHP 初始确定，currentHP 战内变化 | 角色卡 HP 上限，战斗中 current/max |
| Balance | 姿态稳定、倾倒抵抗和旋转维持倾向 | 字形/字体确定 | 角色详情；非额外不可见增伤数值 |
| Spin | 陀螺正在保持的旋转能量 | 发射初始化，时间/碰撞持续损耗 | 战斗 HUD 小型第二资源条 |

注意：上述 0–100 指展示规范化评分，不代表碰撞引擎直接乘以该数字；Max HP 建议先选可理解的数值区间并用样本测试校准，不能把未测试的公式认定成正式机制。

### 2.2 字形静态特征

`GlyphKey = normalize(NFC, first grapheme cluster) + fontId + outlineVersion`。严格处理 Unicode 合成字符、emoji 序列、缺失字形、字体 fallback 与不同平台轮廓。竞技池只允许具有固定打包字形轮廓和可验证 `outlineHash` 的角色，开放娱乐模式可用更宽的字符池。

从确定性字形数据提取：二维面积、凸包面积/周长、对称度、重心偏移、外接盒长宽比、转动惯量代理、凸/凹度、尖角分布。先量测旧版真实生成结果，不能空想转换关系。

算法分层：Glyph Outline -> GeometryFeatures -> GameplayStats -> PhysicsBody。几何原始结果和离线平衡标定表带独立版本，不让 UI 调用重型物理构造来计算属性。

### 2.3 战斗伤害

继续保留物理碰撞、旋转耗尽和场外败北。新 HP 是独立耐久：由真实接触冲量、相对法线速度、攻击者接触部位、暴击阈值，经 `DamageResolver` 换算，**不能由随机粒子/音效事件反向推算**。限定阈值、每对实体碰撞冷却/聚合、小接触抖动保护和单次伤害上限，避免地面震颤秒杀、连续重复接触重复计伤。

推荐 PVE Arena HP 的结束规则（需模拟测试再冻结正式系数）：出界 -> 败；HP 到零 -> 败；自转低于可持续阈值并确认稳定停转 -> 败；双方同帧失败 -> 平局；45 秒超时 -> 平局（保持旧版认知）。关卡特定目标可覆盖超时规则，但必须通过显式 `objectiveId` 声明。

**Classic** 保留 V2 的纯物理规则，不加 HP 伤害；**V3 Arena** 使用新 HP。V2 记录和 V3 排名不混榜。PVP 将来只支持一个正式竞技 ruleset，在平衡稳定后再发布。

### 2.4 伤害调优与 QA

对固定字形池构建批量模拟：交换出场左右、多个种子、力度/角度网格和不同舞台，统计胜率、伤害分布、平均战斗时长、无效碰撞、首秒失败、45 秒平局、异常几何。先修碰撞/字形生成，再调整 HP 与伤害系数。每个规则版本保存 golden battle snapshots 和 state hash；不允许小修皮肤导致物理 hash 变化。

## 3. 模式与进度

建议固定模式：
- Story/Stages：分章节的 PVE 关卡（V3 新主线）；先交付 3 章 × 4 关 = 12 关的完整垂直切片，再扩到 5 章 × 8 关，不一次建 100 关。
- Quick Match（VS COM）：选双方文字/字体/难度/竞技场，练习。
- Endless Streak：经典或 V3 规则明确区分、稳定随机种子/固定赛季、单一模式内累计连胜。
- Scout Challenge：保留原先队伍招募/队伍加成，迁移成独立 controller/存档 schema，后期才叠加 V3 HP 规则；防止一次重构影响全部模式。
- VS Local：双方分开锁定发射动作，允许锁定前调整，已锁定可在双方未完成前撤销一次或按规则撤销；避免第二人窥见方向优势。
- Online Ranked/Rooms（后期）：待确定性、服务器模拟、身份及结算可靠后开启。

场地 Arena 与关卡 Level 分开：一个 Arena 可被 12 个 Level 复用，Level 定义敌人、难度、种子、目标、解锁、奖励；Arena 定义材质、形状、障碍、加速区和物理效果。首批关卡设计：

| ID | 关卡 | 教学/挑战重点 |
|---|---|---|
| 1-1 | First Launch | 拖拽、力度和发射 |
| 1-2 | Aim Matters | 角度控制 |
| 1-3 | Spin Left / Right | 左右旋向 |
| 1-4 | First Rival | 第一章 Boss/综合 |
| 2-1 | Light vs Heavy | 速度与力量权衡 |
| 2-2 | Protect Your HP | 碰撞伤害与血量 |
| 2-3 | Stay in the Ring | 失稳和出界 |
| 2-4 | Sharp Edge | 暴击与连撞 |
| 3-1 | Boost Zone | 速度板 |
| 3-2 | Bounce Back | 回弹墙 |
| 3-3 | Rotating Floor | 地面旋转力 |
| 3-4 | Arena Master | 混合综合关卡 Boss |

关卡完成星级应使用固定目标，而不是单纯根据文字选择或伤害量评分；示例：1 星获胜、2 星未出界且剩余 HP 达阈值、3 星通过本关特色挑战。阈值必须对可选择字形公平；否则限定字形或使用标准试炼配置。

## 4. 玩家操作：三套入口使用同一 BattleAction

1. Pull Release：经典弹弓拖拽。有效拖动松手就发射，回到起点周围可取消；UI 显示力度、方向与左右旋向。
2. Precision Aim：触屏友好选项。拖动只调整方向与力度，最后点击独立 Fire 执行。输入仅改变发射时机，不改变同样的物理初速度。
3. Keyboard/Gamepad：方向/力度/旋转和发射，基于同一量化范围与动作映射。触摸屏读屏辅助可使用控制按钮。

控制器流程：PointerDown -> Captured -> Aiming -> Armed -> Confirmed/Cancelled。清楚区分相机操作（桌面右键/双指）与瞄准操作（左键/单指）；拖拽中锁定相机。支持 pointercancel、tab 切换、WebGL context loss、首个 touch 在文字之外无法命中等异常。

预览最多承诺显示发射初始向量，不伪称可准确预测复杂物理轨迹。辅助选项包括力度百分比、受力方向、震动/音量、减弱动画、左利手按钮布局。

## 5. 交互与 UI 页面合同

- HOME：主按钮“继续游戏/开始闯关”；次入口“VS COM/连胜/Scout/本地双人”；图鉴、战绩、设置次级导航；维护中的联机放到状态公告，不占主入口。
- SELECT：输入一个完整 grapheme、热门示例、最近使用、搜索/图鉴、3D 预览、字体对比、三主属性和辅助属性说明、最终开始按钮。禁止悄悄截断不支持符号。
- STAGE MAP：章节卡、关卡节点、星级/解锁关系、奖励、规则说明；锁定原因清晰。
- PREPARE：双方文字/HP/战场/胜负规则/发射提示，3 秒内可跳过的开场。
- ARENA：中心主要留给 3D 场地；顶部双人 HP 条，HP 下方 spin 细条，玩家名字/字形，中央计时；底部控制提示与旋向；场地特效与血量变化在物体附近短暂反馈。
- PAUSE：继续、重开（可能损失进度需确认）、设置、离开；本地和在线运行中对暂停有不同规则。
- RESULT：胜负、真实结束原因、关键撞击时间线、剩余 HP、星级/奖励、下一关/再来一次；点击展开完整报告。
- COLLECTION：已见字符，按支持书体、形状、属性、记录筛选，字形对比、3D/皮肤与角色历史数据。
- PROFILE：游客/登录、云同步状态、所有设备、进度、设置、删除数据和导出。
- LEADERBOARDS：本周、本赛季、历史归档，分模式/规则版/关卡；展示与本人的相对位置，不能混入无验证成绩。
- CONNECTIVITY：离线、待同步、冲突、错误与恢复，不用后台网络错误阻断单机战斗。

设计：浅色高对比的场地与深蓝 HUD，玩家蓝 `#3878E8`、对手红 `#E66B5B`，稀有奖励金色；字体切换只影响游戏字形，UI 使用统一无障碍日文字体。交互动效分静态/普通/强撞击/终结四层；支持 `prefers-reduced-motion`。

## 6. 游戏客户端重构建议

技术决策：**TypeScript + Vite**；保留现有可靠的 Three/WebGL 渲染和原物理计算作为过渡 adapter，先测试验证再决定是否换物理引擎。复杂页面/弹窗可以用 React + 状态管理，但物理每帧更新绝不能塞进 React 状态和组件重渲染。用状态机管理页面和游戏生命周期，逻辑帧固定步长，渲染插值可变帧率。

monorepo 建议：

```
apps/web/                 # HOME、选择、关卡、图鉴、HUD 等
apps/api/                 # Cloudflare Workers API、认证、存档、榜单
packages/contracts/       # API 请求/响应、动作和消息协议
packages/glyph-core/      # Outline/shape/cache/versions/feature extractor
packages/game-rules/      # Ruleset、伤害、胜负、胜率、关卡条件
packages/simulation/      # Battle engine + fixed timestep + events + replay
packages/game-modes/      # story, quick, streak, scout, local, later ranked
packages/game-state/      # State machine，事件总线和存档协调
packages/render-three/    # 场景/镜头/3D 角色/粒子/特效
packages/game-input/      # pull/precision/keyboard/gamepad
packages/audio-haptics/   # 音效、BGM、震动
packages/save-core/       # IndexedDB、本地迁移和同步队列
packages/verification/    # 无头批量物理运行、对战校验、反作弊
migrations/               # 云存档与排行榜 SQL 版本迁移
```

优先设计接口 `IGlyphProvider`、`IBattleSimulation`、`IBattlePresenter`、`IInputController`、`ISaveRepository` 和 `ILeaderboardService`。所有业务 UI 订阅结构化 BattleEvent，而不是直接读/写 Matter/Rapier/Three 物理对象。

新增 `rulesetVersion`、`physicsVersion`、`glyphVersion`、`stageVersion`、`protocolVersion`，游戏结果绑定这些版本。旧版纯物理和 V3 HP 规则隔离。

## 7. 每个核心文件怎么办

| 旧文件/范围 | 动作 | 新归属 |
|---|---|---|
| 巨型 main app / showPhase | 拆解，不原样搬迁 | app bootstrap、state machine、mode controllers、UI bindings |
| physics.js / Battle | 先冻结 golden tests，再抽象，最后逐步改 | simulation engine + collision events + damage resolver |
| glyph.js + fonts.js | 保留来源，改版本与缓存策略 | glyph-core / geometry / stats |
| config.js | 拆数值/字符合法性/COM AI/规则 | game-rules + ai + input validation |
| render.js | 逐步抽场景和特效，勿一次更换引擎 | render-three |
| stages.js | 场地与关卡分离 | arena-catalog + level-catalog |
| scout-controller.js | 阶段性迁移，保持旧版行为 | game-modes/scout |
| encyclopedia*.js / skins*.js | 保留业务，脱离 DOM 和 localStorage 直连 | collection + cosmetics + save core |
| api/ranked/room | 暂停旧写接口，隔离，后续重新实现 | server validation + online match service |
| game-session/storage | 局部多标签锁，保存一致性与冲突 UI | save-core + session-management |

## 8. 云存档与账号

云端架构推荐 Cloudflare 前端不迁移，Workers API + D1 作进度/排名，R2 只在确需导出图片/回放文件时使用，未来用 Durable Objects + WebSocket 作房间协调；认证使用可验证的身份服务，不自制密码数据库。游客先本地 IndexedDB，无登录阻碍首局；升级登录后绑定永久 ID，支持 Google / Apple / Email 的具体方式依部署平台确定。

数据权属：
- **服务器为权威**：排行榜、奖励发放记录、正式比赛结果、房间状态、处罚与版本。
- **客户端先行、可合并**：关卡本地进度、设置、个人练习记录、发现过的字形、可重试的离线事件。
- **重要行为事件**：每个关卡奖励 `idempotencyKey`，避免多设备离线重复领取。

最小云端概念表：users/identities, save_slots, progress_events, level_bests, run_sessions, match_results, leaderboards, reward_grants, save_revisions, ruleset_releases。最终结构需按 Worker ORM 和 D1 迁移约束调整。

冲突策略：解锁/成就集合并集、最高星级取 max、最高分只接受经服务验证的值、个人设置使用最后修改时间/设备选择、正在运行的 Scout 保存保持独立 save slot，绝不静默把两段 run 合并。写入基于 `revision` compare-and-swap；不匹配返回 409 带服务端修订版，并走冲突界面/安全合并。显式“本地已保存/等待同步/云端已同步/同步失败”。

个人隐私：最小化账号数据，支持账号导出/删除，不在公开排行暴露账号标识/邮箱；用户名限长、敏感字符过滤。端到端风控由服务端记录每次发奖审计。

## 9. 排行榜与反作弊

不能接收裸 `score` 作为正式排行。客户端产生本地结算后，只作为候选 `matchReport` 上传：`rulesetVersion, physicsVersion, glyphHash, stageVersion, seed, quantized actions, eventDigest, clientResult, idempotencyKey`。服务端验证合法角色/解锁、时序、动作合法范围，**有无头确定性引擎时重放并核验结果**。若 V3 引擎不能在 Workers 上可靠重放，则不开放可供作弊的全球正式排名，先做私有/本地榜或使用可信托管结算方案。

榜单分别命名：Story 单关星级/成绩、Streak 连胜、Scout 生存长度、后期 Ranked Rating。榜单 key 包含 mode + season + ruleset + stage + pool。不同物理/HP 规则绝不混榜；每日/每周可采用预聚合排行，减少查询费用。排名允许匿名昵称但不能绕过 UID 级别限额。保留历史只读 V2 榜单。

## 10. 未来 PVP：只设计契约，暂不制作正式产品

该游戏适合 **同步选择发射动作、由确定性物理模拟播放同一场战斗**，未必需要持续每帧流式传送物理位置。建议步骤：

Matchmaker -> Room Durable Object -> 双方 ready -> 统一行动截止时间 -> 双方提交一次量化发射动作 -> 服务端固定规则重放并计算结果 -> 广播带版本的战斗 descriptor -> 客户端可复现播放 -> 服务器签发结算。

正式开赛前检查延迟、超时默认动作、掉线、重连、双方同时退出、不同浏览器仿真 hash、服务端超时/费用。之后才考虑完整的观战和多人实时控制。Durable Objects 使用 WebSocket Hibernation API，避免空房间持续计费。

## 11. 自动化测试与质量门

T0：旧版行为基线，固定 10–20 个典型字形×字体、多个固定 seed、指定双发射动作，保存初态、主要轨迹采样、终态、胜负、平均帧耗时；记录现版算法哈希。T1：新 glyph stats 的边界/不支持字形/emoji/非 UTF-8 源。T2：固定时间步、渲染 fps 不影响物理结果。T3：DamageResolver 不重复计入同一个接触事件，数值非负，扣血后可判胜负。T4：12 关解锁逻辑、重试后星级/奖励幂等。T5：双端云存档/409/断网/重复提交/游客升级。T6：榜单非法分数/恶意 ID/旧版本拒绝。T7：移动触控、键盘、无障碍。T8：WebGL 丢上下文+恢复+低性能降级。

建议质量指标（目标，不是当前测量）：现代手机 60 FPS 目标/低端 30 FPS 兜底；战斗 UI 核心操作 `pointerup` 到物理动作提交 < 50ms 的中位目标；稳定首局流程不过度阻塞；关键云端写请求错误可恢复；用实机性能测量确定最终阈值。

## 12. 迁移策略（Strangler Pattern）

1. 将 V2 源码完整归档并打 git tag `v2.4.1-baseline`，复制老本地数据 fixture；上线入口保持 V2，不改现网存档。
2. 建 `/v3/` 隔离开发环境，建立 TypeScript monorepo、typed contracts、单元测试和测试器。
3. 用 `LegacyBattleAdapter` 包装原 Battle/Physics/Glyph，渲染与 UI 可逐步替换；先做到**完全相同输入得到完全相同旧版结果**。
4. 将 damage / HP 作为独立可开关 `ArenaHP` ruleset，未完成平衡验证之前不开正式排行。
5. 实现第一关垂直切片：字形输入 -> 角色卡 -> 发射 -> 战斗 -> 结算 -> 本地存档 -> 重试。
6. 扩至 12 关、Scout/连胜/图鉴 UI 迁移；完成云存档和只读/验证后排名。
7. 灰度上线、监控崩溃/帧率/完成率、执行回滚演练；切换 V3 为主版本。V2 排行历史归档，不丢失老用户图鉴。
8. 最后单独启动 PvP 里程碑。

## 13. 实施工作包（优先级和验收）

| 工作包 | 优先级 | 交付 | 退出条件 |
|---|---|---|---|
| M0 审计与快照 | P0 | 文件依赖图、数据架构图、golden tests、旧版资源哈希 | 旧版完整编译与 N 个回归案例复现 |
| M1 规则契约 | P0 | TypeScript 数据模型、ruleset 语义、属性生成/HP 规范草案 | 所有 mode 使用统一动作与事件结构 |
| M2 Simulation 包 | P0 | Battle adapter、固定步长、事件、快照/回放 harness | 无头环境和 UI 同一输入一致 |
| M3 V3 HP combat | P0 | DamageResolver、血量、结算原因、数值批测 | 异常字形和边界测试达标 |
| M4 V3 UI 纵切 | P0 | 首页/选字/首关/HUD/结算、触屏模式 | 用户可完整从首页打一局并重试 |
| M5 关卡/进度 | P1 | 12 个关卡、地图、锁定/奖励/三星、本地存档 | 完成状态可靠且奖励只发一次 |
| M6 云存档 | P1 | 登录/游客升级/同步/冲突/删除导出 | 多设备离线反复切换不丢档 |
| M7 排行榜 | P1 | 服务器验证、赛季规则、只读旧榜 | 无法提交裸分数或跨版作弊 |
| M8 模式迁移 | P1 | Scout/连胜/本地双人/图鉴/皮肤迁移 | 游戏数据与 V2 兼容/可验证 |
| M9 发布回归 | P1 | 实机测试/性能档位/故障恢复 | 达到上线门槛且可一键回滚 |
| M10 后期 PvP | P2 | DO 房间/联机协议/超时/匹配评分 | 跨端确定性+服务端权威结算 |

## 14. 第一个开发任务（从这里开始）

**不是做首页。M0：冻结物理基线与旧存档格式。**

需要一份完整仓库/工程或包含 `physics.js, glyph.js, config.js, render.js, stages.js, all scout modules, encyclopedia persistence, html/css, assets/wasm/package config` 的源码包。随后生成：
1. `existing-dependency-inventory.json`：真实依赖拓扑与功能归属；
2. `legacy-battles.json`：固定字符/字体/场地/动作/胜负与完整基础状态；
3. `legacy-save-fixtures/`：匿名的 V2 各版本存档样例；
4. `simulation-adapter.ts`：不改变规则的 Battle 抽象；
5. `ruleset-v3-draft.ts`：HP/Spin/Damage 规则框架；
6. `M0_REPORT.md`：旧版兼容风险及下一工作包准入结论。

在 **M0 通过之前** 不迁移物理引擎、不开放排行榜、不覆盖线上旧存档、不宣称 HP 数值已平衡。
