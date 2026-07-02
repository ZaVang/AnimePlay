# Scout Report — Iteration 2（S15 第 2/3 轮，product-loop --tier1 on --mode all）

> 本轮指派切片 = **S15-T2（轻量家具 / 布局系统，P3-4）**（见 SPRINT.md 排期建议第 2 轮：「家具 v20，唯一存档重任务，单独做透三改+往返测试」）。
> 前情：第 1 轮 **S15-T1 + S15-T3 已 COMPLETE**（eval.md：test×3 全绿、零存档、SAVE_VERSION 仍 19、羁绊 engine 纯函数 + UI 显形已落地）。
> S15-T4 非本轮，仅在 B 节末尾给 Planner 排期用现状快照，Generator 本轮不要动。
> **权威 SAVE_VERSION（schema.ts:50）= 19**。本轮是**本 Sprint 唯一升档轮 → v20**（furniture 域一次性 bump；若 T4 pity 也要持久化，第 3 轮复用同一 v20，别再单独升）。

---

## A. 约束与可行性（给 Planner）

### S15-T2 可行性：**高**，`facility` 域是逐字对标的成熟范式，照抄即可
- **一句话结论**：新增 `furniture` 独立存档域（v20），仿 `facility` 域五处对称落点（schema type + 默认工厂 + migration + store serialize/deserialize + 装配器两行），config 纯数据目录仿 `EQUIPMENT_CATALOG`，加成经既有 `computeIdleYield` 的 comfort/独立乘子口径汇入（**不新拼收益口径**），UI 在 `HomesteadView` 加兑换 + 摆放/收纳入口。风险主要在「存档三处同改 + 往返测试」的机械正确性，玩法数值风险低。
- **升档协议（本轮必做，v19→v20）**：三处同改（`schema.ts` + `migrations.ts` + `stores/persistence.ts` 装配器）+ 往返测试。`SAVE_VERSION` 由 19 → **20**（schema.ts:50 一处改）。v19→v20 迁移：旧档无 `furniture` 键 → 补空家具默认（仿 `migrateFacility`：白名单重建，**禁 spread**，pitfalls S13-C1）。migrations.test.ts 已有「v17 facility 缺失补默认」范式（:149-151、:525-529），照抄写「v20 furniture 缺失补默认」+ 往返保真两例。
- **收益口径铁律（不可绕开）**：家具加成**必须经既有口径汇入**，二选一（Planner 拍板，建议第一种最省事、零口径新增）：
  1. **家具只贡献 comfort（复用既有 comfort 软加成轴）**：`computeIdleYield` 已有 `effect.comfort` → `comfortBonusPct`（每 10 点 +1%，封顶 +20%，config/homestead.ts:94/210）。家具各给 comfort 分，settle/预览把「家具 comfort 合计」并入传给 `computeIdleYield` 的 `effect.comfort`（与装备 comfort 相加）。**零新增口径、零新乘子**，与合同「经既有 comfort 软加成口径并入」完全吻合。缺点：家具与装备共用同一 comfort→+20% 硬顶，家具深度有限（但守住「挂机不盖过主动收入」基线，正确）。
  2. **家具作新的独立乘子（仿设施乘区）**：若要家具有独立产出%（expPct/affectionPct/knowledgePct），则 `computeIdleYield` 内加一个 `furnitureMult`（与 comfort/bond/设施同层通乘）。**这会改 computeIdleYield 签名 + 全部调用点**（settle + HomesteadView 三处 + config/homestead.test.ts 断言），成本更高，且需明确它进不进 `HOMESTEAD_EFFECT_CAP`（建议独立温和封顶）。
  - **强烈建议走方案 1**（comfort 复用）：合同原文「每件给小额 comfort / 产出加成——经既有 comfort 软加成 / 设施乘区口径并入」，comfort 轴是现成的、`computeIdleYield` 已消费、UI 已显形（ops-card-main 大字 + `comfortBonusText`）。家具走 comfort 即「摆家具→基地更舒适→全产出小幅提升」，语义自洽、改动面最小、往返测试最干净。
