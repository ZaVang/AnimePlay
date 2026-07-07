# Pitfalls 知识库

> product-loop / multi-ralph 全角色必读。踩过的坑追加在此，避免重复。

## 架构铁律（违反 = lint 闸拦死，见 FUTURE.md 顶部）
- **engine 纯净**：`frontend-vue/src/engine/` 零 Vue/Pinia/DOM/fetch/localStorage/`Math.random`。鉴权/网络/存档 IO 绝不能写进 engine——属于 `infra/persistence` 与 stores 编排层。
- **依赖只向下**：`views → components → stores → engine`。下层不 import 上层。
- **RNG 可注入**：engine 内随机源靠注入，别直接调 `Math.random()`。

## 存档 / 持久化
- 存档协议当前 **v12**（v4=皮肤装扮、v5=saveVersion 乐观并发、v6=每日任务/图鉴里程碑/成就、v7=周任务/连签、v8=高低牌、v9=Quiz、v10=每日挑战、v11=每日挑战 streak、v12=tasteProfile 持久化）。**权威值在 `infra/persistence/schema.ts:30 SAVE_VERSION`——文档只指向不复述**（此条曾从 v6 漂到 v12，引用集中到 schema.ts 避免再漂）。新增字段必须**三处同改**：`infra/persistence/schema.ts` + `migrations.ts` + `stores/persistence.ts` 装配器，并补迁移测试（旧档缺省值），**不破坏现有往返保真测试**（`migrations.test.ts`）。
- 前端已有 **S5 保存串行合并**（同一时刻至多一个写请求，连发坍缩为一次）——堵的是单客户端并发。后端写文件仍**非原子**，多客户端/异常截断要靠后端原子写（temp + `os.replace`）解决，这正是 S10-T3。
- 全仓唯一与 `/api/user/data` 对话的地方是 `infra/persistence/api.ts`——加鉴权头只改这一处传输层，别散到各 store。

## 后端
- 两个后端变体：`backend/server.py`（本地，端口 5001）与 `api/index.py`（Vercel serverless，`/tmp` 易失）。鉴权/debug/原子写**两处都要改**，保持一致，否则 serverless 部署仍有洞。
- 用户名校验现为 `username.isalnum()`（后端）/ 前端 `^[a-zA-Z0-9]+$`。加鉴权别破坏这个白名单（防路径穿越）。
- 现有 4 个 passwordless 存档（`data/user_data/*.json`）：鉴权方案需「首次登录认领」兼容，别让老存档登不进去。
- 后端目前**无测试基建**（只有 `test.ipynb`）。新增 `backend/test_security.py` 用 Flask `app.test_client()` 自包含跑（退出码 0/1 + 打印 PASS/FAIL），不引入 pytest 依赖，便于 Evaluator 一条命令复验。

## 前端工程
- 测试用 `npm run test`（vitest）。**不要跑 `npm run lint`**（带 `--fix` 会全仓重排）；单文件用 `npx eslint <path>`。
- 验证含 `npm run build`（type-check + 生产构建），S7 起纳入。改鉴权别让 build 挂。
- 颜色规则：界面色用语义类（`bg-surface/text-ink/accent`）或 `rgb(var(--c-*))`，登录框加密码字段时沿用，**禁止 `text-white` 压浅底、禁止拼接动态颜色类**。

## product-loop 通信
- **合同路径按当轮启动参数为准**（历史某 sprint 曾用 `docs/SPRINT.md` + `--tier1 off`；**当前 S16 用默认 `docs/plans/SPRINT.md` + `--tier1 on --mode all`**，有三审报告 + negotiation.md）。别照搬旧笔记里的路径/tier1 设定。
- tier1 on 时：Reviewer 审计报告在 `docs/orch/{product,evolution,research}-audit-report.md`，Planner 回应在 `docs/orch/negotiation.md`，本轮计划在 `docs/orch/plan.md`。

