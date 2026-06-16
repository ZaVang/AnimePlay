# QA Evaluation — Evolution 第 2 轮（E2-T1/T2）

> Evaluator 独立验证。原则：不信 Generator 自报，亲自重跑验收命令 + 抽查源码。
> tier1 on：本决策仅信息性，不终止循环。
> 评估时间：2026-06-16。

## 1. Checkbox 确认（docs/SPRINT.md）

- E2-T1 图鉴定向解锁（经济闭环）→ `[x]`（SPRINT.md:106）✓
- E2-T2 真实评分/放送年可视化（差异化）→ `[x]`（SPRINT.md:109）✓

两项均已勾，符合预期。

## 2. 验收命令重跑（亲自，frontend-vue/ 下）真实输出

| 命令 | 期望 | 实测 | 结论 |
|---|---|---|---|
| `npm run type-check` | 0 错 | `vue-tsc --build`，无输出，退出 0 | PASS |
| `npm run test` | ≥336（自报 340） | **Test Files 29 passed / Tests 340 passed**，Duration 4.11s | PASS |
| `npm run build` | 成功 | `✓ 291 modules transformed`，`✓ built in 7.32s`，无错误 | PASS |

三条验收命令全绿。test 340 与自报一致。

## 3. 自报 vs 实测对比

| 自报 | 实测 | 是否夸大 |
|---|---|---|
| type-check 0 错 | 0 错 | 属实 |
| test 340 passed（29 files，基线 336 → 340，+4 unlockCodex 测试） | 340 passed / 29 files | 属实 |
| build 通过，291 modules | 291 modules，built ok | 属实 |
| 新增 codexUnlock.ts + unlockCodex.test.ts；改 4 源文件；schema/迁移/装配器未动 | git status 完全印证（?? 两新文件，M 四源文件 + 文档，schema 三件套未在改动列表） | 属实 |

**无夸大、无缩水。** 自报「PASSED / test 340」与实测逐项吻合。

## 4. 代码抽查（亲自 Read，逐项属实判定）

### 4.1 定向解锁经济平衡（config/codexUnlock.ts）— 属实，守住原则

定价表 `CODEX_UNLOCK_PRICES`：N 50 / R 200 / SR 600 / SSR 2000 / HR 5000 / **UR 12000**。

- **UR 远贵**：12000 是次高档 HR(5000) 的 2.4x，最高档 ✓
- **阶梯递增**：50 → 200 → 600 → 2000 → 5000 → 12000，严格单调递增 ✓
- **明显高于分解回收**（核对 gameConfig.ts dismantleValue 实值，非取信自报）：
  - 回收实值：N=10(L230) / R=25(L222) / SR=100(L206) / SSR=50(L214) / UR=200(L198)
  - 解锁 vs 回收倍率：N 5x、R 8x、SR 6x、SSR 40x、UR **60x**
  - 每档均显著高于回收，UR 尤甚（60 倍）→ **绝不架空抽卡** ✓
  - 注：项目既有回收价 SSR(50) < SR(100)（因 SSR 概率高于 SR），属历史设定，与本轮无关。

### 4.2 userStore.unlockCodexCard 编排（userStore.ts:251-280）— 属实，关键安全闭环成立

逐行核验：
1. 登录校验（L252 `!profile.isLoggedIn` → return）✓
2. 卡存在校验（L258 `!card` → return）✓
3. **已拥有则拒**（L263-269：`getAnimeCardCount/getCharacterCardCount > 0` → addLog + return，绝不重复入库）✓
4. **关键安全——余额不足绝不发卡**：L271 `if (!profile.spend('knowledgePoints', price))` 返 false 时立即 `return { ok:false }`（L273）。`collection.addCard` 在 L275，**spend 失败的执行流根本到不了 addCard**。完全正确 ✓
5. spend 语义复核（profile.ts:61-66）：`if (core[currency] < amount) return false`——余额不足不变更余额、返 false。链条闭环，**无「余额不足仍发卡」漏洞** ✓
6. 成功路径：spend 成功 → addCard → addLog → **saveToServer()**（门面统一存档，不在领域 store 调存档）✓
7. 完成度纯派生（addCard 后 codex.ts 自动 +1），无手动联动，无新 schema 字段 ✓

诚实化决策属实：自报移除了 `achievements.check('codex')` 空联动（唯一 codex 成就 condition 认 milestoneId，定向解锁场景永不触发）。代码中确无该 no-op 调用，符合 CLAUDE.md「不 ship 宣告效果但不执行的代码」。

### 4.3 解锁不破坏抽卡经济 — 属实

gen_status 称「回收 UR200、解锁 UR12000」——核对 gameConfig.ts:198 dismantleValue 确为 200，codexUnlock.ts UR 确为 12000。量级属实，定价远高于回收（60x），不架空抽卡。

### 4.4 真实数据展示（CardDetailModal.vue 番剧资料区块）— 属实

