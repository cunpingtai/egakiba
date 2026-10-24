# M0 报告：v2.4.1 物理基线

日期：2026-10-23。这是审计结论，不是可运行的 V3 战斗。

## 基线从哪里来

规划包写作时还没有 `physics.js` 和 `glyph.js`。现在 `source/` 里是线上 v2.4.1 客户端的发布模块，入口 `source/game.js`（1068 行），物理版本常量是 `moji-blade-rapier021-r16-app-inner1`。

这不是原始构建仓库。依赖图和文件哈希在 `docs/v3/m0/existing-dependency-inventory.json`。字形字体在 `source/fonts/`。

## 旧战斗实际怎么结束

`source/physics.js` 的 `Battle` 仍是唯一模拟器。固定步长 `CONFIG.step = 1/240`，表现时间乘上 `simulationRate = 2.1`，`timeLimit = 45`。

| V2 `result.reason` | 条件 | 和 V3 契约的关系 |
| --- | --- | --- |
| `場外` | 轴心出界，或掉落场地 | `ring-out` |
| `回転停止` | 宽限期后转速低于 `stopRate` 持续 `stopDuration` | `spin-exhausted` |
| `転倒` | 触地且倾角过大 | 契约里没有单独原因，适配器返回 `null`，禁止并进停转 |
| `同時決着` | 双方同一结算同时失败 | `double-ko` |
| `時間切れ` | 游戏时间达到 45 秒 | `timeout` |

V2 没有 HP。速度、力量、平衡来自 `statGauges()`：质量开方映射速度和力量，平衡来自轮廓圆度和四象限面积。展示值是 0–1，不是规划卡片上的 0–100。

`Battle.launchPair` 吃的是弧度角和 0–1 力度。`BattleAction.angleQ` / `powerQ` 的整数网格还没冻结，`quantizeLegacyAction()` 会直接抛错，避免提前把旧操作写成排行榜动作。

## 字体

字形轮廓用的四个字体已经在 `source/fonts/`，字节数与线上一致：

| 字体 | 文件 | 大小 |
| --- | --- | --- |
| gothic | `mplus1-medium.ttf` | 1,836,880 |
| mincho | `NotoSerifJP-Regular.ttf` | 8,079,972 |
| pop | `RoundedMplus1c-ExtraBold.ttf` | 3,628,512 |
| brush | `KouzanGyousho.ttf` | 5,640,044 |

标题用的 `title-*.woff`、韩文标题 `title-ko-*.ttf` 也在同一目录。品牌字 `wdxl-lubrifont-jp-n.woff2` 在站点根的 `assets/fonts/`，对应 `style.css` 里的 `../../assets/fonts/`。

## Golden results

`packages/verification/replay-core.mjs` 是 Node 和浏览器共用的重放。8 组输入各自连续跑两次，步数、胜负、`stateHash` 和事件都相同。浏览器打开 `packages/verification/browser-replay.html` 后，和 `docs/v3/m0/legacy-battle-results.json` 逐项比较，差异为 0。

| 用例 | 胜者 | 原因 | 步数 | 终态哈希 | 撞击 |
| --- | --- | --- | --- | --- | --- |
| standard-bun-ji-gothic | 0 | 回転停止 | 1965 | `4573bd52` | 3 |
| standard-bun-ji-opposite-spin | 0 | 回転停止 | 1499 | `4c0317f5` | 6 |
| standard-light-vs-heavy | 1 | 転倒 | 296 | `ce6720a1` | 1 |
| mincho-vs-brush | 1 | 回転停止 | 845 | `745ebd50` | 1 |
| boost-bowl | 1 | 回転停止 | 680 | `6eb4b3ac` | 1 |
| square-ring | 0 | 回転停止 | 4701 | `a0603f98` | 5 |
| rotating-floor | 0 | 回転停止 | 2578 | `1e569534` | 3 |
| weak-com-default | 0 | 回転停止 | 2292 | `5217186f` | 3 |

第一场的第一次撞击在第 116 步，位置与暴击标记在 Node 和浏览器里相同。这几组发射没有打出加速板或绳圈事件，所以 `boosts` 和 `ropes` 目前是空的；场地本身已经参与结算，终态哈希和标准场不同。

复现命令是 `pnpm replay:legacy:check`。物理代码没有改。HP 伤害仍然没有加。

## 存档

样例在 `docs/v3/m0/legacy-save-fixtures/`。它们按源码校验器写成，不是玩家导出的档案。Scout 当前写入 `scout-run.v3`，图鉴 schema 是 version 3，主设置键是 `tsukuruum.moji-blade.v2`。进行中的 Scout 不能和另一台设备的 run 合并。

## M1 已放进仓库的契约

- `packages/contracts/src/v3-contracts.ts`：规划包原件
- `packages/game-rules/src/ruleset-v3-draft.ts`：`classic-v2` 与 `arena-hp-v3` 两套规则。伤害系数在 `arena-hp-draft.mjs`，仍是草案
- `packages/simulation/src/legacy-battle-adapter.ts`：包住现有 `Battle` 的端口，不导入 Rapier

## 下一包准入

固定步长适配器在 `packages/simulation/legacy-battle-adapter.mjs`。重放已经改由它逐帧读取 `Battle`，不改物理。撞击记录额外带上原始接触力 `force`，8 组最终哈希仍是原来的值。Node 和浏览器的 `battleEvents` 一致：发射、撞击、结束。没有 `damage` 事件。`転倒` 的结束原因仍是 `null`，没有写成 `spin-exhausted`。

Arena HP 草案在 `packages/game-rules/arena-hp-draft.mjs`，版本 `arena-hp-v3.0.0-draft.2`。它只读字形之间的撞击记录，不回写 `Battle`，也不把加速板或绳圈算进伤害。128 组固定网格在 `docs/v3/m3/arena-hp-contact-batch.json`：接触力中位数约 1450。上一版每 25 点力 1 点伤害、上限 35，所以 452 次结算顶满上限。这一版 `forceUnit` 取中位数除以 12 再取整，得到 121，单次上限 30。中位数那一击大约扣 11 点。这仍是样本刻度，不是正式平衡。

`boost-bowl-contact` 在第 151 步和第 326 步踩到加速板。`square-rope-contact` 在第 270 步碰到 +x 绳、第 312 步碰到 -x 绳。原来的 `boost-bowl` 和 `square-ring` 仍然一次都没碰到。10 组 Classic 哈希不变，「文 vs 字」仍是 `4573bd52`。`転倒` 的 V3 原因仍是空的。

标定完成前不开放正式排行榜，也不覆盖线上存档。