## S10 沉淀（2026-06-16 完成后追加）
- [依赖] `requirements.txt` 只钉 Flask 不钉 Werkzeug → fresh install 拉 Werkzeug 3.x（移除 `__version__`）与 Flask 2.3.2 不兼容（test client 炸）。**Flask 与 Werkzeug 必须成对钉版本**（已钉 Werkzeug==2.3.8）。
- [鉴权] 凭据存 `data/auth/credentials.json`（werkzeug 盐哈希），**绝不进 user_data 存档**（客户端 payload 全量覆盖写=可篡改 auth）。token 用 itsdangerous 无状态签名（SECRET_KEY env），serverless 多实例也成立。
- [鉴权] 读写存档的 token 闸：从 `Authorization: Bearer` 解析 username，须 == 目标存档 username，否则 401。前端 token 只挂 `infra/persistence/api.ts` 一层；login 失败要清半登录态。
- [并发] saveVersion（保存计数，乐观并发）≠ schema `version`（协议版本，现 12，权威在 `infra/persistence/schema.ts:30`）。后端权威递增、客户端基线 ≠ 服务端当前 → 409；前端 `currentSaveVersion` 随 load/save 更新。
- [原子写] 存档/凭据落盘用 `mkstemp + fsync + os.replace`（同目录），别用 `open(w)` 直接覆盖（写中断留损坏 JSON）。
- [测试] 后端自检 `backend/test_security.py` 用 Flask test_client + tempdir + env（USER_DATA_DIR/AUTH_CREDENTIALS_PATH/SECRET_KEY）隔离，不引 pytest、不写真实 data/。跑它用 `./.venv/Scripts/python.exe`（系统 python 没装 Flask 依赖）。
- [orch] 长跑 subagent（Scout/Generator）在本机偶发 socket 掉线；掉线后 git diff 可见已改动，orchestrator 可接管续做，不必整轮重来。

## Evolution 三轮沉淀（2026-06-16，经 /product-loop --mode evolution）
- [留存埋点] 「基于玩法事件」的新功能（任务/成就/统计）统一挂在 6 个玩法成功点：5 个在 `userStore` 编排函数（drawCards/collectFromViewingQueue/养成 withSave/submitGuess/completeFloor）的现有 saveToServer() 前，**对战胜利唯独在 `battleFlow.endGame` 的 isLoggedIn 块内、winner==='playerA' 时**（不在 userStore，易漏）。新功能复用这套埋点，别再改编排函数。
- [图鉴派生] 完成度是从 `collection`（已拥有 Map）⊆ `gameDataStore.allXxxCards`（全量）纯派生的 computed，**总数一律 `.length`/filter 不硬编码 665**（数据会增减）。"拥有"用 collection 计数不用 favorite。
- [经济出口] 图鉴定向解锁定价（`config/codexUnlock.ts`）须守"UR 远贵、阶梯递增、明显高于分解回收"——别便宜到架空抽卡。解锁流：`spend('knowledgePoints')` 成功才 `addCard`，余额不足/已拥有拒绝（经济安全）。
- [设备级状态] onboarding 首登标志用 **localStorage**（设备级，仿 theme.ts try/catch），不进存档、不升 schema——不是所有"记住一次"都要进存档协议。
- [纯前端出图] 成绩卡/分享图用标准 Canvas（`toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`），**别引 html2canvas**；首版别嵌远程封面图（cross-origin canvas taint 会让 toBlob 抛错）。聚合逻辑抽成纯函数（`wrapped/buildWrappedStats.ts`，零 Vue/Pinia/DOM）便于单测。
- [真实数据] 卡数据有 Bangumi 真实 `rating_score/rating_rank/date`（anime）、`anime_count/popularity_score`（character），`BaseCard` 有 `[key]:any` 索引签名故裸读不报错，但补显式可选字段（types/card.ts）更安全。**声优数据 `main_characters[].actors` 被 `server.py` 服务时剥离，前端拿不到**——声优维度需后端配合。

