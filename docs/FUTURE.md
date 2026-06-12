# AnimePlay 重构与演进 Roadmap

> **这是项目的单一任务源。** 按 Sprint 顺序一个个做，完成打勾。每个任务的「为什么/证据」见 [项目审计报告-2026-06-12.md](项目审计报告-2026-06-12.md)，本文只管「做什么、到哪了」。
>
> 用法：开工前看「进度总览」找当前 Sprint → 做完勾掉任务 → 一个 Sprint 的 Exit 全满足就把它标 ✅。

## 🎯 终点与铁律

**终点**：多人 + 排行榜 + PvP 的可上线游戏。

**四条贯穿始终的架构铁律**（每个 Sprint 都不能违反）：
1. **engine 纯净**：`src/engine/` 只有纯游戏逻辑，零 Vue / Pinia / DOM / fetch / localStorage 依赖。它是将来与服务端共享的那层。
2. **依赖只向下**：`views → components → stores → engine`，下层绝不 import 上层。engine 出现 `import @/stores` = 架构破窗，靠 lint 闸拦死。
3. **RNG 可注入**：engine 内不直接调 `Math.random()`，随机源作为依赖注入（为 PvP 防作弊 + 服务端权威 + 可测试）。
4. **Sprint 独立可合并**：每个 Sprint 做完，游戏都处于可玩状态，即使后面的不做也不破。

目标目录结构与分层详见审计报告第三节及架构讨论（engine / types / config / data / infra / stores / composables / components / views / lib）。

**状态图例**：☐ 未开始 · 🔄 进行中 · ✅ 完成

---

## 📊 进度总览

| Sprint | 主题 | 状态 | 阶段 |
|---|---|---|---|
| S0 | 文档重构 | ✅ | 已完成 |
| S1 | 测试安全网 & 架构骨架 | ✅ | 已完成 |
| S2 | engine 抽取：宅理论战 | ✅ | 已完成 |
| S3 | engine 抽取：抽卡 & 挑战塔 | ✅ | 已完成 |
| S4 | engine 抽取：技能 & 养成 & AI | ✅ | 已完成 |
| S5 | 拆 god store & 持久化 | ✅ | 已完成 |
| S6 | 功能闭环 | ✅ | 已完成 |
| S7 | 视觉还债 & 皮肤系统 | ✅ | 已完成 |
| S8a | 技能真实现：机制地基 + 诚实化 | ✅ | 已完成 |
| S8b | 技能真实现：纯原语内容批 | ☐ | 补完 |
| S8c | 技能真实现：系统技 + 交互技 | ☐ | 补完 |
| S9 | 性能优化 | ☐ | 上线前置 |
| S10 | 后端加固 & 安全 | ☐ | 上线前置 |
| S11 | React 视图迁移 | ☐ | 演进 |
| S12 | 权威后端 & 多人/PvP/排行榜 | ☐ | 终点 |

> S1–S6 已细化、可直接执行；S7–S10 中等粒度；S11–S12 为方向（到达时再 `/think` 细化，依赖届时的决策）。

---

## ✅ S0 — 文档重构（已完成 2026-06-12）

- [x] 删除 4 份过时文档（旧前端/错误数值）
- [x] 归档 4 份历史 snapshot 到 `docs/archive/`
- [x] 小修 2 份（战斗系统 / UR技能）、更新 2 份（开发计划 / 前端界面）
- [x] 新建 5 份机制文档（抽卡 / 挑战塔 / 养成 / 猜角色 / 主题）
- [x] 新建根 README、docs 索引；重写前端 README、CLAUDE.md
- [x] 产出审计报告 + 本 Roadmap

---

## ✅ S1 — 测试安全网 & 架构骨架（已完成 2026-06-12）

**目标**：在动任何逻辑前铺好回归保护和边界闸，让后续重构「不瞎飞」。