- **摆放 / 布局**：合同说「复用 WALKABLE_ZONES 坐标或简单固定槽位」。**建议「简单固定槽位」**（如 furniture 域存 `Record<slotId, furnitureDefId | null>`，N 个固定装饰位），别硬绑 WALKABLE_ZONES 像素坐标（那是角色漫步区、16:9 百分比，塞家具会与漫步者/建筑重叠且需新美术）。**首版可不做「广场里可视化摆放渲染」**——合同验收只要求「摆放持久化跨重开保真 + 加成真进挂机收益」，一个「已摆放家具清单（给 comfort）」的 store 域 + HomesteadView 一个兑换/收纳面板即达标。可视化摆到广场是锦上添花，若做也应是独立固定槽位坐标，不改 WALKABLE_ZONES。
- **KP 兑换**：走 `profile.spend('knowledgePoints', cost)` 成功才入库（照 `upgradeFacility` / `purchaseEquipment` 范式，userStore.ts:509-527）。门面新增 `buyFurniture(defId)` / `placeFurniture` / `unplaceFurniture` 编排（先 `settleHomestead()` 结清再变更再 `saveToServer()`，与家具影响 comfort→影响封顶/产出的口径一致，防「摆家具瞬间回溯放大已挂时间」——同 `upgradeFacility` 的先结清模式）。
- **验收锚点**：可 KP 买家具（走 profile.spend）、摆放持久化跨重开保真、加成真进挂机收益（经 computeIdleYield 口径）、v20 迁移往返测试、type-check/test/build 通过。

---

## B. 代码地图与坑（给 Generator）

### S15-T2 落点（本轮做）—— 五处对称改 + config + UI

**范式样板（逐字对照抄）= `facility` 域**。下列每个落点都标注 facility 的对应行号供直接照搬：

1. **`frontend-vue/src/config/homestead.ts`（家具目录 + 纯函数，仿 facility 常量区 :40-104 + EQUIPMENT_CATALOG）**
   - 新增 `FurnitureDef`（`{ id, name, comfort, cost }`，名梗风，纯数据）+ `FURNITURE_CATALOG: readonly FurnitureDef[]`（仿 `EQUIPMENT_CATALOG`，config/equipment.ts:369）。
   - 新增 `canonicalizePlacedFurnitureIds(raw)` 归一（仿 `canonicalizePlacedIds` :23-35：数字/去重/截断，脏档防重复放大 comfort）。
   - 新增 `sumFurnitureComfort(placedFurnitureIds, catalog)` 纯函数：查目录求和 comfort。**这一步是「加成经既有口径汇入」的关键**——把家具 comfort 加到 settle/UI 传给 `computeIdleYield` 的 `effect.comfort`（与装备 comfort 相加），`computeIdleYield` 内部 `comfortBonusPct` 天然消费，**无须改 computeIdleYield 签名**（方案 1）。
   - 坑：家具 comfort 与装备 comfort 相加后仍走同一 `comfortBonusPct`（+20% 硬顶）——**这是有意的**（守挂机基线）；别给家具单开一条突破 +20% 的口径。若 Planner 选方案 2（独立乘子）才改签名。