## Product-Loop 5 轮沉淀（2026-06-24，`--mode all --max-iter 5`，"收集→策展番剧人格"主线，全程零存档）
- [未定义令牌双形态] 「不报错但默默坏色/丢圆角」的静默缺陷有两种形态都要查：scoped CSS 里 `var(--c-ink-soft)`（未定义变量）**和** 模板工具类 `text-ink-soft`（未定义 Tailwind 工具类，config 只映射 `ink/ink-2/ink-3`）。审色时**两种 grep 都跑**。真令牌：`--c-line`（非 --c-border-line）、`--c-ink-2/-3`（非 --c-ink-soft）、`--sk-radius-panel/-control`（裸 `--sk-radius` 未定义、但有 fallback 只丢圆角不坏色）。
- [硬色连根拔] 养成/挑战塔簇硬编码色债的根因是 `bondLevel`/`moodStatus` 调色板在多文件重复定义（CharacterProfile + CharacterSelector + InteractionPanel）。正确姿势=抽**共享语义令牌色映射**（`config/nurtureColors.ts` 纯函数）统一消费，**整函数重写**，别逐处 grep-replace（partial-migration 陷阱：部分档已半语义化，逐处替换会留半语义半硬色、复发）。5 套皮肤都定义 accent/warning/success/danger/info/highlight，足够映射这些语义。rarity 渐变/danger 实底白字属固定例外。
- [统一弹窗] 项目原**无通用 Modal/Dialog 组件**，原生 `confirm()/alert()` 18 处散落。统一弹窗（`composables/useDialog.ts` Promise 形态 + `components/AppDialog.vue` App 顶层，语义令牌 + Esc/Enter）须**新建**。替换时注意 2 个同名局部函数（CardSelectionModal/TypeSelectionModal 的 `confirm()`）不是原生调用别动。
- [共享门面收重复] 4 处「定向解锁确认」逐字重复——抽 `composables/useUnlockConfirm.ts`（**须带 `domain` 参数**，CodexPanel 是双域）让替换从改 4 处变改 1 处。门面以 store `unlockCodexCard(id,domain)` 的 `{ok,error}` 返回为准，**别双重守卫**（store 已内建余额/已拥有校验）。
- [看过双源统一] 曾有两套互不相通的「看过」：`viewing.watchedAnime`（观看队列写→首页读）与 `minigames.tasteWatchedIds`（品味画像写→人格/推荐读）。统一**靠消费端纯派生 union computed**（`composables/useWatchedAnime.ts`，两 store 不互 import），写侧不动、**零升档**——不是所有"统一真相源"都要升 schema。详情看过开关的**显示态读 union、写仍走 `toggleTasteWatched`（写手动集）**，否则图鉴印章/详情口径打架。
- [推荐排除契约] `recommendFromSeeds` 默认只排种子本身——做"为你推荐"必须传 `excludeIds = 已拥有∪已看`，否则把已有的番推回去破坏契约。
- [图表不进 Canvas] vue-chartjs（雷达/柱图）是 **DOM 组件，绝不能塞进 ShareCard 的手绘 Canvas 出图**（`toBlob` 会坏）。雷达只注入屏幕渲染区（报告页/主页 chip）。chartjs **datalabels 全局已注册，雷达数据集需 `datalabels:{display:false}`** 否则顶点糊数字；注册/用法仿 `GachaHistory.vue` 样板（chart.js@4.5 + vue-chartjs@5.3 已是直接依赖）。
- [展示墙非待办地狱] 完成度类长线系统（题材集册）做**纯派生展示墙**：完成度+段位纯派生、**不发奖/不记已领/不持久化、绝不复用图鉴里程碑领取制 `claimedMilestones`**（复用=升 schema）。按 persona 专精轴（`buildTasteReport().topTags`）排序、不强制集满、无 FOMO 倒计时——否则触发 completionist burnout。集册蓝图=复用 `codex.completionFor().byRarity` 切桶纯派生换 `byGenre`。
- [题材桶剔噪] 题材集册/标签聚合的桶 keys 用**剔噪版** `contentIndex.tagToAnime.keys()`（已记忆化，过滤 日本/TV/OVA/漫画改 噪声），**别用** `CodexPanel` 的裸 `allAnimeTags`（会冒「TV 集册」废桶）。968 可玩池剔噪后只 ~35 个真题材标签（非几百），按桶规模取前 15-22 即可，无需复杂稀疏过滤。
- [保底现状] 抽卡**只有 70 硬保底**（`gameConfig.ts`，`gachaStore.animePity/.characterPity.pullsSinceLastHR`），**没有软保底**——保底进度做单条进度条即可，别造不存在的软保底 UI。软保底/carry-over/心愿单要升 schema，属独立轮次。
- [嵌套 modal 陷阱] `RecommendationStrip` 自带 `CardDetailModal`，"相似作品"**不可**在详情里直接嵌它（会叠三层 modal）——走**详情页内导航/替换内容**（CardDetailModal 用 `viewCard` ref 替换 `props.card` 驱动派生）。
- [setTimeout 假安全] `onUnmounted` 只清 `setInterval` 不清 `setTimeout` = false safety。所有 setTimeout/setInterval 必须登记数组 + onUnmounted 清除（仿 SquadBattleView `schedule()`）。NurtureActions 曾漏一个 60min setTimeout。
- [存档进存档字段勿删] `genreProgress` 是进存档字段（player.ts/viewing.ts/migrations.ts 四处），"显示源收口"只能改消费端读源（改读 `buildTasteReport().topTags`），**删字段=升档**。
- [文档版本漂移] 存档版本号以 `schema.ts` 顶部 `SAVE_VERSION` 为唯一权威（现 **v12**）。曾经 CLAUDE.md 漂到 v11、pitfalls.md 漂到 v6。文档**引用 schema.ts:30 别复述版本号**，免再漂。
- [设备级轻意图层] 「正在追」Pin 用设备级 localStorage（`stores/watchingPins.ts`，仿 onboarding try/catch，MAX_PINS 上限），不进存档——规避重 wishlist 升 v13 的成本，拿 80% 留存价值。
- [JSDoc 别写 Tailwind opacity] `bg-*/20` 这类含 `*/` 的字面量写进 `/** */` 块注释会提前闭合注释。
- [orch 提交边界] product-loop 多轮在分支上层层叠加未提交改动（orchestrator 不每轮 commit）——后一轮 Generator 会看到前轮未提交产物，属正常累积非脏树。提交/合并由 orchestrator 收尾或用户决定。

