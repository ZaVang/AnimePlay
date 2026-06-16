# Generator Status — Iteration 2 (evolution)

> 本轮 2 任务全部实现。状态：**PASSED**。验收输出真实（亲自跑）。

## 完成的任务

### E2-T1 图鉴定向解锁（经济闭环）✅
- **新建 `frontend-vue/src/config/codexUnlock.ts`**：按稀有度静态定价表 `CODEX_UNLOCK_PRICES` + `getCodexUnlockPrice(rarity)`。按 plan.md 平衡决策定价：N 50 / R 200 / SR 600 / SSR 2000 / HR 5000 / UR 12000 知识点。每档显著高于分解回收价（回收 N10/R25/SSR50/SR100/UR200，见 gameConfig.rarityConfig.dismantleValue），UR 远贵、阶梯递增，不架空抽卡。N 卡补了一个 50 的低价兜底档（plan 未指定 N，按"阶梯递增、高于回收 10"原则给）。
- **`stores/userStore.ts` 加门面编排 `unlockCodexCard(cardId, domain)`**（照 `purchaseShopItem` 样板）：
  - 登录校验（未登录返 `{ ok:false, error:'请先登录！' }`）
  - 卡存在校验
  - 已拥有则拒（`collection.getAnimeCardCount/getCharacterCardCount(id) > 0` → 不重复购买）
  - `profile.spend('knowledgePoints', price)` 失败 → 日志提示 + 不发货
  - 成功 → `collection.addCard(cardId, domain)` → 日志 → `saveToServer()`
  - 返回 `{ ok, error? }` 供 UI/测试断言（不在门面弹 alert，文案由调用方决定）
  - 完成度纯派生（codex.ts），addCard 后自动 +1，无新 schema 字段。
  - **诚实化决策**：原计划提到可顺带 `achievements.check('codex')` 联动，但唯一的 codex 成就「收藏家」condition 是 `!!p?.milestoneId`，传 `{}` 永不触发——这会是"说一套做一套"的空调用。按 CLAUDE.md「不 ship 宣告效果但不执行的代码」，移除了该 no-op，改为注释说明完成度纯派生不依赖它。
- **`components/CodexPanel.vue`**：灰位未拥有卡加点击 → `handleUnlock`：余额不足 alert 提示、余额够则 confirm（显示价格 + 当前知识点）→ 调 `userStore.unlockCodexCard`。价格按 `item.rarity` 从 config 取。网格头部显示「我的知识点」，每张灰位卡叠加显示「🔓 N 知识点」（够则 text-accent，不够则 text-ink-2）。owned 卡不挂点击。

### E2-T2 真实评分/放送年可视化（差异化）✅
- **`types/card.ts`**：
  - AnimeCard 补 `date?: string; rating_score?: number; rating_rank?: number; rating_total?: number;`
  - CharacterCard 补 `anime_count?: number; popularity_score?: number; comprehensive_popularity?: number; gender?: string; birthday?: string;`
- **`components/CardDetailModal.vue`**：「简介」与「战斗信息」之间插入「番剧资料」区块：
  - anime 卡：Bangumi 评分 `rating_score`（+ `rating_total` 人评分）、排名 `rating_rank`、放送年（`date.slice(0,4)`，正则 `/^\d{4}$/` 守卫非法格式）。
  - character 卡：登场作品数 `anime_count`、人气值 `popularity_score`、综合人气 `comprehensive_popularity`。
  - 每个字段 `v-if="typeof x === 'number'"` / `v-if="releaseYear"` 守卫，缺失不显示该行；整个区块靠 `hasAnimeMeta || hasCharacterMeta` 守卫，全缺时不渲染。
  - 颜色用语义类（text-ink/text-accent/text-ink-2），未学本文件历史 `text-blue-600` 硬编码色。
- 声优维度未做（后端 server.py:44 剥离 main_characters，前端无 actors 数据）——符合 plan 范围。

## 未完成的
- 无。两任务全部完成。

## 验收命令真实输出

```
$ npm run type-check
> vue-tsc --build
（0 错误，无输出）

$ npm run test
 Test Files  29 passed (29)
      Tests  340 passed (340)
   Duration  3.17s
（基线 336 → 340，新增 unlockCodex.test.ts 的 4 个测试）

$ npm run build
✓ 291 modules transformed.
✓ built in 6.45s
（生产构建通过）

$ npx eslint <6 个改/新文件>
仅 src/types/card.ts 2 处 no-explicit-any 报错——经 git stash 验证为既有错误
（第13行 [key:string]:any 索引签名 + 第23行 Record<string,any>，均非本轮新增；
 我新增的可选字段全部干净）。其余 5 文件 0 报错。
```

## 测试覆盖（E2-T1 三分支 + 1）
新建 `stores/unlockCodex.test.ts`（mock `@/infra/persistence/api` 隔离网络）：
1. 解锁成功：精确扣 price（600）+ 入库 count=1 + `characterCompletion.owned` +1
2. 余额不足（差 1 点）：返 `ok:false`/'知识点不足'，余额不变、未入库
3. 已拥有：返 `ok:false`/'已拥有'，不扣费、count 仍为 1（未 count++）
4. 未登录：返 `ok:false`/'登录'

## 新发现的坑
- **codex 成就联动是空联动**：`config/achievements.ts` 唯一 codex 成就 `ach_codex_milestone` 的 condition 只认 `payload.milestoneId`，定向解锁场景没有 milestoneId，调 `check('codex', {})` 必然 no-op。若下轮想让"解锁卡"也给成就，需在 achievements 加一条按 collection 派生计数的新成就（event 可复用 'codex' 但 condition 读 stats 而非 milestoneId），或新增 'unlock' 事件。本轮按诚实化原则不留空调用。
- card.ts 的 2 处 `no-explicit-any` 是历史既有（index 签名 + effects.params），本轮未触碰、未新增；如要清零需单独立项（会影响裸读真实字段的现有代码）。

## 文件结构变更自报
- **新增**：
  - `frontend-vue/src/config/codexUnlock.ts`（定价表 + getter）
  - `frontend-vue/src/stores/unlockCodex.test.ts`（E2-T1 特征测试）
- **修改**：
  - `frontend-vue/src/stores/userStore.ts`（import getCodexUnlockPrice + unlockCodexCard 编排 + facade 导出）
  - `frontend-vue/src/components/CodexPanel.vue`（解锁交互 + 知识点显示）
  - `frontend-vue/src/types/card.ts`（AnimeCard/CharacterCard 补可选字段）
  - `frontend-vue/src/components/CardDetailModal.vue`（番剧资料区块 + meta computed）
  - `docs/SPRINT.md`（E2-T1/T2 `[ ]` → `[x]`）
- **未动**：schema（无新存档字段）、迁移、装配器。

## 状态
**PASSED** —— 两任务全实现，type-check 0 错 / test 340 全绿 / build 通过；定价守"UR 远贵、阶梯递增、高于回收"原则；颜色语义类、走门面存档、无新 schema、三分支测试齐全。