- [x] 引入 vitest 4，配 `npm run test` / `test:watch`（node 环境，纯逻辑测试）
- [x] 特征测试 **5 文件 56 个**：`battleCalculator`（曲线/伤害/连击/下限/养成联动）、`RewardCalculator` 四张结果表逐格锁定 + 分档边界、`BattleEngine.resolveClash`（薄测试，空 Pinia 搭台——完整纯函数化随 S2）、抽卡（6000 抽分布/70 抽保底/66% UP 替换/十连保底 SSR，种子化确定性）
- [x] `engine/rng.ts`：RNG 接口 + `defaultRng` / `createSeededRng`(mulberry32) / `createSequenceRng`；保底测试已用种子断言「必出 UP」
- [x] 骨架目录 `engine/ infra/ lib/ composables/` 各带章程 README；`engine/index.ts` 注明迁入计划
- [x] 依赖方向闸：用 **ESLint 内置规则**实现（`no-restricted-imports` + `no-restricted-globals` + `no-restricted-properties`，零新增依赖，比 dependency-cruiser 轻）——engine 禁 import stores/components/views/infra/vue/pinia，禁 Math.random/fetch/DOM/localStorage；lib 同类约束。绊线验证：违规文件 3 类错误全拦截
- [x] 清死代码：`stores/counter.ts`、`components/CollectionStats.vue`、4 个零引用英文技能 stub（KURISU_*/SENJOUGAHARA_*；有引用的 `NEXT_CARD_ANY_TYPE`/`BIAS_HALVE_OPP` 保留）；移除错配的 `@types/chart.js`

**Exit 达成**：56 测试全绿；绊线文件被 lint 拦下（exit 1，3 类错误）；`type-check` 0 错。
> 移交 S4 的发现：`skills/effects/index.ts` 有 18 处历史 lint 债（unused `ctx` 参数，S1 之前已存在），随技能系统重构一并处理。

---

## ✅ S2 — engine 抽取：宅理论战（已完成 2026-06-12）

**目标**：把宅理论战规则搬进 `engine/battle`，与 Pinia 解耦，打破循环依赖。

- [x] `TurnManager` 规则部分 → `engine/battle/turn.ts`（回合 TP/胜负判定/终局/轮换纯函数）+ `setup.ts`（技能解析链/卡组装配）
- [x] `BattleEngine` → `engine/battle/clash.ts`（强度由调用方传入或回退卡面点数）；`StrengthCalculator` → `strength.ts`（光环加成纯函数化）
- [x] `RewardCalculator` → `engine/battle/rewards.ts`
- [x] `ResourceManager` → `engine/battle/resources.ts`（洗牌改注入 RNG）；`core/battle`、`core/calculation`、`core/ai` 整体清空，battle store 只「持有状态 + 调 engine」
- [x] 打破 `TurnManager↔AIController↔BattleController` 循环：编排合并为 `stores/battleSetup.ts` → `stores/battleFlow.ts` 单向两模块；AI 决策提前抽到 `engine/ai/decisions.ts`（纯函数+注入 RNG，原属 S4 范围）
- [x] `InteractionSystem` 改持 `BattleInteractionUI` 接口（不再 `any`）；顺手删零引用的 `exchangeCards`/`confirm`
- 额外：`randomAIDeckGenerator` → `engine/ai/randomDeck.ts`（根除「带 seed 时全局猴子补丁 Math.random 且不恢复」的隐患）；`aiProfiles` → `config/`；`endGame` 开始调用 `gameStore.setWinner`（为 S6 结算 UI 铺路，当前无可见行为变化）

**Exit 达成**：手测完整对战（开局/攻防/技能强度注入/结算表/AI 决策/回合推进，console 零错误）；engine 全目录过 lint 闸（绊线复验 3 类错误全拦）；测试 56 → **95 个**全绿（rewards 表逐格 + clash + turn 胜负边界 + resources + AI 决策分支 + setup 技能链）；type-check 0 错。