## S13-C1 沉淀（2026-06-29，养成精简→加点制 + 装备占位 + 存档 v14）
- [迁移] 删字段的瘦身迁移（如 v14 `migrateNurtureData` 把养成砍成两轴）必须**白名单重建对象**返回，**不能 spread 浅拷贝旧档**——否则删掉的旧字段（attributes/battleEnhancements/trainingCooldowns…）会随 spread 漏进新档。用 `migrations.test.ts` 的 `not.toHaveProperty` 守这条。
- [测试纪律/orch] **别在主工作树用 `git stash` 测「改动前基线」**——会把整轮未提交产物（含组件删除）一并收走，subagent 掉线忘 pop 会显得"工作全没了"。要对比基线用临时 worktree 或 `git archive HEAD`（不污染工作树）。
- [养成重构] 养成已砍成**两轴**：等级（经验自动升，升级 roll `POINTS_PER_LEVEL=10` 随机加点到 5 战斗维 `statPoints`，engine 注入 RNG）+ 好感（关系仪表 / 6 档里程碑，**不接战力**）。战力 = **纯加法** `base + statPoints + equipBonus`（`combat.generateBattleStats(base, statPoints, equipBonus)`）。装备(C2)未做时 equipBonus 传恒 0。训练/活动/对话/礼物/心情及 `components/nurture/` 全删——别再引用。`STAT_DISPLAY_REF`/`BOND_MILESTONES`/补习成本在 `config/nurture.ts`；SAVE_VERSION 升 v14（权威仍在 `schema.ts:30`）。

## S13-C2 沉淀（2026-06-29，装备系统全栈，product-loop --tier1 off 1 轮 COMPLETE）
- [vue 模板 prop 禁用裸名 `slot`] 组件 prop 起名 `slot` → 模板 `:slot=` 被 `vue/no-deprecated-slot-attribute` 误判为废弃 slot 语法（eslint error）。装备/槽位组件 prop 用 `equipSlot`（模板 `:equip-slot=`）等非裸名。
- [engine 不 import config] 装备相关 engine 纯函数靠**注入**、不反向依赖 config：掉落 `rollTowerDrop(floor, rng, rarityForFloor)` 把「层段→稀有度映射」作参数；`sumStatBonus(bonuses[])` 收已解析的 bonus 数组。查表/边界留 config/store，engine 零 `@/config` import。
- [Tailwind 透明度用 / 别用 \\] `bg-accent/15` 才对，`bg-accent\\15`（反斜杠）是无效类、JIT 静默不生成不报错（「未定义令牌静默坏色」家族，同 C1 barColor）。审色顺手 grep 反斜杠+数字。
- [装备系统] 装备目录在 `config/equipment.ts`（3 槽 weapon/armor/supporter × R..UR，名值可调）；实例 `{uid(crypto.randomUUID), defId}` 入 v14 equipment 域（C2 不升档）；战力 equipBonus 在 SquadBattleView 与 NurtureView/配装弹窗**必须同源 `resolveEquipBonus`**（否则 delta 预览与实战不符）；塔掉落挂 `pve.completeFloor` 的 `true` 返回（非当前层返回 false，天然防刷低层）；KP 兑换走 `profile.spend`；背包内嵌 NurtureView（未加路由）。
- [装备扩容候选池] 当每槽每稀有度不止一件时，塔掉落不能继续 `find` 第一件，否则扩容只服务商店、不服务掉落；命中后用 `getEquipmentDefsBySlotRarity(slot, rarity)` 候选池 + 注入 RNG `pick` 选择具体装备，并补序列 RNG 测试锁住第三个随机值。

