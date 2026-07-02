# AnimePlay 完成史 History

> **这是已完成工作的归档。** 记录已交付的 Sprint（S0–S10）、产品进化层（Evolution Evo-1..Evo-9）、战斗可读性还债、2026-06-24 产品循环，以及已勾选的自由项与审计映射表。
>
> **未完成的前进路线（S11 / S12 + Backlog）见 [FUTURE.md](FUTURE.md)。** 本文只管「做过什么、怎么做的、达到什么 Exit」，每个任务的「为什么/证据」见 [项目审计报告-2026-06-12.md](项目审计报告-2026-06-12.md)。

**状态图例**：☐ 未开始 · 🔄 进行中 · ✅ 完成

---

## 📑 目录

- [S0 — 文档重构](#s0--文档重构已完成-2026-06-12)
- [S1 — 测试安全网 & 架构骨架](#s1--测试安全网--架构骨架已完成-2026-06-12)
- [S2 — engine 抽取：宅理论战](#s2--engine-抽取宅理论战已完成-2026-06-12)
- [S3 — engine 抽取：抽卡 & 挑战塔](#s3--engine-抽取抽卡--挑战塔已完成-2026-06-12)
- [S4 — engine 抽取：技能 & 养成 & AI](#s4--engine-抽取技能--养成--ai已完成-2026-06-12)
- [S5 — 拆 god store & 持久化](#s5--拆-god-store--持久化已完成-2026-06-12)
- [S6 — 功能闭环](#s6--功能闭环已完成-2026-06-12)
- [S7 — 视觉还债 & 皮肤系统](#s7--视觉还债--皮肤系统已完成-2026-06-12)
- [S8 — 技能真实现（S8a / S8b / S8c）](#s8--技能真实现s8a--s8b--s8c已完成-2026-06-12)
- [S9 — 性能优化](#s9--性能优化已完成-2026-06-12)
- [S10 — 后端加固 & 安全](#s10--后端加固--安全已完成-2026-06-16)
- [产品进化层（Evolution Evo-1..Evo-9）](#-产品进化层evolutionevo-1evo-92026-06-16)
- [战斗可读性还债（2026-06-17）](#-战斗可读性还债2026-06-17)
- [Product-Loop 2026-06-24（mode=all，5 轮）](#-product-loop-2026-06-24modeall5-轮)
- [自由项（已勾选）](#-自由项已勾选)
- [附录：审计问题 → Sprint 映射](#-附录审计问题--sprint-映射)

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

> **延期项（intentional scope cut，未交付，已转后续）**：① 皮肤点数兑换——锁定徽章 UI 已就位但兑换流程推迟到 S8+ 随商店扩展；② 完整移动端适配——桌面优先决策，推迟到 S11 视图迁移时重新评估。这两项是有意的范围裁剪，不是 bug，**不计入已交付**。

---

## ✅ S8 — 技能真实现（S8a / S8b / S8c，已完成 2026-06-12）

> **摸底修正**：审计口径「112 处」已过时——S4 收编后真实余量 = **播报表 72 条**（37 条带文案假主动 + 35 条静默假被动）+ 1 个半假 handler（写入无人读的降费状态）+ 2 个角色技能设计缺失（#36/#37）。
> **关键发现**：S4 建好的 persistentEffects 四能力（费用修改 / 技能禁用 / 强制行动 / 行动限制）**战斗流程零消费**（全仓只消费强度加成一种）——不先接消费钩子，写再多 handler 也是另一种假实现。故先地基后内容，每段独立可合可玩。提交：`10ec09e`（S8a）/ `2bd5e33`（S8b+S8c）。

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

### ✅ S8b — 内容批：纯原语技能（已完成 2026-06-12，与 S8c 同提交）

- [x] **turnStart / turnEnd / onSkillUsed 管线事件**（EffectContext 扩枚举 + startTurn/endTurn/useSkill 发射点）→ 16 个降级被动全部复活（7 回合开始 + 7 计数条件 + 2 技能响应）
- [x] **跨事件计数器**（StatusEffectTracker：回合出牌主类型序列 / 跨回合 lastTags / 对局累计 distinct 集合 / markOnce 防重发）+ **one-shot 加成**（next-play「下张卡」/ next-match「下次X类」双语义 + cardId 点名匹配，扣费/结算后统一消费）+ **条件费用修饰器注册表**（取费瞬间判定的被动，玩家 UI/AI/扣费三处同源 `playerCardCost`）
- [x] 内容批量产：复活被动 16 + 内容被动 29 + 条件费用 5 + A 层主动 17（三路并行子代理分桶交付，文件所有权隔离零冲突）
- [x] 空白被动逐条定级：原语可表达的全部实现；约 20 条按可实现机制降级重设计并**同步设计文档**（优等生/未来知识/师父照顾/前偶像/省力主义/掌中老虎/千花游戏/爆裂魔法……）
- [x] legacy 半真主动修复 9 个（超电磁炮补强度并修偏向方向 bug、和谐演奏补类型判定、独奏时光/武士觉醒/会长领导/冷静分析/吐槽连击/咬咬攻击补真）

**Exit 达成**：新增 handler 全部走已消费机制，每条带特征测试。

### ✅ S8c — 内容批：系统技 + 交互技（已完成 2026-06-12）

- [x] B 层系统技 10 条：毒舌反击（辛辣惩罚）/ 绝对沉默（全体禁技）/ 存在感消失（减费+手牌隐藏）/ 天然魅力（强制友好）/ 蛇神缠绕（敌对削弱）/ 电子战（随机禁技）/ 时间停止（**额外回合**）/ 存在感操作（卡牌指定保护）/ 班长职责 / 半吸血鬼
- [x] **声望护盾**：`reputation_shield` + resolveClash 声望应用前消费（天使守护）；**效果护盾**：追踪器内置闸——负向加成与 HOSTILE 限制写入时被 `effect_shield` 拦截（AT力场），绕过追踪器直改 store 的效果不受保护（已知边界）
- [x] **技能无效化**：沉默威严经 onSkillUsed 落旗 → useSkill 消费（费用冷却已付、效果取消）；电磁干扰（冷却+1）/ 天然黑洞（吸TP）同管线
- [x] C 层交互技 **20 条**（远超计划 8-10：含 10 个原 legacy 简化版的正经重做）：信息操作 / GEASS契约 / 宝石魔术 / GEASS命令 / 宅女知识 / 完美主义 / 魔法收集 / 时间警告 / 射击精准 / 原画创作 / 命运探测 / 好奇探究 / 社交网络 / 爆裂魔法 / 掌中老虎 / 千花游戏 / 制作进行 / 节能推理 / 察言观色 / 魔法修行——玩家走弹窗、**AI 走 ctx.rng 自动决断**（改卡一律克隆替换防主数据污染）
- [x] 配套修复：viewDeckTop/selectFromDeck 查「牌库顶」方向 bug（与抽牌端一致）；NEXT_CARD_ANY_TYPE 的任意类型标志接入光环结算（此前零消费者）；占位技能 HARUHI_AURA/双 PLACEHOLDER 删除（阿虚被动换真实现光环）；费用修饰器型被动误进事件管线刷告警（活体测试抓到，加 hasEventHandler 分流 + 回归测试）
- [x] AI 应对回归：整局 AI 循环 8 回合打满至 topic_bias 胜利零卡死（强制类型/出牌上限先过滤可出牌池）
- [x] **播报表与播报机制整体删除**（announcements.ts/AnnounceEntry/执行器播报分支/计数测试），执行器收敛为「真 handler → 未注册告警」；「未实装」徽章保留判定逻辑、全量实装后自然消失

**Exit 达成**：技能描述与实际行为一致（设计文档状态头已改写）；无「播报式假实现」；事件 handler 共 **134** 个 + 条件费用 5 + 基础设施级 2；测试 206 → **305** 全绿。

> ⚠️ **2026-06-17 复审修正**：S8c「技能描述与实际行为一致」当时**未完全达成**——后续全量复审仍查出 9 条描述≠行为残留（3 高危）+ `drawCards` 静默 no-op。这些已由下方「战斗可读性还债」节（提交 `c79d613`）修复对齐。结论：注册全接通属实，但「行为=描述」需逐技能复核，不能只看注册表。

---

## ✅ S9 — 性能优化（已完成 2026-06-12）

**目标**：首屏体积、图片、列表、定时器全部达标。

- [x] 后端 `all_animes` 服务时剥离 `main_characters`（实测占 94%：3.73MB → 458KB）+ **主数据进程内缓存**（此前每个请求重读重解析整个 JSON）
- [x] gzip（Flask-Compress，requirements 已钉版本）：all_animes 最终 **107KB**、all_characters 228KB——首屏 API 合计 ~317KB（audit 口径 7.2MB → −96%）
- [x] 图片 `Cache-Control: public, max-age=30d, immutable`（内容按 id 不变）+ vite 哈希产物 1 年 immutable + **22 处 `<img>` 补 `loading="lazy" decoding="async"`**。缩略图未做：列表图有 lazy + 长缓存后非瓶颈，真要做留给部署期（S10 随 nginx/CDN 一并定）
- [x] 虚拟化：`CharacterSelectModal` / `CharacterSelector`（665 项级）接入 VirtualGrid；顺带修了 VirtualGrid 两个存量缺陷（容器宽 0 时 `floor(-16/w)=-1` 致列数为负全空——钳到 ≥1；仅监听 window.resize 漏弹窗内布局变化——改 ResizeObserver）；两弹窗 Teleport 到 body（防 transform/overflow 祖先干扰 fixed 定位）。活体验证：1280 视口 4 列、渲染 20/665、滚动窗口精确跟随
- [x] squad 自动战斗 setTimeout 链泄漏：组件级定时器登记表（`schedule()`），卸载统一 clearTimeout——文件内唯一裸 `window.setTimeout` 就是登记表本身，结构性无泄漏；全仓 interval 普查其余三处均有清理
- [x] `main.ts` 非阻塞挂载：立即出壳，App 数据门控（加载态 / 30s 超时 / 失败重试），就绪才渲染路由；**顺带修掉启动双拉 bug**（main.ts + App.onMounted 各拉一次主数据，此前每次启动双倍流量）——实测启动 API 调用恰 2 次

**Exit 达成**：首屏 API 317KB + 入口 JS gzip 74KB ≪ 1MB；大列表虚拟化滚动流畅；定时器无泄漏；测试 305 全绿；生产构建通过。

---

## ✅ S10 — 后端加固 & 安全（已完成 2026-06-16）

**目标**：堵死审计两条安全红线，达到「单人在线」可部署。**决策**：鉴权＝密码账号 + 会话 token；部署＝只加固不实施（方案写文档）。经 `/product-loop --tier1 off`（SPRINT 当需求源）走 Scout→Planner→Generator→Evaluator 一轮交付。

- [x] 存档接口加鉴权（密码账号 + 无状态会话 token）—— 新建 `backend/auth.py`（werkzeug 盐哈希 + itsdangerous 签名 token），两入口（`server.py` + `api/index.py`）加 `POST /api/auth/login`（claim-on-first-login，兼容现有 4 个 passwordless 存档）+ 读写存档 token 闸（解析出的用户名须与目标存档一致，否则 401）。**凭据独立存储 `data/auth/credentials.json`，绝不进存档文件**（存档由客户端 payload 全量覆盖写）。前端：`api.ts` 模块级 token holder + 唯一传输层挂 `Authorization`；`userStore.login` 改带密码（失败不留半登录态）；App.vue 登录加密码框 + 错误反馈。
- [x] `debug=True` → 经 `FLASK_DEBUG` 门控，默认 `False`（两入口）
- [x] 存档原子写（temp + `os.replace` 同目录，防截断损坏）+ `saveVersion` 乐观并发（协议 v4→v5，schema/migrations/装配器三处同改 + 迁移/往返测试；后端权威递增，客户端基线 < 服务端当前 → 409）
- [x] CORS 收敛（`api/index.py` 不再裸 `CORS(app)`，env `ALLOWED_ORIGINS`）；vite `host`/`allowedHosts` 收敛（默认 localhost，env `VITE_HOST`/`VITE_ALLOWED_HOSTS` 可放开，保留 proxy 与隧道注释）
- [x] 部署方案文档 [`部署方案.md`](部署方案.md)（自部署 gunicorn/waitress + serverless 各列要点 + 上线清单，不实施）；docs 索引已加
- 额外：**Werkzeug 钉版本 2.3.8**——审计未列的潜在隐患，requirements 只钉 Flask 2.3.2 留 Werkzeug 浮动，fresh install 会拉 3.x（移除 `__version__`）与 Flask 2.3.2 不兼容（test client 炸）；钉死 + test_security 加兼容兜底
- 额外：新建后端首个测试基建 `backend/test_security.py`（Flask test_client 自包含 + tempdir 隔离，不引 pytest，19 断言覆盖鉴权/跨用户拒绝/409 并发/原子写非截断/debug 关闭）

**Exit 达成**：可安全部署为单人在线版（鉴权 + debug off + 原子写 + 并发保护 + CORS/host 收敛全落地）。验收全绿：type-check 0 错、测试 305 → **310** 全绿（+saveVersion 往返/迁移/并发基线）、生产构建通过、`python backend/test_security.py` 19 断言全 PASS、`grep debug=True` 零命中。审计五.2 安全章节（无鉴权 / debug=True / 存档并发）三项全解。

> **S10 后续加固（超出文档原范围）**：提交 `73b9add` 加了注册邀请码门控（`INVITE_CODE`）防无限建号——记录在此以保留追溯。

---

## 🔁 产品进化层（Evolution，Evo-1..Evo-9，2026-06-16）

S-roadmap 是「重构 + 上线前置」主线；下面是在 S10 之上由产品进化审计（`/product-loop --mode evolution` 三轮 + backlog 推进 + 小游戏 5 轮）驱动加的**留存/差异化功能层**（不占 S 编号，详见 [SPRINT.md](SPRINT.md) 的 Evolution 各轮 + `docs/orch/`）：

| 轮 | 主题 | 交付 | commit |
|---|---|---|---|
| Evo-1 | 留存引擎 | 每日任务/登录奖励 + 图鉴完成度/里程碑 + 成就系统（6 玩法成功点统一埋点，存档 v5→v6） | `1591a67` |
| Evo-2 | 图鉴价值枢纽 | 图鉴定向解锁（知识点经济出口）+ 真实评分/放送年可视化（Bangumi 数据护城河） | `95cacd3` |
| Evo-3 | 收口（感知+传播） | 新人 onboarding（引导/首抽庆祝/空态 CTA）+ 可分享 Wrapped 成绩卡 | `84bdb9e` |
| Evo-4 | backlog 推进（tier1 off） | 周任务+连续登录递增（存档 v6→v7）· 番剧年表时间轴 · 跨系统红点 | `a72b305` |
| Evo-5 | 小游戏中心 + 高低牌（5轮的第1轮） | 统一「🎮 小游戏」Hub（/minigames，猜角色迁入）+ 高低牌 Higher/Lower（存档 v7→v8） | `9f1613b` |
| Evo-6 | 番剧问答 Quiz（5轮的第2轮） | Quiz 4类真实数据派生题（存档 v8→v9）；小游戏硬性交付达成（Hub 内 3 游戏）+ 共享每日封顶 | `f91b34f` |
| Evo-7 | 小游戏焊进留存（5轮的第3轮） | 小游戏接每日/周任务（minigame 类型）+ 成就 + 红点联动（零架构改动） | `84833ee` |
| Evo-8 | 每日挑战（5轮的第4轮） | 固定种子全员同题、每日一次首通领奖（存档 v9→v10） | `e3969be` |
| Evo-9 | 每日挑战连续 streak（5轮的第5轮·收官） | 连续完成天数（断签归 1，Duolingo 式留存倍增；存档 v10→v11） | `23fd773` |

产品进化成熟度（reviewer 评分）6.0 → 7.0 → 7.5 → 8.0。测试 305 → **400**（后经 2026-06-17 战斗可读性还债两批升至 **418**）。存档协议至此为 v11（后续 2026-06-24 产品循环推进至 **v12**，权威值见 `infra/persistence/schema.ts`）。**✅ 小游戏 5 轮 evolution 全部完成**：统一 🎮 小游戏 Hub 含 **4 个游戏**（猜角色 / 高低牌 / 番剧问答 / 每日挑战）+ 完整留存闭环（每日/周任务 + 成就 + 红点 + 连续 streak）。

> **未交付的 backlog 尾注**：「按声优收集维度（跨栈，需后端吐 `角色id→声优` 映射）」是**未开始**的 backlog 项，非已交付内容，已转入 [FUTURE.md](FUTURE.md) 的 S12 backlog（声优维度）保留。

---

## 🔧 战斗可读性还债（2026-06-17，由宅理论战直观度审计驱动）

S8 把技能「真实现」了，但 2026-06-17 的全量复审（132 技能 × 注册表交叉比对）+ 宅理论战直观度审计（4 视角，均 2/5）发现两类残留并已修复。提交：批一 `804a0f0`、批二 `6d783cc`、技能复审 `c79d613`。

**技能复审修复（接 S8 的尾，提交 `c79d613`）**：
- 交叉比对确认 effectId **零未注册**，但仍有 9 条「描述≠行为」残留——3 高危（圣剑解放/精灵加护 缺失的强度加成只播报未落地、魔法指导 写入全仓无消费端的 `card_type_override`）补真；6 中低危改 `docs/UR角色技能设计.md` 后重生成对齐；轮回记忆经核实实战可用（`clash.rewards` 在 afterResolve 已填，无需改）。
- `engine/battle/resources.ts` `drawCards` 静默 no-op 修复：原「牌库不足整次作废 + 弃牌堆从不重洗」→ 牌库耗尽后所有抽牌静默失效却照扣 TP；改为牌库抽空洗弃牌堆续抽 + 能抽几张抽几张 + 真空发通知。
- 主动技按钮 `:disabled` 加 `isSkillImplemented` 闸，未实装技能不再空耗 TP。

**直观度还债（批一，提交 `804a0f0`）**（核心结论：决定每次对撞胜负的「卡牌强度」全程不显示是最大劝退点；模型结构上比一般战斗难懂，但大半是执行没说清，走「留住模型+重投可读性」路径）：
- 卡面强度角标（`AnimeCard` `showStrength`：手牌 / 对撞区 / 出牌弹窗）
- 对撞区结算显示双方最终强度 + 净差 + 命中档位（`ClashZone` 复用 `rewards.getStrengthCategory`/`STRENGTH_CATEGORY_LABEL`）
- 场上常驻状态芯片（`PlayerField` + 新建 `skills/statusDisplay.ts` + 追踪器 `getActiveRestrictions`，把护盾/强制/限制/加成等隐藏机制显形）
- 规则弹窗改两处错文案（TP 无封顶 / 手牌上限 10）+ 补全 4 张结果表具体数值
- 新手引导对战步充实心智模型 + 首次进 /battle 自动弹规则（设备级 `battle-rules-seen`）

**第二批可读性（批二，提交 `6d783cc`）**：① 对撞区强度拆「卡面 + 光环/效果」分解 + 防御阶段即显攻方最终强度（`ClashZone` + 新建 `skills/strengthPreview.ts` 非消费预览 + `status.ts` `hasAuraSuppression`）② 防御弹窗出牌前预判「你 X · 对手 Y · 净差→档位」（`CardActionModal`）③ 结算浮动显示声望/议题增减（`ClashInfo` 加 `rewards?` 类型）。测试 413 → **418**（+预览 helper），preview 实测确认（防御阶段攻方强度可见、预判与结算档位一致、浮字数值吻合）。

**验收**：type-check 0 错、测试 **418** 全绿、改动文件 ESLint 干净、preview 实测确认（强度角标 / 对撞反馈 / 首局自动规则 / 强度分解 / 防御预判 / 结算浮字）。同步：`frontend-vue/CLAUDE.md` Known Debt、`docs/战斗系统.md`、`docs/UR角色技能设计.md`。

> ⚠️ **当时遗留的一条 gameplay bug（已于 2026-06-17 后续修复，但本节交付时仍开放）**：`beforeResolve 临时强度不参与结算档位`。本节交付时该 bug 仍开放（曾作为已知项写进 FUTURE.md）；提交 `ca9d135` 把它记进 FUTURE.md，**随后提交 `3c359cd`「fix(battle): beforeResolve 临时强度计入结算档位（修描述≠行为）」已修复**。现状（`frontend-vue/src/stores/battleFlow.ts:441-453`）：engine 拿到的最终强度已含 `extraAttacker/extraDefender`（beforeResolve 临时加成），展示与判定一致，学霸气质/圆环理/运动天赋/牺牲觉悟 等被动现在真正影响胜负。**此项已 RESOLVED；FUTURE.md 仅保留为「已修复·待回访的设计决策路标」，不再当未决 bug 携带。**

---

## 🎮 Product-Loop 2026-06-24（mode=all，5 轮）

> 经 `/product-loop --mode all --max_iter 5`（tier1 on，scout on）在分支 `product-loop/2026-06-24` 交付。**主题**：把产品从「收集库存」转向「策展我的动画人格」——把休眠的真实 Bangumi 数据推荐引擎显形，并建起品味身份层。
> **写入时尚未提交（uncommitted），故本节无 commit 哈希。**
> **每轮硬不变式**：零存档 schema 改动（SAVE_VERSION 保持 **12**）· engine 纯净 · 依赖只向下 · 语义色令牌。每轮均过独立 QA 零返工。
> 前端测试由约 **395**（loop 前）升至 **512**。新源文件：`contentIndex.ts` · `RecommendationStrip.vue` · `useWatchedAnime.ts` · `TasteIdentityChip.vue` · `shareImage.ts` · `TasteRadar.vue` · `NicheGems.vue` · `genreSets.ts` · `GenreSets.vue` · `watchingPins.ts` · `WatchingPins.vue` · `nurtureColors.ts` · `useDialog.ts` · `AppDialog.vue` · `useUnlockConfirm.ts` · `onboardingSteps.ts`（均配套测试文件）。

**Round 1 — 显形休眠数据/引擎**（测试 ~395→448）：
- 修一簇静默 CSS-token bug（小游戏组件：未定义 `--c-border-line`→`--c-line`、`--c-ink-soft`→`--c-ink-2/-3`、裸 `--sk-radius`→`-panel/-control`，外加未定义 Tailwind 工具类 `text-ink-soft`）。
- 把「看过」做成读侧一等公民（图鉴眼睛印章 + 派生观看进度面板）。
- 把已存在但休眠的 `recommendFromTaste` 推荐引擎接进 2 个高频出口（抽卡结果弹窗 + 图鉴），经新建 `RecommendationStrip`，带输入源回退（watched→owned，避免 day-one 账号死胡同）。
- CardDetailModal 加角色性别/生日字段 + 新建 memo 化 `contentIndex`（tag→番剧 倒排索引）。

**Round 2 — 补全燃料管线**（测试 →456）：
- 修 R1 推荐排除 bug（`recommendFromSeeds` 现排除 owned∪watched，不再只排种子卡）。
- CardDetailModal 加一处「看过」写入开关（仅番剧，经 `toggleTasteWatched` 门面）。
- 统一两个分裂的「看过」源（`viewing.watchedAnime` vs `minigames.tasteWatchedIds`），经 memo 化派生并集 composable `useWatchedAnime`——纯读侧，零 schema。
- 显形动画人格资产：persona/topTags/nicheScore 注入 `buildWrappedStats` + 新建主页 `TasteIdentityChip` + 一键 Web Share（`navigator.share`，带 a.download 回退，`shareImage.ts`）。

**Round 3 — 让每段循环上瘾**（测试 →466）：
- 修「看过」显示不一致（详情开关现读并集，与图鉴印章对齐）。
- 多轴 persona 雷达（`buildTasteRadar` 5 轴 + `TasteRadar.vue` 经 vue-chartjs，注入报告页——刻意排除在 Canvas 分享导出之外）。
- 冷门佳作雷达（`pickNicheGems`「高分 × 低流行」+ `NicheGems.vue`），桥接稀有度价值冲突（经济贬低冷门佳作而 persona 奖励冷门品味）——纯派生，无后端。
- `RecommendationStrip` 从单按钮重构为 div + 行内操作行（行内标记看过 / 解锁，消灭死胡同与按钮套按钮）。
- 加抽卡保底进度条（`UpBanner`，70 抽硬保底）+ 把 `UpBanner` / `ViewingStats` 硬编码色迁令牌。

**Round 4 — 长线牵引**（测试 →489）：
- 题材集册（Genre Sets）——日常任务与「收齐 968 的不可达峰」之间缺失的「中间峰」，做成 persona 排序的 SHOWCASE 墙（完成度 + 派生 tier +「还差 N」，去噪 tag 桶，无奖励 / 无领取态 / 无持久化——纯派生）。
- 详情相似作经原地导航（`viewCard` ref，避免三层叠 modal）+ 一步补齐缺口。
- 设备级「正在追」Pin（`watchingPins.ts` localStorage，主页 `WatchingPins.vue`）。
- `ViewingStats` 题材展示源收口（保留 `genreProgress` 存档字段，仅换读源）。

**Round 5 — 收尾/还债**（测试 →512）：
- 拔 138 处硬编码色（nurture 簇 107 across 5 文件 + SquadBattleView 31）经共享语义色映射 `config/nurtureColors.ts` + 整函数重写（消灭重复的 bondLevel/moodStatus 调色板——它们在暗色皮肤上背刺 5 皮肤卖点）。
- 替 18 处原生 `confirm()`/`alert()` 为新建主题对话（`useDialog.ts` + `AppDialog.vue`）+ 共享 `useUnlockConfirm` 门面（坍缩 4 处逐字重复的解锁确认，吃 domain 参数）。
- onboarding 现命名品味身份（价值优先开场 + 第 5 步指向品味画像 / 题材集册 / Pin）。
- `/homestead` 完全冻结（重定向到 / + 去掉 import，从 dist 构建移除）。
- 清理三连：文档版本同步至 v12 · 删 SquadBattleView 死代码矛盾（每日上限）· `NurtureActions` 两处泄漏 setTimeout 注册 onUnmounted · CardDetailModal 用 `MAX_PINS` 常量。

**结果**：reviewer 评分体验 7.3→8.4、进化 8.3→9.2；研究 reviewer 判定核心隐喻迁移**完成**（5 个锚层中 4 个——身份 / 发现 / 目标 / 意图——已脱离稀有度，仅经济层仍锚稀有度，现已隔离）。

> **本轮新浮现 backlog（两项都需真实后端，归 S12，未做，已转 [FUTURE.md](FUTURE.md)）**：① 品味契合度对照（"你和 X 87% 契合"）——persona 当前被困为单人镜子，是 #1 剩余结构性机会；纯前端异步「品味码」可在投入后端前先验证。② 声优维度——actor 数据被 `server.py` 在服务时剥离，任何 seiyuu 功能都需后端吐 `角色id→声优` 映射。

---

## 🆓 自由项（已勾选）

不依赖任何 Sprint，已随对应 Sprint 完成的零依赖项：

- [x] `text-white` 泛白修复 —— 随 S7 完成（172 处 → 语义文字色）
- [x] 后端 `debug=True` 关掉 —— 随 S10 完成（经 `FLASK_DEBUG` 门控，默认 False）
- [x] `index.html` 标题 —— 随 S7 完成（「动画宅的自我修养 · AnimePlay」+ lang=zh-CN）
- [x] 清死代码 / `console.log` —— 随 S1/S6 完成（console.log 实调用 103 → 0）；零散死代码持续清理（evo-9 后清 `getOriginalImageUrl`，提交 `e02c610`）

> 自由项是个「随时插队」的开放桶——上面四项已交付；将来若有新的零依赖小项，会继续在 [FUTURE.md](FUTURE.md) 的 Backlog 侧记录。

---

## ✅ S13 — 家园综合系统（基地养成 + 小队战斗重构 + 挑战塔闭环，已完成 2026-06-30）

把冻结的家园升级为「基地 hub」：拥有的角色入住 → 离线挂机产出（经验/好感/知识点）→ 升级/配装进战力 → HR/UR 5 人队横板半自动战斗打挑战塔 → 塔奖励（角色经验/装备/知识点）回流。规则全部入纯 `engine/squad`，视图/store 只做编排。

- **A · 地基**：`/homestead` 解冻 + chibi 图片三级兜底（sprite→chibi→原立绘）。
- **A2 · 家园 2.5D 视觉**：俯视广场 + 四向序列帧行走（`utils/cardImage.ts` spriteSheetSrc / `HomesteadView.vue`）。
- **B · 挂机养成（存档 v13）**：`config/homestead.ts`（`computeIdleYield` 纯计算）+ `stores/homestead.ts` + `userStore.settleHomestead()`（封顶 12h、进家园结算、离线收益弹窗）。
- **C1 · 养成精简（存档 v14）**：养成砍为「等级（每级随机加点）+ 好感（6 档里程碑）」两轴；战力改纯加法 `generateBattleStats(base, statPoints, equipBonus)`；删训练/活动/对话/礼物/attributes。
- **C2 · 装备系统全栈**：`config/equipment.ts`（3 槽 × R..UR 名梗目录 + 塔掉落表 + KP 兑换价）+ equipment store + 配装/背包 UI + 塔掉落 + KP 兑换 + 战力接入（commits `f2d115b`/`46990b4`）。
- **D1–D5 · 小队战斗重构**：时间轴半自动引擎（`engine/squad/timedBattle.ts`，DEF 减伤/能量/大招/状态效果）；5 人队 + HR/UR 准入；`data/squadSkillKits.ts` 技能数据（6 原型模板）；横板半自动战斗 UI（`SquadBattleView` 拆分组件）；基地 hub 五面板整合（家园/角色/编队/探索/战斗，`HomesteadHubView.vue`）。

**Exit（达成）**：家园闭环「入住挂机 → 配装提战力 → HR/UR 小队打塔 → 回流」跑通；旧路由不 404；type-check/test/build 通过。

**后续**：S13 交付了完整骨架与数值管线，但 2026-07-01 对家园 hub 做的对抗性审计（8 维 × 每条 4 票投票，225 agent；50 确认/3 争议/1 否决）发现「角色差异化 / 养成决策 / 可重复循环」三处深度缺口 → 转为 [FUTURE.md](FUTURE.md) 的 **S14** 打磨路线。审计报告：[orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)。

---

## ✅ S14 — 家园 hub 深化（差异化 + 决策 + 循环）— 全部完成 2026-07-02

**背景**：S13 把家园 hub 的骨架（UI / 数据 / 数值管线）搭完了，能跑、不崩、数字算得对。但 2026-07-01 对抗性审计（8 维 × 每条 4 票投票，225 agent；50 确认 / 3 争议 / 1 否决，报告：[orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)）判定它是**「五环拼装的半成品」**——在「差异化—决策—闭环」三个决定可玩性的关节上同时断裂。

**三大系统性根因**（S14 就是逐个拆解它们）：
1. **角色在战斗层零差异化**：`data/squadSkillKits.ts` 用 6 个原型模板套 200+ 角色，同原型技能数值逐字节相同只换名；项目已有的 66×2 条唯一技能资产（`/battle` 域跑着 134 个 handler）在小队战斗里被 `getSquadSkillKitForCharacter` 只取 `.name`，effect 整块丢弃。
2. **养成/配装无玩家决策**：升级随机加点（`engine/nurture/rules.ts` `distributeRandomStatPoints`）直接进实战五维、不可洗点、无 role 定位；装备任意戴任意、纯线性五维、拿到即终态。
3. **无可重复循环，卡关即断更**：挑战塔单调递增、通过层零收益（`stores/pve.ts` + `engine/squad/rewards.ts`），塔外无可重复 PvE；家园设施纯展示不可升级、comfort 是死数值。

**定位守则**：本项目是**单机向二次元收集网页游戏**，不追 PCR 的付费深度与竞技强度。对标 PCR 是为了照见缺口——**补差异化与循环是收集向玩法的底线，追付费深度 / 随机刷取词条则大可不必**。凡触 engine 的改动继续守四条铁律（确定加点 = 去 rng；position/crit/buff 叠加逻辑进 `engine/squad` 纯层；任何掉落/roll 走注入 RNG；存档字段三处同改 schema/migrations/装配器）。

> ⭐ = 低成本高收益（改动小、杠杆大，多为「已有能力接线」）。每项后括号内为审计报告编号。

### ✅ S14-A · P1 急救（把「半成品」补成「完整玩法」，多为接线级，独立可上线）— 已完成 2026-07-01

> ✅ **S14-A 全部 6 项已完成**（product-loop `--tier1 on --mode all`，3 轮 + 1 纠偏轮；17 源文件 +1124/−85，SAVE_VERSION→15，653 测试全绿，engine 纯净）。落地实况与原始设想的偏差（以实现为准）：SA-T3 走「base 五维比例确定分配」而非新增 role 存档字段（正则定位不可靠，绑上去会扩散误判）；SA-T4 = **10 个招牌 UR 纯数据覆盖**（`SIGNATURE_KIT_OVERRIDES`，description 由 `describeSquadSkill` 自动派生锁死「描述≠行为」，**严禁复用 /battle effectId**——两套运行时不通）；SA-T5 = **周期封顶 + 缩水扫荡**（`sweepFloor` 独立 action，不推进层）；SA-T6 = Plan A（explore「开始挑战」直达进战、battle tab 不复活 towerMode 编成器）。产物见 `docs/orch/`（product/evolution/research-audit-report + scout + plan + negotiation + gen_status + eval），沉淀见 `docs/plans/pitfalls.md` S14-A 段。**下一步 = S14-B（战斗手感与深度）。**

- [x] ⭐ **接通编队编辑**（P1-3 / P1-4）：`HomesteadHubView.vue` 的 squad 面板当前全只读、formation-slot 无 `@click`；而 `stores/pve.ts` 的 `updateSquadMember` / `updateSquadName` 已存在并经 userStore 暴露。给 slot 加点击 → 复用 `CharacterSelectModal` 换人、squad-select 加改名、空位显示可点「+添加」。**纯接线。**
- [x] ⭐ **统一敌人预览种子**（P2-17，真 bug）：hub 探索面板 `enemyPreview` 用 `createSeededRng(floor*7919+17)`，而 `SquadBattleView` `refreshTowerEnemies` 用 `Math.random` → 玩家看到的敌人 ≠ 打到的敌人。让两者共用同一确定性种子（按 floor 派生），或预览读持久化的 towerEnemyData；同步决定是否保留「刷新敌人」。
- [x] **消解三 tab 结构冗余**（P1-3）：编队 / 探索 / 战斗三个 tab 与 SquadBattleView 内嵌爬塔页信息三重重复。二选一——(A) squad tab 成唯一编队入口（可点开换人）、explore 保留预览 + 「开始挑战」直接触发、battle 只承载演出；(B) 删 squad+explore 两只读 tab，把 towerMode 编成屏作为 explore 内容。
- [x] **升级加点改确定成长 + 引入 role 定位**（P1-5 / P2-9）：把 `distributeRandomStatPoints` 换成按 base 五维比例的确定分配（保总量、去 rng，一行改 store，不动存档结构）；给角色加 `role` 字段（可复用 archetype），按定位给成长倾斜（guardian 偏 hp/def、striker 偏 atk/spd），杜绝「全堆攻击的坦克」。⭐ 确定分配本身极低成本。
- [x] **让个人技能驱动至少一条差异化技能位**（P1-1 / P1-2）：让 skill1 或 ultimate 复用 `data/urCharacterSkillsGenerated.ts` 的 effectId / 数值（把 `/battle` handler 映射到 squad effect）；头部 20 个招牌 UR 优先手写唯一 kit，其余回落原型。**这是接通已有资产、直接兑现角色差异化的最高杠杆项。**
- [x] **引入一条可重复日循环**（P1-6）：扫荡 / 重复挑战已通层给缩水 KP + 经验 + 低概率装备，加每日次数封顶防通胀；或塔外单开经验 / 装备副本每日 N 次。解决「卡关即断更」。
- **Exit**：hub 内可直接换人建队；预览即所战；升级成长可预期、角色有定位；至少头部 UR 在战斗里表现不同；卡关玩家仍有每日主动产出。type-check / test / build 通过。

### ✅ S14-B · 战斗手感与深度（P2）— 已完成 2026-07-01

> ✅ **S14-B 全部 5 项已完成**（product-loop `--tier1 on --mode all`，3 轮 + 1 纠偏；纯战斗规则/UI，零存档改动 SAVE_VERSION 仍 15，670 测试全绿，engine 纯净）。落地实况（以实现为准）：SB-T1 = 超时按「存活数 + HP%」三态裁决 `resolveTimeout`（`timeoutWin` 发奖 / `timeoutLoss` / `timeoutDraw` 全 0）+ 战场倒计时/进度条 + `DEFAULT_MAX_TIME_MS` 单一时限源；SB-T2 = `resumeTimedBattle` 前缀冻结 + RNG 快照/恢复（**真无跳变**，非「整场重算截后缀」伪平滑）+ `ManualUltimateOrder.targetId` 单体大招选目标（AOE/self 忽略、死目标回退）+ View 复用同一 engine 判据 gate「选目标」UI；SB-T3 = `BASE_CRIT_RATE=0.05` 运行时单位注入（`DEFAULT_BATTLE_MODIFIERS` 保持 0、不删 crit 字段）+ 复用 `critRateUp` 加成轴，**收尾①暴击 UI 显形**（浮动金色 `CRIT` 数字 + 日志记暴击，纯 view）；SB-T4 = `POSITION_DAMAGE_TAKEN` 后/中排单体减伤、前排 =1、AOE 不减伤（engine 纯层）；SB-T5 = `sumStackableStatusValues` 按来源累加 + per-kind 上限 clamp（两处聚合一致改），控制类/shield/dot/hot 不进累加。产物见 `docs/orch/`。**下一步 = S14-C（角色差异化与养成长线）。**

- [x] **90s 超时改按剩余 HP% 判胜 + 加倒计时**（P2-4）：`timedBattle.ts` 超时当前一刀切判负；UI（`SquadBattlefield.vue`）只显 elapsedMs 无倒计时。加醒目倒计时 / 进度条；超时按双方剩余 HP% 裁决。
- [x] **手动大招能选目标 + 增量推进**（P2-5）：当前 autoUltimates 默认 true、手动开大会整场 `regenerateBattleSimulation` 重算导致回放跳变，且目标是 skill 写死。让手动大招能选目标；默认设关或首战引导；改增量推进而非整场重算。
- [x] **让暴击系统活起来**（P2-2 / P2-6）：`formulas.ts` `critRate` 默认 0、全场唯一暴击源是 striker passive 的 10%，canCrit/critDamage 大量成死代码。给全体基础 critRate（如 0.05）并让装备 / 养成 / buff 能加暴击做成真实成长轴；或彻底删除 crit 字段避免死系统误导。
- [x] **给前中后排真实机制或去掉视觉**（P2-1）：position 目前只用于 `targeting.ts` 的 front/backEnemy 排序，`formulas.ts` / `effects.ts` 完全不读 position。给它真实机制（后排近战减伤 / AOE 衰减 / 前排默认仇恨）；若不做就去掉前中后排视觉，别让 UI 承诺机制而代码没实现。
- [x] **同类可叠加 buff 改按来源累加设上限**（P2-3）：`effects.ts` `maxRuntimeStatusValue` 现同 kind 取 Math.max → 双辅助价值被压平。可叠加类（atkUp/defDown/spUp/critRateUp）改累加设上限，控制类（stun/silence）保持不叠加。
- **Exit（达成）**：战斗有倒计时与 HP% 超时裁决；手动大招可选目标且无回放跳变（有意义的操作杠杆）；暴击活起来且玩家可感知、站位减伤、团队增益按来源累加——三条策略轴均成立；引擎特征测试覆盖新规则。

### ✅ S14-C · 角色差异化与养成长线（P2）— 已完成 2026-07-01

> ✅ **S14-C 全部 6 项已完成**（product-loop `--tier1 on --mode all`，2 轮即达成——第 2 轮 Planner 把 SC-T4/SC-T6 与 SC-T3 的 v16 bump 合批、省一次迁移；714 测试全绿、engine 纯净、SAVE_VERSION 15→16）。落地实况（以实现为准）：SC-T1 = `resolveRole` **单一定位真相源**（种子 `SIGNATURE_KIT_OVERRIDES.role` → 显式 `id→archetype` 表 → 正则兜底），`override.role` 终于生效、纠正 Fate/音乐/爆裂系误判、补上 SA-T4 缺的 CI 守卫；SC-T2 = 26 个 HR **个人技名**（只改名、`describeSquadSkill` 自动派生描述、守死「描述≠行为」+「名不暗示冲突机制」双红线；差异化被动留 backlog 待突破解锁）；SC-T3 = **星级/突破**（`breakthroughCharacter` 经 `collection.consumeCharacterCards` 消耗重复卡保本体、`breakthrough` 标量存档 v16、永久五维加成派生）；SC-T4 = 好感里程碑给**永久小幅加成**（封顶 +15%，纯派生）+ 每日好感互动（跨天重置）+ 好感溢出转 KP；SC-T5 = `assessSquadReadiness` 纯函数塔层**软战力门槛**（ready/risky/underpowered，不改 eligibility、我方=敌方同口径顺带收敛 P3-6）；SC-T6 = NurtureView 拆无壳可内嵌、hub characters 单标题单空态、/nurture 重定向保留。**关键架构**：突破 + 好感永久加成均经**单一 seam** `resolveNurturedBattleStats`/`resolveMemberBattleStats`（statPoints + 突破 + 好感% 纯加法）进战力，squadPower 消费端统一 → 永不新增第 4 条战力通路，且突破/好感真进 squadPower → 联动 SC-T5 门槛。产物见 `docs/orch/`。**下一步 = S14-D（家园机制闭环 + 经济闭环）。**

- [x] **废弃正则 inferArchetype，改显式 archetype 字段**（P2-7）：当前靠拼接文本跑 6 条正则 first-match-wins，误判频发（阿尔托莉雅被 `圣剑|Fate` 判成魔法师、含「音乐」角色一律先命中 support…）。在角色数据显式声明 archetype（生成脚本一次性人工校对 66 UR），过渡期至少按「专属技能名 > description > name > tags」加权。
- [x] **HR 角色补个人技能绑定**（P2-8）：`urCharacterSkillMap` 只登记 UR，HR 名与效果 100% 走原型模板，而塔允许 HR 出战。为 HR 补个人技能名映射，长期给至少 1 条差异化被动。
- [x] **补一条有决策的养成长线**（P2-10）：养成仅等级 + 好感两薄轴。建议加星级 / 突破（达上限后靠重复角色碎片突破解锁更高上限），把重复抽到的角色转化为突破资源。
- [x] **好感等级化，给永久意义 + 回归钩子**（P2-11 / P2-23）：里程碑现只给一次性 KP、好感无战力 / 永久意义、领完后完全无用。除 KP 外给永久小幅五维% / 被动；高好感解锁剧情 / 语音 / 皮肤；加每日好感互动（送礼 / 对话）；好感溢出可转 KP。
- [x] **挑战塔加战力 / 等级门槛**（P2-12）：`eligibility.ts` 只校验稀有度 / 技能包，Lv.1 生角色可直接进塔。给塔层加战力门槛（或推荐战力提示 + 低于阈值明显劣势），把养成重新钉进探索循环。
- [x] **NurtureView 拆成无壳可内嵌组件**（P2-18）：角色 tab 把整页 NurtureView 原样内嵌导致双标题 / 双空态 / 长滚。去掉 min-h-screen / 页标题 / 独立空态，或删 hub 内精简摘要只留 NurtureView。
- **Exit（达成）**：角色定位判定稳定可预期（resolveRole 单源）；HR/UR 都有差异化技能名；养成有星级/突破长期目标线；好感有永久意义 + 每日回归钩子；塔有推荐战力软门槛要求养成。

### ✅ S14-D · 家园机制闭环 + 经济闭环（P2 深度）— 已完成 2026-07-01

> ✅ **S14-D 全部 5 项已完成**（product-loop `--tier1 on --mode all`，2 轮达成——第 2 轮 Planner 把 SD-T3 与 SD-T2/T4 合批；765 测试全绿、engine 纯净、SAVE_VERSION 16→17，S14-A/B/C 无回归）。审计根因 D/E 收口：家园从「静态面板」变「可投资经营系统」——`facility` 独立存档域 v17（三设施 KP 升级 +8%/级乘区 + comfort 每 10 点 +1% 封顶 20% 真进产出 + 离线封顶随级抬升）；无底 KP sink（设施无硬上限 + 成本指数递增 `120×1.4^(lv-1)`）；装备 homeEffect% ×0.33 弱化、家园产出主体归设施、comfort 独立保留、EquipPicker 补挂机 delta；重复装备 `dismantleItem` 按稀有度回收 KP（`findEquippedBy` 守卫 + 明显低于兑换价防套利，材料/合成留 S14-E）；经验曲线 `(level-1)^1.6×900`（满级 140 万 ≈ 旧 1/7）+ 满级经验每 2000 溢出兑 1 KP + 补习随等级递增。**关键防回归**：SD-T2 弱化装备 homeEffect 时保留了 comfort 轴，未熄灭 SD-T1 的 comfort 软加成（跨轮硬回归风险被规避）。产物见 `docs/orch/`。**下一步 = S14-E（装备深度）。**

- [x] **三设施做成可升级产出乘区**（P2-25 / P2-26 / P2-24，核心动作）：`HomesteadView.vue` 三设施（训练区 / 休息区 / 资料室）现纯展示、comfort 是死数值、挂机产出恒定不随进度成长。新增 facility 存档域（schema/migrations/装配器三改），用 KP 升级每级 +X% 对应产出，comfort 接一档真实软加成，封顶随设施等级抬升 → 形成「挂机产 KP → 升设施 → 挂机更快」自循环与无底 KP sink。 ✅ S14-D 第 1 轮：facility 域 v17（独立 store），每级 +8% 乘区（独立于装备 0.6 cap）、comfort 每 10 点 +1%（封顶 +20%）真进产出、离线封顶 12h+总级数×0.5h，UI 三设施升级入口 + 下一级收益预览同源结算。
- [x] **装备的家园 homeEffect 逐步剥离到设施**（P2-13）：同一件装备既定战斗五维又定家园挂机%，两套目标抢同槽、选装口径打架。把家园加成移到「设施升级」承载，装备回归纯战斗；过渡期先在 `EquipPickerModal` 补挂机 delta 预览（⭐ 低成本子项）。 ✅ S14-D 收尾轮：`EQUIPMENT_CATALOG` 每件 homeEffect 产出%（exp/affection/knowledge）统一 ×0.33 弱化到「小额佐料」量级（≤6%），家园产出主体归设施乘区（SD-T1）；comfort 全保留（独立软加成轴）；`EquipPickerModal` 新增家园挂机 before→after delta（三槽求和、语义色、同 resolveHomeEffect 口径）。
- [x] **给重复装备加回收 / 分解出口**（P2-21）：`drops.ts` 每层 50% 掉一件、`equipment.ts` addItem 只 push 从不去重，齐装后纯堆积垃圾。分解为 KP（复用 codex 分解范式）、或 N 件合成升级材料（一箭双雕做装备强化 sink）、或转碎片计数。 ✅ S14-D 收尾轮：`equipment.dismantleItem(uid)` 移除游离件 + 按稀有度回收 KP（`dismantleValueForRarity` 纯函数 R50/SR150/SSR500/HR1200/UR3000，明显低于兑换价防套利）；已装备件 `findEquippedBy` 守卫 + UI 禁用双保险；门面 `userStore.dismantleEquipment` + saveToServer；本轮只做 KP 回收（材料/合成留 S14-E）。
- [x] **修经验曲线 / 产出错配**（P2-19）：满级需 980 万经验，而挂机 2400/12h、塔第 100 层每人才 1040，满级后经验全部沉没。把曲线压到与产出匹配（如 level^1.6）或提产出；满级经验给溢出出口（转道具 / 少量 KP）；补习产出随等级递增。 ✅ S14-D 收尾轮：`getRequiredExpForLevel` 改 `round((level-1)^1.6×900)`（满级 140 万，旧 980 万的 ~1/7，严格单调递增守卫）；满级经验溢出 `addCharacterExp` 满级分支每 2000 点自动兑 1 KP（`expOverflowExchange` 带 carry 结转，走 profile.earn）；补习 `tutoringExpGain(level)=400+level×20` 随等级递增，NurtureView 按钮文案动态。
- [x] **加无底 KP sink**（P2-20）：KP 唯一硬通货但 sink 全是买断目录（装备 45 件封顶、图鉴、补习），集齐后无处可花必然溢出贬值。装备强化 / 精炼、角色突破 / 星级、每日刷新定向兑换或塔商店限量高价物。 ✅ S14-D 第 1 轮：设施升级即无底 sink——无硬上限（Lv.99 极高上限）+ 成本指数递增 `120×1.4^(level-1)`（测试锁「第 N 级 > 第 N-1 级」），全走 `profile.spend('knowledgePoints')`，成型账号 KP 有持续去处。
- **Exit（达成）**：家园从「单页面板」变成「可投资的经营系统」；KP 有长期去处（无底设施 sink）；重复装备有出口（分解回 KP）；经验不再打进黑洞（曲线重标定 + 满级溢出转 KP）。

### ✅ S14-E · 装备深度（P2）— 已完成 2026-07-02

> ✅ **S14-E 全部 3 项已完成**（product-loop `--tier1 on --mode all`，3 轮 + 1 收口纠偏；835 测试全绿、engine 纯净、SAVE_VERSION 17→18，S14-A/B/C/D 无回归）。落地实况：SE-T1 = 装备强化（`EquipmentItemSave.enhance` **v18** 三处同改 + v17→v18 迁移补 enhance:0/clamp[0,5]；`enhancedBonus` 纯函数每级 +8% 满级 Lv.5；`enhanceItem` 花 KP(`profile.spend`) + 吃 1 件同 defId 游离燃料，`findEquippedBy` 守卫，KP 成本远高于分解回收值防套利；经既有 `resolveEquipBonus` seam 进战力）；SE-T3 = `EquipmentDef.modifier`（critRate/damageUp/healUp/shieldUp 等）+ `resolveEquipModifiers` 独立 seam 求和 + 硬 clamp（critRate≤0.2），View 侧 **加法**注入 player setup（`BASE_CRIT_RATE + 装备值`，非覆盖 spread，守 SB-T3 基础暴击），8 件示例填充；SE-T2 = 3 组取向套装（攻击/坦度/节奏）`setBonusFor` 纯函数经 `resolveEquipBonus` 汇入、**只走五维加法、不碰 modifier、与 enhance 正交**，`previewEquipBonus`同源（预览=实战）。**关键架构**：强化(五维×enhance) / 套装(五维加法) 走 `resolveEquipBonus` 一条 seam，modifier(战斗旋钮) 走 `resolveEquipModifiers` 另一条 seam 注入 BattleModifiers——两条 seam 各司其职、无第 N 套战力口径。**收口纠偏**：R1 Generator 遇 API 中断致测试 fixture 未同步(gate RED)，补齐 4 处陈旧断言 + SE-T1a/T1c 缺失测试 + 修一个 TS4025 真 bug 后全绿。产物见 `docs/orch/`。**下一步 = S14-F（P3 打磨）。**
> 🟢 未做（非阻塞 backlog）：SE-T2g 齐套瞬间点亮动画、重复件「既可分解也是强化燃料」双 sink 信息提示——归 S14-F 顺手补。

- [x] **加装备强化 / 等级**（P1-7）：`EquipmentItemSave` 现仅 `{uid,defId}`，数值恒等于 def 静态值、拿到即毕业。给实例加 level/enhance（schema+migrations+装配器三改），用重复装备 / 材料做强化燃料，把毕业曲线从「拿到即满」拉长为「拿到 → 强化到满」。（与 S14-D 的分解出口互为燃料。）
- [x] **加确定性套装 / 原型条件加成**（P2-14 / P2-16）：装备任意戴任意、稀有度纯线性、无搭配维度。**优先做确定性套装**（2~3 组，塑造 build），或对匹配原型角色给条件加成（复用 archetype）。**随机副词条谨慎**——审计对标指出 PCR rank 装恰是确定属性无随机 roll，随机词条是把原神 / 暗黑刷取误挂 PCR 名下，与本项目单机向定位不符。
- [x] **扩展 EquipmentDef 支持战斗 modifier**（P2-15，增强项）：`formulas.ts` 已内建 critRate/critDamage/damageUp/healUp 等且真实消费，但装备只能改 5 维。可选：给 EquipmentDef 加 modifier 字段，resolveEquipModifiers 注入 BattleModifiers，让装备够到更多战斗旋钮。
- **Exit（达成）**：装备有可持续消耗（强化到 Lv.5）与搭配空间（3 组套装 + modifier 战斗旋钮）；装备开始塑造角色定位而非纯线性堆数值。

### ✅ S14-F · P3 打磨（一致性与内容缺口，穿插进行）

- [x] ⭐ hero 区「家园→角色→编队→探索→战斗」循环胶囊是不可点静态装饰、与 tab 1:1 重复（P3-1）→ 删掉或做成明显非导航示意图。
- [x] ⭐ 补习升级：成本随等级递增 + 批量 / 一键升级 + 分档经验道具（P3-2）。
- [x] 家园驻留低频定时结算（60s）刷新预计累积 + 封顶进度条，卸载清除（P3-8）。
- [x] 统一敌我战力口径：我方含养成、敌方 floorPower 用原始属性，两数字不同量纲同屏并列（P3-6）→ 统一 `calculateBattlePower` 或直接给推荐战力线 / 胜率。
- [x] 家园收益封顶改分层递减：现按全体合计硬顶 0.6，约 4 件同向 UR 即触顶（P3-7）。
- [x] 墙钟回拨钳位（P2-28 的廉价卫生改动）：`settleHomestead` 用 `Date.now()`，改系统时间可刷。加 `now < lastSettleAt → 记 0 并把 lastSettleAt 夹到 now`；单机向危害有限，仅作卫生改动。
- [x] 家园日常委托（P3-10）：daily 域平行 commission 子域（挂机 / 爬塔 / 强化三条本地委托 + 今日全清 bonus，升 v19）。
- [ ] 中期内容（留 S15+）：轻量家具 / 布局系统（P3-4，落 furniture 存档域）、入住羁绊 / 差异化速率（P3-5）、装备定向掉落保底 / 碎片（P3-3）。
- **可暂不处理**（经模拟证实当前无可达触发路径，玩家不可感知，留待开放弃卡 / 脏档校验时再补）：inferArchetype 稀有度兜底（P3-9）、结算前复核当前拥有数（P3-11）。

### 🗳️ 审计争议项（决策参考，不默认排期）

- **战斗是「预演算 + 回放」玩家近观众**（争议 2/4）：证据属实，但「手动大招时机 + 战前配队配装」已达 PCR 半自动平价；**不推倒战斗模型**，归入 S14-B 打磨即可。
- **tab 缺 tablist/aria 语义 + home 深链被 replace 抹空**（争议 2/4）：降为 P3，其它 UI 改动时顺手补 role/aria。
- **装备加成占比过低**（❌ 已否决 1/4）：该发现用 `STAT_DISPLAY_REF`（`config/nurture.ts` 明确标注仅显示用、不进战斗）当分母，是幽灵分母；真实 battle_stats 口径下 UR 武器 atk+108 是 40%+ 增量。**不作为任务，勿据此调低装备权重。**

**S14 整体 Exit**：家园 hub 从「能跑的半成品」变成「有收集意义的完整玩法」——角色在战斗里有差异、养成 / 配装有玩家决策、循环有可重复产出（卡关不断更）、家园是可投资的经营系统。每个 S14 子阶段独立可合并、做完游戏都可玩。

> **最脆弱假设**：一次性给全部 HR/UR 手写差异化技能会膨胀。变形求生：S14-A 只接通「个人技驱动一条技能位 + 头部 20 UR 手写」，其余回落原型；差异化按角色热度增量补齐，绝不上线「描述≠行为」的假技能（CLAUDE.md Known Debt 明令根除）。


> **后续 / 交叉引用**：S14 源自 2026-07-01「家园 hub 对抗性审计」（[orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)，8 维 × 4 票投票，225 agent）；A~F 共 33 项经 6 轮 product-loop `--tier1 on --mode all` 落地，逐 sprint 的 feat+merge 提交见 git 历史（`c564c74` A / `df9db39` B / `531b599` C / `76881c1` D / `ac63b04` E / `55b5e89` F）。存档 v15→v19。中期内容（家具/羁绊/定向掉落）留 S15+。

---
## ✅ S15 — 家园 hub 内容补完 + 测试稳定（S14 遗留收尾）— 全部完成 2026-07-02

> ✅ **S15 全部 4 项已完成**（product-loop `--tier1 on --mode all`，3 轮，R2/R3 各遇一次 API 中断后 resume；917 测试全绿、连跑 3 次无 flaky、engine 纯净、SAVE_VERSION 19→20、S14 无回归）。落地实况：S15-T1 = **注入时钟接缝** `settleHomestead(nowOverride)`（把「时钟」与 RNG 一样降级为注入依赖，根除 `homestead.test.ts` 真实 `Date.now()` 双读 × 邻居 fake-timers 的跨 worker flaky，并为 S12 权威时间预留唯一入口）+ 统一 fake timers；S15-T3 = `engine/homestead/bonds.ts` `computeBondBonus`（同作品 ≥2 人等确定性集合羁绊，硬上限，**队伍级独立乘子经 `computeIdleYield` 口径**，派生免存档）+ 三处 UI 显形（含决策页 `HomesteadManageModal`）；S15-T2 = `furniture` 独立存档域 **v20**（KP 兑换家具目录 + 广场摆放 + 加成复用 `EquipmentHomeEffect` 形状经 `sumHomeEffects` 并入 `computeIdleYield`，三处同改 + 往返/脏档/子集测试）；S15-T4 = 槽位**保底 pity** `rollTowerDropWithPity`（engine 纯函数注入 RNG+计数、复用 v20、**防墙钟守卫：重复低层/顶层 999/扫荡均不推进 pity**、脏档 clamp、UI 显形）。产物见 `docs/orch/`。**中期内容剩项（家具布局深化/更多羁绊/碎片兑换）与 flaky 已根除——家园 hub 内容层补完。下一主线 = S11 / S12。**

**背景**：S14（A~F，33 项）已把家园 hub 从「半成品」补成完整玩法并全部合并归档。收尾时留下两类未做项——① 一处 flaky 测试（S14-F 复验时 back-to-back 跑偶发 2 失败、standalone 全绿，疑与 SF-T3 60s 定时器 / SF-T6 settle 的 `Date` 或并行争用相关）；② S14-F 明确标「留 S15+」的中期内容（比 P3 打磨重、属内容扩展而非收尾）。本 Sprint 把这两类收干净，让家园 hub 内容层也补完。**证据源**：[orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)（P3-3/4/5）+ S14 完成史见 [HISTORY.md](HISTORY.md)。

**定位守则**：延续 S14——单机向二次元收集网页游戏，内容做「轻量、确定性、塑造选择」，不追随机刷取/付费深度。凡触 engine 守四条铁律；存档变更三处同改（schema/migrations/装配器）+ 往返测试，本 Sprint 至多升一次 SAVE_VERSION（现 19 → 20）。战力/收益仍走既有单一 seam（`resolveEquipBonus`/`resolveMemberBattleStats`/`computeIdleYield`），别另拼口径。

- [x] **S15-T1｜flaky 测试稳定化（工程债，零玩法改动）**：定位 S14-F 期间偶发的 2 个 flaky 失败（先 grep `setInterval`/`Date.now`/`new Date` in 测试与被测组件，重点查 `HomesteadView` 60s 定时器、`userStore.settle.test.ts`、`daily`/`settle` 的跨天判定）。用注入时钟 / `vi.useFakeTimers` / 固定种子替换真实时间与真随机依赖，消除时序/争用型不稳定。**Exit**：连跑 `npm run test` 3 次全绿、无真实 `Date.now`/裸 `setInterval` 泄漏进被测路径。
- [x] **S15-T2｜轻量家具 / 布局系统（P3-4）**：新增 `furniture` 存档域（v20），KP 兑换家具目录（名梗风，仿 equipment catalog），摆放进家园广场（复用 `WALKABLE_ZONES` 坐标或简单固定槽位），每件给小额 comfort/产出加成（**经既有 comfort 软加成 / 设施乘区口径汇入 `computeIdleYield`，不新拼收益口径**）。家园从「固定底图」变「可自定义基地」。存档三处同改 + 往返测试。**Exit**：可 KP 买家具、摆放持久化、加成真进挂机收益、往返保真。
- [x] **S15-T3｜入住羁绊 / 差异化速率（P3-5）**：让「选谁入住」有策略——给入住角色差异化挂机速率（按 role/rarity 倾斜 exp/affection，复用 SC-T1 `resolveRole`）或入住组合羁绊（特定角色/作品同住给小额加成）。engine 纯函数 + config，加成经 `computeIdleYield` 口径；羁绊/速率优先派生免存档。**Exit**：不同入住组合产出可辨、羁绊命中给确定加成、纯函数测试覆盖。
- [x] **S15-T4｜装备定向掉落保底 / 碎片（P3-3）**：塔掉落加**保底**（连续 N 次未出某槽/稀有度后保底该类）或碎片定向兑换（成就/周任务发碎片 → 换指定装备），缓解「纯随机掉落无定向」。保底计数若需持久化则复用 v20 bump（三处同改）；掉落 RNG 注入不破确定性测试。**Exit**：保底/定向真生效、pity 计数存档保真、掉落纯函数测试覆盖概率与保底边界。

> **排期建议**：第 1 轮 = S15-T1（测试稳定，先把地基夯实）+ S15-T3（入住羁绊，engine/config 轻量）；第 2 轮 = S15-T2（家具 v20，唯一存档重任务）；第 3 轮 = S15-T4（定向掉落）+ 收尾。合同见 [SPRINT.md](plans/SPRINT.md)（已就绪，`product-loop --tier1 on --mode all --max_iter 3` 可跑）。

> **后续 / 交叉引用**：S15 是 S14 家园 hub 深化的遗留收尾（flaky 测试 + S14-F 标 S15+ 的中期内容），3 轮 product-loop `--tier1 on --mode all` 落地（R2/R3 各遇一次 API 中断后 resume）。feat+merge 提交 `548d68b`/`308f222`；存档 v19→v20（家具 + 掉落 pity）。剩余 backlog（家具布局深化 / 更多羁绊 / 碎片兑换）见 [FUTURE.md](FUTURE.md)。

---
## 🔗 附录：审计问题 → Sprint 映射

历史可追溯表：审计各章节 → 处理它的 Sprint。S1–S10 行均已完成（纯回溯）；S11 / S12 行指向仍未开始的未来 Sprint（前瞻，非已完成工作，见 [FUTURE.md](FUTURE.md)）。

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
*归档于 2026-06-26。S0–S10 + Evolution + 战斗可读性还债 + 2026-06-24 产品循环为已完成工作；未完成路线见 [FUTURE.md](FUTURE.md)。*