---

## ✅ S3 — engine 抽取：抽卡 & 挑战塔（已完成 2026-06-12）

**目标**：抽卡与小队战逻辑入 engine，消除复制公式，解开 userStore↔gachaStore 循环。

- [x] `gachaStore.performGachaLogic` → `engine/gacha/draw.ts`（注入 rng；保底状态传入/返回不就地改）
- [x] `gachaRotation` 的日期索引规则 → `engine/gacha/rotation.ts`；utils 留缓存/数据读取/商店目录适配层（顺手删零引用的 getRotationSchedule/getCacheStats/clearAllCache/clearExpiredCache/getDayOfYear）
- [x] 保底状态归并进 gacha 域：`gachaStore.animePity/characterPity` 持有，userStore 存档读写改走 gachaStore——**gachaStore 不再 import userStore，循环消失**（序列化键 animePity/characterPity 不变，旧存档兼容）
- [x] squad 伤害/战力公式 → `engine/squad/combat.ts`；**SquadBattleView 内复制的 calculateRoundDamage 已删**，全仓只剩一份公式
- [x] `aiSquadGenerator` → `engine/squad/tower.ts`（角色池/头像池/rng 全参数化；零引用的 generateRealCharacterAISquad/generateSimpleAISquad 淘汰）
- [x] 两域内全部 `Math.random` → 注入 rng

**Exit 达成**：手测动画+角色双池十连（UR 出货、pity 重置后续数、双池独立、票数/经验/升级联动）、塔第 1 层生成（守卫者小队/0% 加成/简单/战力 2110）与战斗回合（连击 1.3× 可见、HP 结算、击败判定），console 零错误；伤害公式唯一；engine/gacha+squad 过 lint 闸；测试 95 → **126 个**全绿（draw 纯函数版分布/保底/66%/十连 + rotation 日期规则 + combat 注入版 + tower 阵容表/加成/兜底/战力分档 + gachaStore 接线薄测试）。

---

## ✅ S4 — engine 抽取：技能 & 养成 & AI（已完成 2026-06-12）

**目标**：剩余逻辑入 engine，提炼技能参数化原语，`core/` 旧目录清空。

- [x] 技能系统重组为「纯数据/纯类入 engine + 薄执行器留 skills/」：
  - `engine/skills/announcements.ts` —— **72 个播报式假实现收敛为纯数据表**（35 条带文案 `{name}` 占位 + 37 条静默占位），S8 真实现一个就从表里删一个；
  - `engine/skills/status.ts` + `persistent.ts` —— 状态/持续效果追踪器纯类化（日志回调注入、ID 改计数器，将来服务端按对局实例化）；
  - `skills/effects/index.ts` 1561 行 → 44 行执行器（custom → 播报表 → 告警三段分发）；64 个真实现/条件播报/交互式 handler 原样切分到 `customHandlers.ts`（脚本机械迁移保行为）
- [x] 参数化原语以「追踪器方法 + EffectContext 注入」形态落地（addCardTypeStrengthBonus / costReduction / skillDisable / forcedAction / grantNextCardAnyType / draw / tp / rng…），S8 重写假技能时直接调用
- [x] nurture 规则 → `engine/nurture/rules.ts`：等级曲线 (lv-1)²×1000、升级随机属性分配（lv×10 点，10%-60% 约束）、经验系数（互动×5/训练×15/战斗×25）、训练对手生成与胜负结算表、战斗属性强化应用；userStore/NurtureActions 改为委托
- [x] `core/ai` → `engine/ai` 已在 S2 提前完成；本次 `core/systems` 全部迁出——SkillSystem→`skills/runtime`、InteractionSystem→`skills/interaction`、DialogueSystem→`stores/battleDialogue`，**`core/` 目录删除**
- [x] 技能/养成域 `Math.random` → 注入 rng（handler 经 `ctx.rng`，6 处概率技能改造；纯演出层的对话概率保留 Math.random，不属规则域）
- [x] `skills/effects/index.ts` 18 处历史 lint 债随重写消失；顺手清 userStore/NurtureActions 死变量与 `any`（抽卡历史/存档迁移/训练结算补真类型）
- 额外：`CharacterNurtureData` 类型上移 `types/nurture.ts`（userStore 转发兼容）；修复 `defaultRng` 捕获 Math.random 引用导致测试 spy 失效的隐患（晚绑定）