## S14-A 沉淀（2026-07-01，家园 hub 深化 P1 急救，product-loop --tier1 on --mode all，3 轮 + 1 纠偏轮）
- [敌人预览必须与实战同源] hub 探索预览与 SquadBattleView 实战敌人**必须走同一确定性种子** `towerFloorEnemySeed(floor)`（engine，单一真相源）——历史 bug：预览用种子 RNG、实战用 `Math.random` → 预览≠实战。改同源后**「刷新敌人」按钮必须一并删除**（确定性下刷新返回同一批=新困惑）。
- [升级加点确定化] 升级加点走 `distributeStatPointsByBase(base, points)`（engine 纯函数，Hare 最大余数：~30% 均分保底 + ~70% 按角色 base 五维比例倾斜），**不再随机、不依赖 `inferArchetype`**（正则频繁误判，绑上去会把「战斗模板误判」扩散成「成长倾斜误判」）。旧档已 roll 的 statPoints 不动、只影响未来升级（不升 schema，此取舍是有意的）。
- [squad 差异化 = 纯数据覆盖，描述自动派生] 角色小队技能差异化走 `SIGNATURE_KIT_OVERRIDES`（`data/squadSkillKits.ts`，当前 **10 个招牌 UR**）：**只提供结构化 `effects`，description 一律由 `describeSquadSkill` 自动派生（严禁手写 description）**——把「描述≠行为」红线在 squad 域结构性锁死。**严禁复用 /battle 的 effectId**（卡牌辩论语义与 squad 声明式 SkillEffect 是两套不通的运行时）；覆盖只用有限的 9 种 squad SkillEffect，未命中回落原型模板。**残留隐患**：技能「名」仍是自由文本、与 effect 零绑定（「名字≠行为」换皮点），后续可加 CI 守卫断言「签名技能机制指纹 ∉ 其原型指纹」+「override.role === inferArchetype(角色)」。
- [扫荡日循环独立于通层] 扫荡已通层（`pve.sweepFloor`）是**独立 action，绝不调 `completeFloor`、绝不推进 currentFloor**；只读 `hasCompletedFloor`。奖励为首通的缩水（30-50%，边际递减防 AFK 死区），**用周期封顶**（`sweepWeekKey` + `sweepUsedThisWeek`，扁平定长字段，跨周归零，复用 `daily` 跨天/周判定），非逐层 Record（防膨胀）。存档 v15：schema+migrations+装配器三处同改 + 往返测试。
- [hub 内嵌 SquadBattleView 直达进战] 消除三 tab 冗余（Plan A）：squad tab 唯一编队入口、explore「开始挑战」带 squadId 直达、battle tab 仅演出。`SquadBattleView` 加 `entrySquadId/embedded` props + `exit-to-explore` emit；`embedded=true` 时**模板里「最小占位」分支必须排在完整 towerMode 编成器分支之前**（`v-else-if` 短路使整套编成器不可达）——否则深链/刷新 `?tab=battle` 会复活第三套编成器，SA-T6 白做。
- [product-loop 编排坑：别把 Sprint 内任务误判为「新范围」] 第 3 轮 Planner 把 SA-T6（S14-A 的第 6 个任务）误当「不开新范围」跳过，导致 max_iter 跑满但目标只完成 5/6、Evaluator 却报 COMPLETE。教训：Planner 提示里的「不开新范围」指「不超出 Sprint 合同」，**Sprint 合同内的未完成任务永远是 in-scope**；tier1-on 跑满轮次 ≠ 目标达成，Orchestrator 必须核对「合同全部 `[x]`」而非只看末轮 Evaluator 决策。