- 区块整体守卫：`v-if="hasAnimeMeta || hasCharacterMeta"`（L165），全缺不渲染 ✓
- anime 字段：`rating_score`（L169-171）/ `rating_rank`（L174-175）/ `releaseYear`（L177，date.slice(0,4) + 长度守卫）——字段名对得上真实数据 ✓
- character 字段：`anime_count`（L183-184）/ `popularity_score`（L186-187）/ `comprehensive_popularity`（L189-190）——对得上 ✓
- 每字段独立 v-if 守卫（`typeof x === 'number'` / `releaseYear`），缺失不显示该行 ✓
- 颜色语义类：text-accent / text-ink，**新区块无 text-white** ✓

### 4.5 颜色违规扫描（grep "text-white" / "bg-${"）— 无违规

- `bg-${` 动态拼接：**两文件零命中** ✓
- text-white 命中 4 处，逐一确认均为规则明示的合法例外、且非本轮新增：
  - CardDetailModal:146 — 稀有度徽章（配 `bg-gradient-to-r` 稀有度渐变），属「稀有度识别色」例外
  - CardDetailModal:236/294 — `bg-danger text-white`（深红底白字）
  - CodexPanel:225 — `bg-black/60` 黑底白字（图片压片），属例外
  - 本轮新增的番剧资料区块与解锁价标签均用语义类（text-accent/text-ink/text-ink-2），无 text-white 压浅底。

### 4.6 types/card.ts 显式可选字段 — 属实

- AnimeCard 补：`date? / rating_score? / rating_rank? / rating_total?`（L25-29）显式类型 ✓
- CharacterCard 补：`anime_count? / popularity_score? / comprehensive_popularity? / gender? / birthday?`（L38-43）显式类型 ✓
- 不靠裸 any 读真实字段。BaseCard 的 `[key:string]:any`（L13）是历史既有索引签名，自报已声明未触碰，属实（这是 eslint 报的 2 处历史 no-explicit-any 之一，非本轮引入）。

### 4.7 无新 schema 字段 / schema 仍 v6 — 属实

- schema.ts:24 `SAVE_VERSION = 6 as const`，未升版 ✓
- migrations.test.ts 最高分支 version 6（无 v7）✓
- git status 中 schema.ts / migrations.ts / persistence.ts 装配器**均未出现在改动列表**——E2-T1 靠 collection 已有持久化、E2-T2 纯展示，确实未动存档协议 ✓

### 4.8 CodexPanel 解锁交互守卫 — 属实

- `handleUnlock`：`if (card.owned) return`（L103，owned 卡不处理）✓
- 余额不足：alert 提示且不调 unlockCodexCard（L105-107）✓
- 确认：confirm 显示价格 + 当前知识点（L109）✓
- owned 卡不挂可点击态（cursor-pointer/价格标签 v-if 仅未拥有，L214/L229）✓
- 价格颜色：`canAfford ? 'text-accent' : 'text-ink-2'`（L235）语义类 ✓

### 4.9 特征测试覆盖（unlockCodex.test.ts）— 属实，三分支 + 1

mock `@/infra/persistence/api` 隔离网络，4 个测试：
1. 解锁成功：精确扣 600 + count=1 + characterCompletion.owned +1
2. 余额不足（差 1 点）：ok:false / '知识点不足'，余额不变、未入库
3. 已拥有：ok:false / '已拥有'，不扣费、count 仍 1
4. 未登录：ok:false / '登录'

覆盖 plan 要求的解锁成功 / 余额不足 / 已拥有三分支 + 未登录边界，断言到位。

## 5. pitfalls 合规

- 架构铁律：解锁编排在 userStore 门面 + collection（stores 层），未写进 engine ✓
- 存档单一入口：解锁走门面 saveToServer，未在领域 store 调存档 ✓
- 货币只走 spend/earn：解锁用 profile.spend，未绕过 ✓
- 颜色规则：无 text-white 压浅底、无 bg-${} 动态拼接 ✓
- schema 不动：v6 三件套未改 ✓
- 不 ship 假实现：移除 codex 成就空联动，符合诚实化铁律 ✓

## 6. 结构漂移

项目无 docs/project_structure.md，**跳过结构漂移核对**。git status 文件变更与 gen_status 自报一一对应，无意外漂移。

## 7. 失败分析

无失败项。三条验收命令全绿，所有代码抽查点属实，无经济漏洞（余额不足不发卡链条闭环、定价 5-60 倍于回收不架空抽卡）、无颜色违规、无虚假 schema 升版、无 ship 假实现。

## 8. 决策（信息性，tier1 on 不终止循环）

**COMPLETE**

理由：E2-T1/T2 两项 checkbox 已勾；type-check 0 错 / test 340 全绿 / build 通过，实测与自报逐项吻合无夸大；经济安全核心（余额不足绝不发卡、已拥有拒重复、spend 失败 return）代码层面成立；定价守住「UR 远贵(12000)、阶梯递增、明显高于回收(5-60x)」原则，不架空抽卡；真实数据展示字段名正确、v-if 守卫齐全、颜色语义类；types 补显式可选字段；schema 仍 v6 无多余升版；特征测试三分支 + 边界齐全。本轮交付真实、合规、无缩水。