2. **`frontend-vue/src/infra/persistence/schema.ts`（type + 默认工厂 + SAVE_VERSION + 沿革注释）**
   - `SAVE_VERSION = 19` → **`20`**（:50 一处）。
   - 顶部沿革注释加一行 `v20（S15-T2）：新增 furniture 域……`（仿 :27-35 facility 注释）。
   - 新增 `FurnitureSave` interface（仿 `FacilitySave` :197-204，如 `{ placedIds: number[] }` 或 `{ owned: string[]; placed: (string|null)[] }`，按 Planner 定的摆放模型）+ `createDefaultFurniture()` 工厂（仿 `createDefaultFacility` :207-209）。
   - `SavePayload` 加 `furniture: FurnitureSave` 字段（仿 :263-264 facility 行）。
   - 坑：`createDefaultFurniture` 若 import config 需注意——`createDefaultFacility` 就 import 了 `defaultFacilityLevels`（schema.ts:38），有先例，可仿。但**若家具默认是空数组/空对象，直接内联即可，别引 config 制造循环**（schema 已被 config/homestead.ts import，反向再 import 有环风险；facility 的 `defaultFacilityLevels` 是纯常量工厂无环，家具默认空态更简单，建议直接内联 `{ placedIds: [] }`）。

3. **`frontend-vue/src/infra/persistence/migrations.ts`（migrate 分支 + migrateFurniture）**
   - 新增 `migrateFurniture(raw)`（仿 `migrateFacility` :174-182：白名单重建、类型守卫、归一，**禁 spread**）。旧档无 `furniture` 键 → `createDefaultFurniture()`。
   - `migrate()` return 里加 `furniture: migrateFurniture(payload.furniture)`（仿 :315 facility 行）。
   - import 加 `createDefaultFurniture` + `canonicalizePlacedFurnitureIds`（若用）。
   - 坑：**禁 spread 浅拷贝旧档**（pitfalls S13-C1），逐字段类型守卫重建；家具 id 若走 defId 字符串则 `filter(typeof==='string')`，若走数字 index 则 `canonicalizePlacedFurnitureIds`。

4. **`frontend-vue/src/stores/furniture.ts`（新建 store，仿 `stores/facility.ts` 全文）**
   - `defineStore('furniture', ...)`：持有已拥有/已摆放家具状态；`buy`/`place`/`unplace` 纯改状态（**不碰货币、不 saveToServer**，货币/结算/存档由门面 userStore 编排——facility.ts 头注释明写此分工）。
   - `serialize()/deserialize(data)`（仿 facility.ts:61-71，deserialize 二次兜底归一）+ `reset()`。
   - `getComfort()` getter（供 settle/UI 同源取家具 comfort 合计喂进 computeIdleYield）。
   - 坑：deserialize 二次 clamp/归一（迁移已归一，反序列化再保险，杜绝脏档，同 facility.ts:64-71 注释）。

5. **`frontend-vue/src/stores/persistence.ts`（装配器两处 + reset）**
   - import `useFurnitureStore`（:24 facility 旁）。
   - `buildPayload()` 加 `furniture: useFurnitureStore().serialize()`（:72 facility 旁）。
   - `applyPayload()` 加 `useFurnitureStore().deserialize(payload.furniture)`（:111 facility 旁）。
   - `resetAllDomains()` 加 `useFurnitureStore().reset()`（:133 facility 旁）。

6. **`frontend-vue/src/stores/userStore.ts`（门面编排，仿 `upgradeFacility` :509-527）**
   - 新增 `buyFurniture(defId)`：`if (!profile.isLoggedIn) return false` → 查目录取 cost（Number.isFinite 守卫）→ **先 `settleHomestead()` 结清**（家具改 comfort→改产出，同 upgradeFacility 先结清模式，防回溯放大）→ `profile.spend('knowledgePoints', cost)` 成功才 `furniture.buy` → `saveToServer()`。失败回补 KP（仿 :522-525）。
   - `placeFurniture`/`unplaceFurniture`：先 `settleHomestead()` → 改摆放 → `saveToServer()`（仿 `placeInHomestead` :484-493）。
   - **货币只走 profile.spend/earn（架构铁律）**；先结清是口径一致命脉。