**Exit 达成**：手测战斗（onPlay 效果抽牌、角色技能 TP 恢复+冷却写入）与养成训练（+3 魅力/−15 知识点/−5 心情/+45 经验逐项命中 engine 常量），console 零错误；`engine/` 整体过 lint 闸（绊线复验 3 类全拦）；`core/` 已删除；测试 126 → **153 个**全绿；type-check 0 错；S4 接触面 lint 0 错。

---

## ✅ S5 — 拆 god store & 持久化（已完成 2026-06-12）

**目标**：userStore（1178 行）拆成领域 store，持久化显式化，**顺手修掉「小队/塔进度刷新丢失」bug**。

- [x] 拆 userStore → `profile / collection / deck / viewing / nurture / pve` 领域 store（+ gacha 历史归 gachaStore）；userStore 保留为 **300 行兼容门面**（28 个消费组件零迁移；门面只做调用面维持 + 跨域编排 + 统一触发存档；新代码直接用领域 store）
- [x] `profile.spend()/earn()` 唯一货币入口：消灭组件直改 `knowledgePoints` **8 处**（审计时 4 处，实际已长到 8）—— InteractionPanel ×4、NurtureActions ×3、SquadBattleView ×1
- [x] `infra/persistence`：schema.ts（SavePayloadV2 显式协议 + version）/ migrations.ts（v1→v2 纯函数迁移，含收藏裸数量兼容）/ api.ts（唯一的存档 fetch IO）
- [x] ★ `presetSquads` / `towerProgress` 入存档协议 v2；小队编辑与通层即时保存；SquadBattleView 挂载兜底 + watch 进度（修复「刷新塔页面后才登录」场景）—— 手测：组队+通层 → 清 session 重载重登 → 小队/第 2 层完整恢复；真实 v1 存档（14272 知识点/139 收藏/175 养成）迁移加载全保真
- [x] 各领域 store 以 serialize/deserialize/reset 三件套注册到 `stores/persistence.ts` 装配器（buildPayload ⇄ applyPayload 往返保真有测试锁定）
- 额外：**保存串行合并**（同一时刻至多一个写请求、连发坍缩为一次）——手测中后端非原子写被 6 连发 POST 截断损坏存档（审计预言的 S10 隐患实际咬人），前端先堵住单客户端并发源，后端原子写仍留 S10

**Exit 达成**：存档完整（含跨「关浏览器」恢复）；货币只经 spend/earn；领域 store 全部 <300 行（最大 nurture 239，门面恰 300）；测试 153 → **171 个**全绿（迁移 v1/v2/损坏兜底 + 往返保真 + 串行合并 + spend/earn 语义）；type-check 0 错；S5 新文件 lint 0。

---

## ✅ S6 — 功能闭环（已完成 2026-06-12）

**目标**：把 8 个模块的断点补齐，游戏「感觉完整」。