## S16 第 1 轮沉淀（2026-07-07，家园 hub 关系回路，product-loop --tier1 on --mode all --max_iter 5）
- [先接地再规划：好感不是「通往虚空」] 三审一致断言「家园产好感却无消费端」，Scout 查证发现**养成域早有完整消费端**：`config/nurture.ts` 的 `BOND_MILESTONES`（6 档：阈值/一次性 KP/称号/永久加成%）+ `isMilestoneClaimable` 纯函数 + `claimedBondMilestones`（v14 已存档）+ 每日羁绊互动 `dailyBondInteraction`/`canDailyBondInteract`（`DAILY_BOND_INTERACTION_AFFECTION` + `lastBondInteractionDate` v16）。真缺口是「关系机制**只在养成页显形、没搬进家园**」+「缺情感/叙事层（全仓无角色台词数据）」。**教训：审计报告的「缺失 X」断言必须经 Scout 代码接地核实，X 常已存在只是没接通/没显形——复用不重造，零升档。**
- [userStore 门面已备关系动作] `userStore.claimBondMilestone(charId, milestoneId)`/`dailyBondInteraction(charId)`/`canDailyBondInteract` 已存在且内部 `saveToServer`——家园侧接关系功能直接调门面，**别在 view 里绕过门面直改 nurture store**（门面统一存档 + 同源）。
- [家园 tap = 复用养成每日互动，共用同一每日封顶] 广场角色 tap 互动走 `dailyBondInteraction`，与养成页每日互动**共用同一 `lastBondInteractionDate` 跨天闸**——是同一次每日机会（非各给一次），防两入口刷双倍好感。这是「同源」正确语义，别为家园单造第二个每日 tap 字段。
- [台词层纯展示红线] 情感/叙事台词做成**纯 config**（`config/homesteadDialogues.ts`）：纯函数 `pickTapDialogue`/`pickMilestoneDialogue` 按 index modulo 取句、缺专属回落通用池不报错，**绝不携带数值效果/绝不驱动奖励**（奖励只由 nurture 既有数值逻辑决定）。把「名字≠行为」换皮点在台词域结构性锁死（对齐 S14-A squad 教训）。
- [pet 气泡等场景浮层用 surface 卡片非白字压图] 广场角色头顶台词气泡用 `rgb(var(--c-surface))` 卡 + `rgb(var(--c-ink))` 文（语义令牌）；只有 `pet-name`（短名压在写实底图上）沿用既有 `#fff` 压图例外。含长句的气泡别用白字压图（可读性 + 令牌纪律）。
- [button 不可嵌 button] 入住名单 pill 原为单 `<button>`，加子「领取」按钮须外层改 `div` + 内层 `resident-main` 按钮 + 同级 `resident-claim` 按钮（否则嵌套交互元素非法 HTML）；同步把 CSS 从 grid-areas 改 flex column。
- [product-loop 子 agent 本机批量 stall] 本轮一 reviewer + Planner + Generator + Evaluator 均「API Error: Response stalled/Connection closed mid-stream」掉线；掉线前 git diff/已写文件可见，orchestrator 接管续做即可。**教训：重型/长跑阶段优先用 Workflow 工具（内建 retry-on-terminal-API-error）跑，比裸 Agent 后台调用抗 stall。**