7. **`frontend-vue/src/views/HomesteadView.vue`（UI 兑换 + 摆放/收纳入口 + settle 喂家具 comfort）**
   - `homeEffect` computed（:184-188）现只 sum 装备 homeEffect；**改为把家具 comfort 并入**（`comfort: 装备comfort + furniture.getComfort()`），这样 `hourlyYield`/`projectedYield`（:199/:217）经 computeIdleYield 天然吃到家具 comfort，**预览=结算同源**（命脉，别只改 settle 不改 UI，重蹈「预览≠实战」P2-17）。
   - `settleHomestead`（userStore.ts:454）里 `homeEffect = sumHomeEffects(...)` 同样把家具 comfort 并入 `effect.comfort`——**settle 与 UI 两处必须同源改**（口径命脉，Scout C-2 的 partial-migration 陷阱）。
   - 加家具兑换面板（仿 `facility-grid` :651-674 或独立 modal，仿 `HomesteadManageModal`）：列 `FURNITURE_CATALOG`、显 cost/comfort、买/摆/收按钮、`:disabled="knowledgePoints < cost"`。
   - 颜色走语义令牌（`rgb(var(--c-accent))` 等，禁 text-white 压浅底、禁动态拼色类 `bg-${}`）；新 setTimeout/setInterval 若有须登记 + onUnmounted 清除（本视图已有 `commissionTimers`/`idleTimer`/`raf` 清理范式 :498-503）。
   - **可选**（锦上添花、非验收必需）：广场里可视化摆放。若做，用**独立固定槽位坐标**（新常量，别改 WALKABLE_ZONES :65-76——那是角色漫步区），且需家具美术资源（首版可用 emoji/纯 CSS 占位）。**建议首版不做可视化摆放**，只做「拥有清单 + 摆放开关（影响 comfort）」即达标。

8. **测试**：
   - `frontend-vue/src/infra/persistence/migrations.test.ts`：加「v20 furniture 缺失补默认」（仿 :149-151）+「往返保真」（仿 :396-413 enhance 往返范式：migrate→再 migrate 一致）+ 「脏档归一」两三例。
   - `frontend-vue/src/config/homestead.test.ts`：加 `sumFurnitureComfort` 纯函数测试 + 「家具 comfort 经 computeIdleYield 汇入使产出更高」集成断言（仿第 1 轮羁绊 2 例范式，用满 12h 封顶使 floor 后可辨——**小加成被 floor 抹平**是已知坑，gen_status 第 1 轮记录）。
   - 新建 `frontend-vue/src/stores/furniture.test.ts` 或在 `userStore` 编排测试里加 `buyFurniture` 走 profile.spend、余额不足不发货、成功入库（仿 `equipmentSource.test.ts` 兑换范式）。

- **本轮坑清单**：
  - **升档只升一次**：v20 是本 Sprint 唯一 bump，furniture 域 + （第 3 轮若做）pity 计数共用。本轮只做 furniture 那一份 v20；别顺手加别的字段。
  - **禁 spread 迁移**（pitfalls S13-C1）：`migrateFurniture` 白名单重建。
  - **口径同源命脉**：家具 comfort 必须 settle + UI（hourlyYield/projectedYield/nextHourlyYield）**全部**喂进 computeIdleYield，别只改一半（partial-migration，Scout 上轮 C-2 同型）。
  - **先结清再变更**：`buyFurniture`/`placeFurniture` 前 `settleHomestead()`（同 upgradeFacility），否则家具改 comfort→改封顶/产出会回溯放大已挂时间。
  - **别改玩法数值破 S14**：facility 乘区 / softCap / comfort +20% 硬顶 / 羁绊 cap 全不动；家具是**叠加一层新内容**，不改既有乘子。
  - **别用 git stash 跑基线**（pitfalls S13-C1）。
  - **fake timers 坑**（第 1 轮 gen_status）：若新 furniture 测试涉及 settle（读时钟），用 `settleHomestead(nowOverride)` 注入固定 now（第 1 轮已加此接缝，userStore.ts:422），别碰真时钟；persistence.test 那套 `useFakeTimers({toFake:['Date']})` 只冻 Date 的规避照旧。