- [x] 宅理论战结算 UI + 奖励发放：`engine/battle/matchRewards.ts`（胜 60exp/30kp · 平 30/15 · 负 15/5，基线对齐塔奖励）；battleFlow.endGame 记录结果+原因、登录用户入账并存档；BattleView 结算面板（胜负/原因文案/奖励/再来一局/返回主页）
- [x] 登出按钮接上 `logout()`（App.vue @click，登出即保存+清空全部领域）
- [x] 设置 ✕ 关闭生效（SettingsView 接 router 回主页——原注释里的本意）
- [x] 商店每日限购真实计数：`stores/shop.ts` 领域 store（按商品记 {date,count}，跨天读取归零）+ 门面拒绝超限 + UI「今日剩余 N / 今日已售罄」；进存档 v3
- [x] 训练冷却持久化：`CharacterNurtureData.trainingCooldowns`（按角色随养成数据序列化，旧档兼容缺省）；NurtureActions 从组件内存切到 store，刷新/切角色/重开浏览器不再丢
- [x] 猜角色：最高分进存档 v3 + 接入主经济（答对得分 ÷2 兑知识点，经 `userStore.submitGuess` 编排入账+存档，结果弹窗显示兑换额）
- [x] 调试残留清零：删「AI手牌数量」、3 处虚拟化开关 checkbox、performanceMonitor（顺带消掉 S9 列的 interval 泄漏源之一）、testRandomAI/deckEditorTest 两个调试工具；**console.log 实际调用 103 → 0**（保留 error/warn）
- [x] AI 会使用角色技能：`engine/ai/decisions.chooseActiveSkill`（主动+付得起+不在冷却取第一个）；AI 无牌可出时先用技能自救再试一次出牌

**Exit 达成**：8 模块核心循环手测全闭环（速胜局结算面板+奖励入账、商店 5 成 1 拒、冷却/最高分/限购计数三项跨「重开浏览器」保真、设置关闭与登出生效），console 零错误；存档协议升 v3（迁移测试覆盖 v1/v2/v3）；测试 171 → **183 个**全绿；type-check 0 错；S6 接触面 lint 0。

---

## ✅ S7 — 视觉还债 & 皮肤系统（已完成 2026-06-12）

**目标**：消除泛白，建立配色一致性。实际范围扩大：应用户要求建立完整**皮肤装扮系统**（≥3 套、含装饰、可设置、为点数兑换预留）。

- [x] **皮肤令牌系统**（C1，`92e4a10`）：`assets/skins.css` 颜色令牌 `--c-*`（RGB 三元组，Tailwind 透明度可用）+ 装饰令牌 `--sk-*`（底纹/圆角/阴影/光效）；**5 套皮肤**：暖阳手账/樱花和风/薄荷清波/午夜剧场/赛博霓虹（后两套暗色，霓虹带按钮光效）；`config/skins.ts` 注册表带 `unlock` 字段（点数兑换预留：皮肤标价 → 存档加 ownedSkins → 设置页走 spend()，锁定徽章 UI 已就位）
- [x] **皮肤随账号漫游**：存档协议 v3→v4（`appearance.skinId`，三处同改+迁移测试）；设备 localStorage 缓存 + index.html 首屏防闪脚本；旧主题 id 就近迁移
- [x] **172 处 `text-white` → 语义文字色**（C2，`381f835`）：49 文件 ~770 处硬编码全迁语义类（text-ink 系/bg-surface 系/accent 系），约 60 处按判断树有理由保留（彩色固定底徽章/图片压片白字/稀有度识别色）；**旧调色板（cream/warm/teal-custom/gold/coral）与 --theme-* 旧变量已删除**，回归无门
- [x] 按钮色阶统一：`.btn-primary/.btn-secondary/.btn-danger/.btn-ghost` 组件类（自含 disabled/active 态，primary 吃皮肤光效）
- [x] 抽卡结果弹窗仪式感：入场弹跳 + 逐张 3D 翻面（120ms 错峰）+ 稀有度光环脉冲（SSR金/HR紫/UR红金双层）+ 高稀有度横幅（UR 流光字）+ 点击跳过
- [x] 战斗日志重新配色（脱离深色残留，类型色语义化）
- [x] 图片 `onerror` 兜底：document 捕获相全局监听（覆盖全部现有+未来 `<img>`），失败换内联 SVG 占位，防循环
- [x] `index.html` 标题 →「动画宅的自我修养 · AnimePlay」+ lang=zh-CN
- [x] Tailwind 动态类：3 处 `bg-${color}` 改完整字面量映射表（JIT 安全，safelist 不需要了）
- [x] **决策：桌面优先**。小屏（<768px）顶部显示提示条，不做完整移动适配——战斗/卡组是拖拽密集型桌面 UI，移动端重排成本高、价值低，推迟到 S11 视图迁移时重新评估
- [x] 顺手清债：settings.ts 死掉的旧主题配置（uiTheme/themePresets/applyPreset）删除；S6 遗留的 DeckEditor 悬挂 import（生产构建才暴露）修复