## S16 第 2-5 轮沉淀（2026-07-07，家园 hub 关系深化→家具→陈列→打磨，全程 Workflow 流水线、零升档）
- [Workflow 跑 product-loop 五阶段抗 stall] 第 2-5 轮用 Workflow（Review×3 ∥ → Scout → Plan → Generate → Evaluate）跑：第 2 轮 research/scout 两阶段中途掉线，但 retry/降级让流水线跑完、关键阶段全产出；第 3-5 轮 7 agent 零掉线。**比裸 Agent 后台调用可靠得多。** 注意：**Workflow 脚本是纯 JS——模板字符串（反引号定界）内绝不能再用反引号做代码标注**（会提前闭合模板→解析错误，`node --check` 先自检）；代码标识符用「」或裸文本。
- [广场偶遇 = pet-to-pet 邻近检测，纯 view 层] 第2轮同作品角色广场偶遇对话：漫步 tick 里加 pet-to-pet 邻近检测（`Math.hypot` 原只算 pet→目标），命中同作品对触发「驻足→A 冒句→~1.2s B 错峰回句→中点上浮 ♡/✧/♪→散开」。**偶遇纯展示零好感、冷却纯内存 Map<pairKey,ts> 零升档、engine 零改**（配对复用 `engine/homestead/bonds.ts` 的 `anime_names` 稳定键 `computeBondPairs`）。三审一致划红线「绝不为偶遇引入 CP 关系值/进度条数值轴」。
- [多气泡并发模型] 单值 `petBubble` 升成按 petId 索引的 `Map<number,PetBubble>` 才能支撑两角色错峰对话；硬性要求 tap 无回归（仍走 `dailyBondInteraction` 同源每日封顶）。所有 setTimeout 登记 composable 内 `timers[]` + onUnmounted 清除。
- [家具进场景零素材 emoji + y-sort] 全仓无家具美术资源 → 家具进广场用 **emoji + 名牌**（`FurnitureDef.icon` 纯展示字段 + `FURNITURE_SLOTS` 坐标常量，零升档）。**家具必须接进角色同一 y-sort 公式 `zIndex=Math.round(y*10)` + 脚点锚定**，别做固定背景层；家具是纯派生静态层**绝不进 rAF 循环**。comfort 数值轴（`sumFurnitureComfort`→`computeIdleYield`）一字不碰。
- [收藏陈列 = 只读 completion，禁碰 claim] 家园收藏橱窗只读 `codex.characterCompletion`（纯派生 computed），**绝不碰 `codex.claim`/`claimedMilestones`**（领取制=升 schema + 撞「展示墙非待办地狱」红线）。0 UR 优雅降级（最高稀有度墙/引导态），**绝不做「UR 0/N」缺口条**（晒身份不晒缺口，正着念拥有数）。
- [回访新鲜 date-seeded 派生免存档] 「今日特殊角色」= `pickTodaySpecialId(todayKey + 排序后入住名单 → mulberry32)`（`config/homesteadDaily.ts`），**同天恒定/跨天换人/顺序无关/零存档**。⚠️ date-seed 取 id 必须从**排序后的稳定副本**取（否则入住顺序变→今日特殊角色跳，特征测试锁死）。`daily.ts` 的 `todayKey()` 私有未导出 → view 内联同款 `YYYY-M-D` key（零改 daily）。「双倍好感」做不到零碰养成（`dailyBondInteraction` 好感增量写死常量无参数）→ 收窄为纯情感（今日标识+特殊台词、tap 走标准好感），别为双倍碰 nurture。
- [纯前端晒图 Canvas 无远程图] 家园快照分享图：复用现成三件套 `wrapped/buildXxxStats.ts`(纯函数聚合) + `ShareCard.vue`(Canvas 手绘) + `shareImage.ts`(toBlob IO)。**绝不 drawImage 远程角色图**（cross-origin taint→toBlob 抛错）——角色脸用「名字首字自绘」代替。**无基地名字段**（`stores/homestead` 只有 placedCharacterIds+lastSettleAt）→ 主标题走 `profile.currentUser`「XX 的家园」，别为装饰字段耗 sprint 唯一 v21 bump。聚合抽纯函数便于单测。
- [里程碑庆祝分级] `onClaimBondMilestone` 原给 bond_1「初识」和 bond_6「命运」相同飘字 → 抽纯函数 `milestoneCelebrationTier`（白名单，按 `BOND_MILESTONES` statBonusPct 0.02/0.03 + reward 跳变分层）：低档 High-Five 轻飘字 / 高档 bond_4-6 Crowning 隆重弹层（复用 `.settle-pop`+CharacterAvatar+dialogueTimers 清除，CSS 动效不进 rAF）。纯展示零发奖。
- [五轮零升档纪律成立] S16 全 5 轮 15 任务全程 SAVE_VERSION=20 零升档、从未污染 `computeIdleYield`：情感/关系/偶遇/陈列/回访/晒图**全部纯派生或纯展示**，验证了「在数值口径旁开非数值情感/收集轴」这条设计哲学。sprint 唯一 v21 bump 五轮未消耗（偶遇图鉴去重等真需持久化的候选全判低价值留 backlog）。测试基线 917→1009（+92）。