### S15-T4 现状快照（非本轮，仅供 Planner 第 3 轮排期）
- **塔掉落纯函数** `engine/squad/drops.ts:27 rollTowerDrop(floor, rng, rarityForFloor, dropChance=0.5)`（注入 RNG，先掷 chance 再掷 slot，序列 RNG 可复现）。**调用链**：`SquadBattleView.vue:660 userStore.completeFloor(floor, rng)` → pve/userStore 内调 rollTowerDrop → `equipment.addItem`。
- **pity（保底）若做**：需在**调用方**（userStore.completeFloor 或 pve store）喂「连续未出计数」进纯函数 + 注入 RNG，纯函数据 pity 值决定是否强制命中/抬稀有度；计数**若持久化 → 复用本轮 v20 bump**（第 3 轮与 furniture 同 SAVE_VERSION，一 sprint 只升一次——**故本轮 furniture 升 v20 时，Planner 可预告第 3 轮 pity 复用 v20，不再升 v21**）。特征测试断言 pity 边界（连 N 次未出后第 N+1 次必出）。
- **碎片定向兑换若做**：走 `profile` 货币口径或独立计数；成就/周任务/扫荡发碎片 → 换指定装备。装备目录/分解/兑换价已在 `config/equipment.ts`（`EQUIPMENT_PRICES:79`、`dismantleValueForRarity:107`、`EQUIPMENT_CATALOG:369`）。
- 现有测试 `stores/equipmentSource.test.ts` 已锁掉落 RNG 注入范式（:37/:53/:67 序列 RNG），T4 pity 测试可仿。

---

## C. 新发现的坑

- **C-1（T2 升档一次性）｜v20 是本 Sprint 唯一 bump，furniture + pity 共用**：SPRINT.md 明写「v20 bump 仅在做 furniture/pity 的那轮做一次」。本轮 furniture 升 v20；第 3 轮 pity 若持久化**复用 v20，绝不升 v21**。Planner 本轮就该在 plan 里预告第 3 轮 pity 复用 v20，避免第 3 轮 Generator 误升 v21（历史「文档版本漂移」坑家族）。
- **C-2（T2 口径同源）｜家具 comfort 必须 settle + UI 三处（hourlyYield/projectedYield/nextHourlyYield）同源喂进 computeIdleYield**：现 `homeEffect` computed（HomesteadView:184-188）只 sum 装备；只改它一处不改 settle（userStore.ts:454）→ 预览显示家具加成但结算不发（预览≠实战，P2-17 换域重演）。反之亦然。**两处 sumHomeEffects/effect.comfort 必须同一口径把家具 comfort 并入**——这是本轮最易漏的半迁移点。
- **C-3（T2 摆放模型别绑 WALKABLE_ZONES）｜广场可视化摆放是可选锦上添花，不是验收项**：验收只要「摆放持久化 + 加成进收益」。建议首版做「拥有/摆放清单（给 comfort）」即达标，别为「摆进广场像素位」硬绑 WALKABLE_ZONES（角色漫步区）导致家具与漫步者/建筑重叠 + 需新美术。若真做可视化，用**独立固定槽位常量**，WALKABLE_ZONES 一个字不改。
- **C-4（T2 schema↔config 循环 import 风险）｜furniture 默认态直接内联，别学 facility 从 config import**：`schema.ts:38` import 了 `config/homestead.defaultFacilityLevels`，而 `config/homestead.ts:13` import 了 `@/engine`——链条已较绕。furniture 默认是空态（`{ placedIds: [] }` 之类），`createDefaultFurniture` **直接内联返回空**，别从 config import 制造 schema→config→engine 的更长依赖环（家具目录 `FURNITURE_CATALOG` 放 config 供 store/UI 用即可，schema 的默认工厂不需要它）。