**Exit 达成**：自动对比度审计（8 视图 × 3 皮肤逐元素扫描白字压浅底/深字压深底）零坏点；5 套皮肤切换全站一致；测试 186 全绿；type-check 0 错；**生产构建通过**（本 sprint 首次纳入构建验证）；全 src lint 71（接手基线 72，净 -1）。
> 后续挂钩：皮肤点数兑换（S8+ 随商店扩展可做）；移动端适配（S11 再议）。

---

## ☐ S8 — 技能真实现（补完，拆 a/b/c 三段，2026-06-12 摸底后定）

> **摸底修正**：审计口径「112 处」已过时——S4 收编后真实余量 = **播报表 72 条**（37 条带文案假主动 + 35 条静默假被动）+ 1 个半假 handler（写入无人读的降费状态）+ 2 个角色技能设计缺失（#36/#37）。
> **关键发现**：S4 建好的 persistentEffects 四能力（费用修改 / 技能禁用 / 强制行动 / 行动限制）**战斗流程零消费**（全仓只消费强度加成一种）——不先接消费钩子，写再多 handler 也是另一种假实现。故先地基后内容，每段独立可合可玩。

### ✅ S8a — 机制地基 + 诚实化（已完成 2026-06-12）

**目标**：消费钩子接进战斗流程；游戏里看到的每个技能要么真生效、要么明标未实装。

- [x] 费用钩子：出牌实际扣费消费 `getCostReduction`（攻/防两处扣费点 + CardActionModal 显示实际费用；AI 经注入费用解析器与玩家同源，engine 决策函数保持纯净）
- [x] 禁技钩子：`canUseSkill` 消费 skill_disabled（'*' 全体禁用 + 指定技能），UI 使用按钮自动跟随；AI 选技前过滤被禁技能不再撞墙
- [x] 行动钩子：攻击风格消费 forced_action（friendly_only：battleFlow 单闸口钳制玩家与 AI + UI 禁辛辣按钮）
- [x] **第四钩子（摸底新发现，本段最大件）：被动光环事件管线**——此前角色被动从未被分发，customHandlers 里 27 个写好的被动全是死代码。现接通 onPlay/beforeResolve/afterResolve 三事件，只触发**主辩手**被动、只分发**有真实现**的 effectId（播报占位保持静默）
- [x] 通电前逐 handler 审计（含子代理 16 条逐条比对）：**11 个被动验真通电**；**16 个「半假实现」降级入播报表**（7 个等 turnStart 事件 / 7 个等跨事件计数器或条件检查 / 2 个等技能使用事件——原逻辑在 git 历史，按缺口分给 S8b/S8c 复活）。播报表 72 → **88**（重新归类，净真实数不变）
- [x] 评估结论（声望保护 / 技能免疫，S8c 实现）：见 S8c 条目
- [x] UI 诚实化：`isSkillImplemented`（真 handler 注册表 + 引擎级光环白名单）→ CharacterActionModal / CardDetailModal 挂「⚠️ 未实装」徽章
- [x] #36 志摩凛（秘境营地/围炉夜话）/ #37 三笠（立体机动/阿克曼血统）设计补全——只用已消费原语，**直接真实现**；生成脚本三处写死的原作者机器绝对路径修为仓库相对，重新生成 128→132 条零 churn
- [x] 半假 handler（千早爱音_会长领导：选类型降费）随费用钩子落地生效
- [x] 特征测试：追踪器谓词 + ★duration 时序语义锁定（duration=1 在受害方行动前过期，S8b/c 设计时长须按此换算）+ 费用解析器分支翻转 + 禁技/被动管线/新技能/诚实化判定（186 → **206** 个）

**Exit 达成**：「说一套做一套」解除——技能要么真生效（48 真 handler + 11 被动首次实际运转）要么标「⚠️ 未实装」；测试全绿；type-check 0 错。

### ☐ S8b — 内容批：纯原语技能（机械量、低风险、可并行）

- [ ] **turnStart 管线事件**（EffectContext.event 增枚举 + battleFlow.startTurn 发射）→ 复活 S8a 降级的 7 个「回合开始」被动（人气者/不死之身/阳光魅力/温柔体贴/世渡上手/温柔鼓励/隐居创作——条件数值逻辑都对，改守卫即可）
- [ ] **跨事件计数器**（StatusEffect 每回合计数：第一张某类型/每3张不同类型/上一张类型）→ 复活 7 个降级被动（天然直觉/音乐世家/团队合作/双子感应/丰收之神/赏金猎人/螺旋公主）
- [ ] A 层假主动 ~20 条（类型强度 buff / 抽牌 / TP / 偏向）：每条 = 删表一行 + 短 handler + 测试
- [ ] 37 条空白被动逐条对设计文档定级：原语可表达的实现；过度花哨的**当场降级设计**（改描述适配机制——空被动玩家从未体验过，零感知）
- [ ] 时长换算遵循 persistent.test 锁定的语义：duration=1 在受害方行动前过期，跨对方整回合需 duration=2

**Exit**：播报表 88 → ~25 条；新增 handler 全部走已消费机制。

### ☐ S8c — 内容批：系统技 + 交互技（最硬的一批）

- [ ] B 层系统技（禁技 / 降费 / 强制行动 / 额外回合……依赖 S8a 钩子）
- [ ] **声望保护**（S8a 评估结论）：通用 restriction `reputation_shield` + battleFlow.resolveClash 应用声望变化前消费（负变化归零并播报）；无需新追踪器能力，工作量小
- [ ] **技能免疫**（S8a 评估结论）：通用「效果免疫」不可行——handler 直改 store，无目标元数据可拦。落地为**窄语义**：给追踪器的四类敌对写入（负向加成/禁技/强制行动/限制）加 shield 检查（施加目标带 `effect_shield` 时跳过+播报）；正好覆盖 绝对沉默/电子战/射击精准/蛇神缠绕 这类技能叙事。绕过追踪器直改 store 的效果不受保护，作为已知边界记录
- [ ] **技能使用事件**（onSkillUsed 管线）→ 复活 2 个降级被动（天然黑洞/沉默威严——后者即技能无效化，与本批禁技/免疫体系同做）
- [ ] C 层交互技 ~8-10 条（看牌 / 选牌 / 换手牌 / 复制 / 重排牌库 / 改类型——InteractionSystem 三件套已有真实现案例可循）
- [ ] AI 对新机制的应对（至少不崩、不死循环）
- [ ] **清空播报表，删除播报机制本身**（announcements.ts + 执行器播报分支 + 「未实装」徽章自然消失）

**Exit**：技能描述与实际行为一致；无「播报式假实现」。

---

## ☐ S9 — 性能优化（上线前置）

**目标**：首屏体积、图片、列表、定时器全部达标。

- [ ] 后端 `all_animes` 剥离 `main_characters` 字段（−92%，7.2MB → ~0.5MB）
- [ ] 开 gzip（Flask-Compress）
- [ ] 恢复图片 `Cache-Control` 长缓存 + 缩略图 + `loading="lazy"`
- [ ] 补虚拟化（`CharacterSelectModal` / `CharacterSelector` 等可达 665 项的大列表）
- [ ] 修定时器泄漏（~~performanceMonitor interval~~ 已随 S6 删除该调试工具；剩 squad 自动战斗 setTimeout 链）
- [ ] `main.ts` 非阻塞挂载 + loading/超时兜底

**Exit**：首屏 < 1MB；大列表流畅；无定时器泄漏。

---

## ☐ S10 — 后端加固 & 安全（上线前置）

**目标**：堵死审计两条安全红线，达到「单人在线」可部署。

- [ ] 存档接口加鉴权（token / 会话）—— 当前任意用户名免密读写任何人存档
- [ ] `debug=True` → `False`
- [ ] 存档加版本号 + 并发保护（防后写覆盖 / 写入截断损坏）
- [ ] CORS 收敛；vite `host` / `allowedHosts` 收敛
- [ ] 部署方案确定（单人在线版）

**Exit**：可安全部署为单人在线版。

---

## ☐ S11 — React 视图迁移（演进）

**目标**：视图层换 React，盖在已干净的 engine 上，拿到单一 TS 栈。

- [ ] 新建 React 应用骨架，直接复用 `engine / types / config / data / infra`
- [ ] 状态层重写：Pinia → Zustand / Jotai（仍是「薄编排」）
- [ ] `views` / `components` 按域用 React 重写
- [ ] 对照功能逐页验收

**Exit**：React 版功能对齐；engine 复用率 > 50%。
> 粗粒度。前置依赖 S2–S5 的 engine 必须已干净。到达时再 `/think` 细化。

---

## ☐ S12 — 权威后端 & 多人/PvP/排行榜（终点）

**目标**：达成多人闭环。

- [ ] `engine` 提升为前后端共享包（monorepo）
- [ ] Node 权威服务端（战斗/抽卡服务端计算，客户端预测）
- [ ] 排行榜（战绩/收集进度）
- [ ] PvP 匹配 + 对战

**Exit**：多人对战与排行榜上线。
> 粗粒度。决策门控（数据库选型、匹配机制等），到达时再 `/think`。

---

## 🆓 自由项（零依赖，可随时插队）

不依赖任何 Sprint，想做就做：

- [ ] `text-white` 泛白修复（S7 的一项，可提前）
- [ ] 后端 `debug=True` 关掉（一行）
- [ ] `index.html` 标题
- [ ] 清死代码 / `console.log`（也在 S1/S6）

---

## 🔗 附录：审计问题 → Sprint 映射（确保无遗漏）

| 审计章节 | 问题 | 落在 |
|---|---|---|
| 一.2 | 宅理论战无结算无奖励 | S6 |
| 一.2 | 小队/塔进度刷新丢失 | S5 |
| 一.3 | 登出/限购/训练冷却/猜角色/设置关闭 | S6 |
| 三.1 | core→stores 反向依赖、3 处循环依赖 | S2 / S3 / S4 |
| 三.2 | userStore god object | S5 |
| 三.3 | 78% 假技能 | S4（结构）+ S8（内容） |
| 三.4 | 两套引擎、SquadBattleView 复制公式 | S2 / S3 |
| 三.5 | 配置散落、组件直改货币 | S5 |
| 四 | 172 text-white、配色、移动端、裂图 | S7 |
| 五.1 | 7.2MB 首屏、图片缓存、定时器泄漏 | S9 |
| 五.2 | 无鉴权、debug=True、存档并发 | S10 |
| 六 | 全前端架构 → engine 化 / 权威后端 | S2–S4 / S11 / S12 |
| 工程 | 无测试、死代码、console | S1 / S6 |

---
*创建于 2026-06-12。每完成一项请同步勾选；每完成一个 Sprint 请更新「进度总览」状态。*
