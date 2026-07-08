# AnimePlay 进化审计报告 — 家园 hub `/homestead`（product-loop --tier1 on --mode all，**第 5 轮 = 收官 re-audit**）

> 视角：Product Evolution Reviewer（核心完整性 / 竞争差距 / 功能深度 / 差异化）。北极星 = **把家园 hub 从「能挂机的数值面板」进化成让人愿意每天回来、愿意深度投入、愿意晒出来的基地玩法**。
> **本轮 = S16 收官轮，聚焦弧线切片 = 打磨（情感高点）+ 晒图（展示出口）+ 收尾**。前 4 轮把「关系 / 偶遇 / 家具 / 陈列 / 回访」做齐，本轮把情感巅峰打磨到位、给家园一个可展示的出口、收口全 Sprint。
> 方法：① 通读 1-4 轮全部落地（`HomesteadView.vue` **1366 行** / `usePlazaWalk.ts` 487 行 / `config/{homesteadDialogues,homesteadDaily}.ts` / `wrapped/buildWrappedStats.ts` / `components/ShareCard.vue` / `utils/shareImage.ts` / gen_status.md / eval.md / plan.md / SPRINT.md）做整体体验回顾 + 全面抓回归 → ② 针对「晒图 + 打磨」做定向竞品查（ACNH 梦境门牌 = 安全异步晒图范式 / gacha 里程碑 fanfare 分层）→ ③ 对「晒图内容该放什么」「哪些情感高点最该打磨」给可落地建议 → ④ 5 轮后家园的进化成熟度整体评分 + 技术健康度收官总评。
> 第 5 轮 re-audit（收官）。日期：2026-07-07。

---

## Executive Summary

**产品进化成熟度：8.3 / 10（较第 4 轮 7.8 实质进步；这是 5 轮弧线的收官评分）。**

5 轮弧线走完，家园已经从「一张会挂机的壁纸」长成了**一个有情感、有所有权、有回访理由的活基地**——这是一条完成度很高的进化曲线。回看四轮地基（全部零升档、SAVE_VERSION 稳在 20、每轮都顺手还债），家园现在同时立起了**三根支柱**：

- **时间轴情感（1-2 轮）**：角色会对你说话（tap 台词 / 里程碑感言）、会对彼此说话（同作品偶遇 + 上浮♡）、好感在家园当场产当场消费（里程碑显形 + 领取）。
- **空间轴所有权（3 轮）**：买的家具摆在场景固定槽位、emoji + 名牌肉眼可见、y-sort 正确遮挡——「我的基地」第一次视觉成立。
- **收藏轴 + 回访轴（4 轮）**：抽到的 UR 陈列成橱窗（endowment 战果墙）+ date-seeded 今日特殊角色（每日心跳）+ 季节浮层（长期回响）。

**收官轮要跨的最后一道门槛，正是把这个「已经很完整的基地」推向"值得被看见"** —— 这是留存曲线从「我为自己玩」跃迁到「我玩给别人看 / 我因为别人看而更投入」的关键一跃，也是这一品类（收集 + 家园）长留存的天花板动作。SPRINT 收官轮点名的三件事精准对应了 4 轮后仅剩的三个空洞：

1. **情感巅峰被做平了（打磨债，本轮最高杠杆之一）**。这是我复核代码后确认的**最实在的一条**：领「命运」（bond_6，阈值 4000、称号"命运"、这是玩家和一个角色关系的绝对巅峰）和领「初识」（bond_1，阈值 100、第一次达标）——**反馈一模一样**。`onClaimBondMilestone`（`HomesteadView.vue:483-488`）无论哪一档，都只弹同一个 `bondFloat` 文字飘条，仅台词池不同，**视觉呈现零分级**。玩家爬了 4000 好感的巅峰时刻，和第一次达标 100 好感，得到的是同一个轻飘飘的小字条。这是「巅峰时刻被做轻」的教科书案例——**投入越大的时刻，越该被隆重对待**（gacha 品类用 fanfare 分层做这件事：普通抽卡一道光、UR 出货整段过场动画）。
2. **家园没有展示出口（晒图，本轮结构性新增 + 长留存外化钩子）**。玩家现在拥有一个漂亮的基地：入住角色、摆好的家具、一柜子 UR、命中的羁绊、今日特殊角色——**但这一切只有他自己看得见**。4 轮的所有 endowment（陈列越显形越值钱）都停在"我看得见"，没有推到"给人看"。手办柜研究的第三条心理（陈列即身份信号 / 自我表达）在这里完全没兑现。这是**长留存的外化出口**：ACNH 的梦境门牌之所以是留存神器，正因为它把"我建的岛"变成了"我发出去、别人来逛"的社交货币。
3. **4 轮遗留的体验债 + Sprint 收官核对（收尾）**。有两个 **pre-existing dead computed**（`effectText` / `comfortBonusText`，`HomesteadView.vue:377/379，模块级定义、模板从不引用`），第 2-3 轮已进 backlog，本轮该顺手清；加上禁用态"差多少"提示等 nice-to-have；以及全 Sprint 的机制无回归核对。

**本轮三条建议的优先级排序（收官视角）：**

- 🔴 **R1｜晒图 / 家园快照分享图（本轮结构性命门 + 长留存外化出口）**——纯前端 Canvas 出图，**直接复用现成的 `ShareCard.vue` + `buildWrappedStats.ts` + `utils/shareImage.ts` 三件套**（项目已有一套打磨过的、规避了 cross-origin taint 的晒图管线），把家园状态聚合成一张文字/emoji 统计卡。这是把 4 轮 endowment 从"我看得见"推到"给人看"的唯一动作。
- 🔴 **R2｜高档里程碑隆重庆祝（情感高点打磨，本轮最高杠杆之一）**——给 `onClaimBondMilestone` 按 `BOND_MILESTONES` 档位分级反馈：低档保持现有小字条，高档（bond_5「羁绊」/ bond_6「命运」）叠一层隆重庆祝（全屏/半屏 fanfare + 角色名 + 称号 + 光效）。纯前端动效、零数值、零存档。
- 🟡 **R3｜收尾体验债收口 + Sprint 收官核对**——清两个 dead computed、收禁用态提示等 nice-to-have、核对 S16-T1..T11 全 `[x]` 且与实现一致、S14/S15 33+ 机制无回归、SAVE_VERSION 仍 =20、`npm run test` 连跑 3 次全绿。

**★ 升档拍板（收官轮明确表态）**：**晒图 + 打磨天然零存档需求，本轮零升档、SAVE_VERSION 保持 20。** 分享图是**只读快照聚合**（读 `homestead.placedCharacterIds` / `codex.characterCompletion` / `collection` / `furnitureStore.placedIds` / 羁绊派生 / 今日特殊，全是现成派生源）；庆祝是纯动效。**本 sprint 唯一 v21 bump 五轮全程未消耗**——这是刻意的、健康的纪律（"能派生的一律派生"），收官轮不该为晒图/打磨破功。若未来真做「自定义家具摆位」（F1，坐标非持久化不可）再用不迟。

---

## Phase 1: 核心完整性（5 轮后的整体成熟度）

### 1.1 5 轮弧线闭合了什么（收官全景）

```
第1轮 关系回路接通    ：挂机产好感 → 家园显形里程碑 → 一键领取 → 角色对我说话（bondFloat/petBubble/台词库）
第2轮 关系深化        ：两同作品角色广场靠近 → 错峰对话气泡 + 上浮♡ → 关系在场景可见（偶遇）
                       入住决策点 → 关系预告「住一起会偶遇聊天」→ 广场兑现（T4↔T6 闭环）
                       顺手还债：漫步/偶遇场景层抽进 usePlazaWalk.ts
第3轮 投入可见        ：买的家具 → 场景固定槽位 emoji + 名牌肉眼可见 → y-sort 正确遮挡（T7）+ 陈列 X/7（T8）
第4轮 收藏 + 回访     ：抽到的 UR → 家园橱窗头像墙 + 完成度 chip（T9）
                       date-seeded 今日特殊角色 ☀ + 今日专属台词（T10）+ 季节浮层（T11）
第5轮 打磨 + 晒图 + 收尾（本轮）：情感巅峰隆重化 + 家园快照晒图 + 遗留债收口
```

**成熟度判断**：5 轮后，家园在「进来的理由（回访）→ 待在这里的理由（情感 + 所有权）→ 出去传播的理由（晒图）」这条完整留存漏斗上，**前两段已经很扎实，第三段（传播）正是本轮补的最后一块**。这是一条罕见地"每轮都补真实结构性缺口、不灌水、不叠新乘子"的进化曲线——收官评分 8.3 的主要支撑就是这个"完整度"。

### 1.2 4 轮后仅剩的核心缺口（对照本轮切片）

| 环节 | 竞品标配 | AnimePlay 家园现状（4 轮后） | 缺口等级（收官） |
|---|---|---|---|
| **展示出口（晒图 / 快照分享）** | ACNH 梦境门牌 / 成绩卡晒图（本仓已有 ShareCard） | 家园零展示出口，一切只有自己看得见 | 🔴 本轮结构性命门（长留存外化） |
| **情感巅峰隆重化（高档里程碑 fanfare）** | gacha UR fanfare 过场 / BA 好感满级 CG | bond_1 与 bond_6 领取反馈**完全一致** | 🔴 本轮最高杠杆打磨债 |
| **收取瞬间庆祝反馈** | AFK-chest 开箱揭晓 / idle 收益弹跳 | 大额弹窗有，零碎静默入日志（合理），但收取瞬间无"爽"的微反馈 | 🟢 本轮微打磨 |
| **偶遇符号 / 气泡微打磨** | — | 已可用，手感可再抛光 | 🟢 nice-to-have |
| **遗留 dead code 清理** | — | `effectText`/`comfortBonusText` 两个 dead computed（377/379） | 🟡 收尾必清 |

### 1.3 情感巅峰打磨债 —— 代码级确认（本轮最实在的一条）

复核 `HomesteadView.vue:483-488`：

```ts
function onClaimBondMilestone(charId: number, milestoneId: string) {
  if (!userStore.claimBondMilestone(charId, milestoneId)) return;
  const card = gameData.getCharacterCardById(charId);
  const line = pickMilestoneDialogue(milestoneId, dialogueTick++);  // 仅台词池按 id 不同
  bondFloat.value = { name: card?.name ?? '', text: line };          // 反馈形态：同一个文字飘条
  scheduleDialogueClear(() => { bondFloat.value = null; }, 3200);
}
```

对照 `config/nurture.ts:112-118` 的 6 档里程碑：

| id | 阈值 | 称号 | 领取反馈（现状） |
|---|---|---|---|
| bond_1 | 100 | 初识 | 一个 `bond-float` 小字条（3.2s） |
| bond_2 | 250 | 熟络 | **同上** |
| bond_3 | 500 | 要好 | **同上** |
| bond_4 | 1000 | 挚友 | **同上** |
| bond_5 | 2000 | 羁绊 | **同上** |
| bond_6 | 4000 | 命运 | **同上** |

**结论**：领取反馈**唯一的分级维度是台词文本**（`MILESTONE_LINES_BY_ID`），视觉呈现零分级。爬到 4000 好感的"命运"巅峰，和第一次达标 100 好感的"初识"，玩家得到的是**同一个轻飘飘的 `.bond-float`**。这正是 SPRINT 收官轮点名的「巅峰时刻被做轻」。**这是本轮打磨投入产出比最高的一处**——低成本（纯前端动效）、高情感回报（把玩家最大的关系投入隆重化）。

---

## Phase 2: 竞争差距（本轮切片 ≥2 竞品对比）

### 2.1 「晒图 / 展示出口」竞品对比（本轮核心切片）

| 维度 | **AnimePlay 家园（4 轮后）** | ACNH 梦境门牌 | 各家 Wrapped / 成绩卡晒图 | Blue Archive |
|---|---|---|---|---|
| **展示出口存在** | ❌ **零**（家园只有自己看） | ✅✅（梦境门牌 = 品类标杆） | ✅（年度总结晒图，本仓已有 ShareCard） | ⚠️ 截图靠玩家自发 |
| **安全异步（不怕被破坏）** | — | ✅ 访客不能动你的岛 | ✅ 出图即静态，零风险 | — |
| **一键成图 / 低门槛** | ❌ | ⚠️ 需上传梦境 | ✅ 一键 Canvas 出图 | ❌ 手动截图 |
| **真实数据差异化** | 🟡 有料没出口 | ❌ 虚构家具 | ⚠️ 数值成绩 | ❌ 虚构学生 |
| **社交货币 / 身份信号** | ❌ | ✅✅（岛屿风格 = 身份） | ✅ | ⚠️ |

**关键判断**：**AnimePlay 家园已经攒了一柜子"值得晒"的东西（真实追番角色橱窗 + 摆好的家具 + 命中的羁绊 + 今日特殊角色），却零展示出口。** 这是 4 轮 endowment 积累后一个非常"熟"的收官动作——地基全在，只差把只读快照画成一张图。而且**本仓已经有一套打磨过的晒图管线**（`ShareCard.vue` + `buildWrappedStats.ts` + `shareImage.ts`），复用它 = 极低工程成本 + 已验证规避了 cross-origin taint（首版不嵌远程角色图这条 pitfall，现成代码已经这么做了）。

### 2.2 「情感巅峰庆祝」竞品对比

| 维度 | **AnimePlay（4 轮后）** | gacha 品类（Genshin/FGO 等） | Blue Archive |
|---|---|---|---|
| **稀有/巅峰事件分层反馈** | ❌ bond_1 = bond_6 同反馈 | ✅✅ 普通一道光 / UR 整段过场 + 音乐 | ✅ 好感满级专属 CG |
| **达成瞬间"juice"（光效/音效/停顿）** | ⚠️ 仅 3.2s 小字条 | ✅✅ glowing orbs + 庆祝音乐 | ✅ |
| **称号 / 身份沉淀显形** | ⚠️ 称号有（bondTitle）但达成瞬间不隆重 | ✅ | ✅ |

gacha 品类的共识（Phase 竞品查印证）：**用 fanfare 分层把"投入 → 情感回报"的曲线做陡**——普通事件轻反馈，巅峰事件重反馈（过场动画 + 庆祝音乐 + 视觉停顿）。这正是 AnimePlay 里程碑领取该补的：低档保持克制，**高档（羁绊/命运）值得一个"停下来、被隆重对待"的瞬间**。

### 2.3 竞品研究中的机会点（本轮切片专项）

- **ACNH 梦境门牌 = "安全异步晒图"的品类标杆**：梦境门牌让玩家把自己建的岛上传，别人凭门牌号异步来逛，**访客能看、能和村民说话，但不能拿走东西/破坏**——"show off your hard work / design inspiration / 不怕被踩花偷东西"是玩家上传的核心动机，而玩家把门牌号发到社交媒体/论坛/社区，让"我建的岛"成为社交货币。AnimePlay 首版做不到"来逛"，但**一张家园快照分享图是它最轻的前身**：把"我的基地状态"变成一张可发出去的静态图，先兑现"show off + 身份信号"这一层。（[ACNH 梦境门牌上传 (Nintendo)](https://en-americas-support.nintendo.com/app/answers/detail/a_id/50095/~/how-to-upload-your-island-to-the-dream-library-(animal-crossing:-new-horizons)) · [梦境门牌用法 (NookFriends)](https://www.nookfriends.com/articles/animal-crossing-new-horizons-dream-islands-guide)）
- **gacha 品类 fanfare 分层**：稀有/巅峰事件用 glowing orbs + 角色剪影 + 庆祝音乐做隆重揭晓，是"高投入时刻高反馈"的品类共识；"识别创意被榨干"的反面警示也提醒——**庆祝要真诚、要与投入匹配**，不能所有档位一个模板。这直接支撑 R2「高档里程碑隆重庆祝」。（[gacha 机制与庆祝 (Wikipedia)](https://en.wikipedia.org/wiki/Gacha_game) · [玩家留存策略 (Game Design Skills)](https://gamedesignskills.com/game-design/player-retention/)）

---

## Phase 3: 功能深度（本轮切片视角）

### 3.1 晒图的深度评估 —— 该放什么内容最想被分享

**核心判断：晒图的深度不来自画得多花哨，而来自"聚合了哪些只有 AnimePlay 才有的、值得炫耀的真实数据"。** 按"最想被分享"排序，一张家园快照卡应聚合（全是现成派生源、零新存档）：

| 内容 | 派生源（现成） | 为什么值得晒（差异化 / 炫耀点） | 优先级 |
|---|---|---|---|
| **基地名 + 玩家名 + 等级** | `profile.currentUser` / `core.level` | 身份锚点 | 必备 |
| **入住角色（名字/数量，文字或 emoji）** | `homestead.placedCharacterIds` + `getCharacterCardById().name` | "我家住着 XX、YY、ZZ" —— 真实番剧角色，竞品做不到 | 🔴 核心炫耀点 |
| **收藏陈列完成度（UR X/总 · 图鉴 X%）** | `codex.characterCompletion`（现成 computed，ShareCard 已在用同款） | "我一柜子 UR" —— 战果墙 | 🔴 核心炫耀点 |
| **家具陈列 X/7** | `furnitureStore.placedIds`（现成） | "我把基地布置成了这样" | 🟡 |
| **命中的羁绊（作品名 ×人数）** | 现成 `hourlyYield.bondHits`（派生） | "我凑齐了《XX》的同伴组" —— 968 番护城河 | 🔴 差异化亮点 |
| **今日特殊角色（今天谁心情好）** | 现成 `todaySpecialId` → name | 每日新鲜，快照带"今天"的时效味道 | 🟡 |
| **基地舒适度 / 挂机时长感** | 现成 `homeEffect.comfort` | 数值成就感 | 🟢 |

**★ 硬约束（pitfalls 明令，我复核现成代码确认它已遵守）**：**首版绝不嵌远程角色/封面图**——`ShareCard.vue` 现成代码就是纯文字/纯 Canvas 自绘（`drawCard` 全是 `ctx.fillText`/`roundRect`，零 `drawImage(远程)`），`canvasToPngBlob` 注释明写"跨域 taint 时 reject"。**新家园快照卡照抄这个纯文字/emoji/CSS-Canvas 范式即可，天然规避 toBlob 抛错。** 角色就用**名字文字 + emoji**呈现，别画远程头像。

**聚合逻辑抽成纯函数（pitfalls 明令）**：仿现成 `buildWrappedStats.ts`（零 Vue/Pinia/DOM，纯 `WrappedInput → WrappedStats`）——新建 `buildHomesteadSnapshot.ts`（`HomesteadSnapshotInput → HomesteadSnapshotStats`），view 层读 live store 喂进去，纯函数便于单测。**这是本仓已验证的正确范式，直接沿用。**

### 3.2 打磨的深度评估 —— 哪些情感高点最该打磨

按"投入产出比 × 情感杠杆"排序：

| 情感高点 | 现状 | 打磨方向 | 杠杆 |
|---|---|---|---|
| **高档里程碑领取（bond_5/bond_6）** | 与 bond_1 同反馈（`bondFloat` 小字条） | 🔴 按档位分级：高档叠隆重 fanfare（角色名 + 称号"命运" + 半屏光效 + 停顿） | 🔴🔴 最高（玩家最大关系投入的巅峰，现在被做轻） |
| **收取挂机瞬间** | 大额弹窗 / 零碎静默日志（合理） | 🟢 收取瞬间给金币/数字弹跳的微反馈（收取 CTA 已是金色大 CTA，加一个 tactile 反馈） | 🟢 中 |
| **偶遇符号 / 气泡** | 已可用（♡/✧/♪ 上浮） | 🟢 微抛光（缓动/透明度曲线），非结构性 | 🟢 低 |
| **今日特殊角色 tap** | ☀ 徽章 + 光晕 + 专属台词（4 轮已做） | 🟢 已达标，可选加一点点击涟漪 | 🟢 低 |

**结论**：**R2 高档里程碑隆重庆祝是打磨里唯一的"结构性情感债"**，其余是抛光。建议本轮打磨预算重点押在 R2 上（分级 fanfare），收取/偶遇微打磨有余量再做。

### 3.3 本轮深度从哪来（收官哲学延续）

延续 5 轮一贯哲学——**深度不来自新数值/新存档，来自把已有的东西"推到该有的情感/展示强度"**：
- **晒图**：从"4 轮攒的战果只有自己看得见"→"一键出一张可发出去的家园快照"，把 endowment 推到身份信号（手办柜研究第三条）。
- **打磨**：从"所有里程碑一个模板"→"投入越大越隆重"，把情感回报曲线做陡（gacha fanfare 分层）。

---

## Phase 4: 差异化与 Wow Factor（收官轮的护城河收束）

### 4.1 晒图 = 把 968 番护城河推向社交传播

前 4 轮把"真实作品"这条护城河灌进了关系（偶遇）、空间（家具）、收藏（橱窗）。**晒图是把这条护城河第一次推出屏幕外**：
- **一张"我的追番基地"快照** = 我家住着谁（真实番剧角色）+ 我一柜子 UR（真实追番战利品）+ 我凑齐了《凉宫》组的羁绊（真实作品关系）。**竞品晒的是虚构 IP，AnimePlay 晒的是"我真实追过的番的档案"** —— 这是发到社交媒体后，同好一眼能共鸣、能对暗号的社交货币（"你也追了这部！"）。晒图越把真实作品信息带出去，这条差异化越亮，也越可能带来自然传播（新用户获取的最轻杠杆）。

### 4.2 本轮能产出的口碑截图

- **"这是我的追番基地"**——基地名 + 入住真实番剧角色 + UR 战果墙 + 羁绊命中，一张图讲清"我玩了多久、追了什么、多欧"。
- **"我和 XX 走到了命运"**——高档里程碑隆重庆祝的那一刻本身就是可截图的高光（角色名 + "命运"称号 + 光效），是关系投入的巅峰纪念。

### 4.3 值得删掉或简化的东西（≥1，收官纪律）

- **晒图首版删掉"嵌远程角色/封面图"**（pitfalls 明令 + 现成 ShareCard 已示范）——纯文字/emoji/Canvas 自绘，别引 html2canvas、别画远程图。这不是妥协，是**正确的首版边界**（规避 cross-origin taint + 零素材依赖）。
- **晒图首版删掉"来逛我的基地"（异步访客）**——那是 ACNH 梦境门牌的完整形态，需要后端 + 存档 + 分享码，远超收官轮范围。**一张静态快照图是它零后端、零存档的正确前身**，先验证"玩家愿不愿意晒"。
- **打磨删掉"全 6 档都做 fanfare"**——只有高档（bond_5/bond_6，也可含 bond_4）值得隆重，低档保持克制小字条。**全档都隆重 = 隆重感通胀 = 巅峰不再是巅峰**（gacha"创意被榨干"的反面警示）。分级才是打磨的灵魂。

---

## Technical Health（收官总评：HomesteadView 体量 + 5 轮累积可维护性）

- **🟡 `HomesteadView.vue` 已达 1366 行（本轮实测），是全仓最大单文件之一（超过 CLAUDE.md "200-300 行"目标 4-5 倍，与 `SquadBattleView` 并列为超标户）。** 5 轮累积（1-4 轮 UI 都叠在这里）已经让它接近可维护性拐点。**收官轮的两个新增（晒图入口 + 庆祝动效）应尽量"薄接入"**：晒图逻辑抽 `buildHomesteadSnapshot.ts`（纯函数）+ 独立 `HomesteadShareCard.vue` 组件（仿现成 `ShareCard.vue`，view 只放一个"分享基地"按钮 + 弹窗开关），**别把 Canvas 绘制代码堆进 HomesteadView**；庆祝 fanfare 若复杂也建议抽独立组件。**强烈建议（收官软约束）**：本轮顺手把晒图/庆祝做成外挂组件，避免 HomesteadView 再膨胀；若有余量，未来某轮把漫步场景 template + 运营面板 template 拆成子组件是这个文件的正解（非本轮硬约束）。
- **✅ 晒图管线 100% 现成、直接复用（本轮最省力的一条）**：`utils/shareImage.ts`（`canShareImage` 特性检测 / `shareOrDownloadImage` 系统分享面板 + 下载回落 / `canvasToPngBlob` 跨域 taint reject）+ `components/ShareCard.vue`（`drawCard` 纯 Canvas 自绘范式，规避远程图）+ `wrapped/buildWrappedStats.ts`（纯函数聚合 + 单测范式 + `buildWrappedStats.test.ts` 现成样板）。**新家园快照卡 = 抄这三件套**：新纯函数 `buildHomesteadSnapshot.ts`（+ `.test.ts`）+ 新组件 `HomesteadShareCard.vue`（复用 `shareImage.ts` 的 `shareOrDownloadImage`/`canvasToPngBlob`）。零新基础设施、零 cross-origin 风险。
- **✅ 快照聚合的派生源全现成、零新存档**：基地名/等级（`profile`）、入住（`homestead.placedCharacterIds` + `getCharacterCardById`）、收藏完成度（`codex.characterCompletion`，ShareCard 已在用）、家具陈列（`furnitureStore.placedIds`）、羁绊命中（现成 `hourlyYield.bondHits`）、今日特殊（现成 `todaySpecialId`）。**全部只读派生，快照是零副作用只读聚合**——零升档、零 `computeIdleYield` 污染、零 claim/earn/spend。
- **🟡 庆祝 fanfare 的定时器纪律（本轮最易错点）**：R2 若用 setTimeout 驱动 fanfare 显隐/自动关闭，**必须登记进数组 + `onUnmounted` 清除**（复用 view 现成的 `dialogueTimers` 范式，`HomesteadView.vue:472-480`）。若用 CSS `@keyframes` 驱动动效则更好（不进 rAF、不进 timer）。**别新开裸 setTimeout**（pitfalls false-safety 明令）。
- **🟡 两个 dead computed 确认存在，收尾必清**：`effectText`（`:377`）+ `comfortBonusText`（`:379`）都是模块级 computed，**模板从不引用**（模板用的是 `residentRows` 里的 per-row `effectText`（`:404`，不同作用域）+ `comfortPctText()` 函数（`:338`）显示 comfort）。grep 全文确认这两个模块级常量零模板命中。**第 2-3 轮已进 backlog，收官轮该清**——`comfortBonusText` 更该清（它算的"全产出 +X%"文案已被 `comfortPctText(homeEffect.comfort)` 在家具卡里正确显示，这个模块级版本是残留）。
- **✅ 颜色令牌纪律 5 轮零违规（前 4 轮 eval 逐轮 grep 确认）**：晒图导出图本体可用固定品牌色自绘（属"图片压片类固定色例外"，`ShareCard.vue` 已示范 `COL` 常量表）；但**界面 UI（分享按钮、庆祝弹窗）必须走语义令牌**（`btn-primary` / `rgb(var(--c-*))`），别在庆祝层拼动态色类 / 压 `text-white`。
- **✅ 5 轮零升档纪律 = 健康的架构信号**：SAVE_VERSION 稳在 20，`infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts` 五轮 diff 全空（前 4 轮 eval 逐轮核实）。这条"能派生的一律派生"纪律是这个项目工程健康度的一个亮点——收官轮延续（晒图/打磨天然零存档需求）。
- **✅ engine 纯净 / 依赖只向下 / 货币只走 profile 五轮无破损**：晒图聚合是 view/config 层的只读派生（`buildHomesteadSnapshot` 是纯函数、可放 `utils/` 或 `wrapped/` 旁），绝不写进 engine；庆祝是纯 view 动效。收官轮不触碰这三条铁律。

---

## 1-4 轮回归与未尽处审查（合同要求：收官轮做整体体验回顾 + 全面抓回归）

> 我通读了 `HomesteadView.vue` 全文（1366 行）+ `usePlazaWalk.ts` 全文 + `config/{homesteadDialogues,homesteadDaily}.ts` + 第 4 轮 gen_status/eval。整体质量高，**无阻断级回归**。以下是抓到的体验坑/未尽处（均非本轮硬修，供 Planner 排期参考）：

- **✅ 无数值/存档回归**：`computeIdleYield` 口径完整（`homeEffect.comfort` 并入家具 comfort、facilityLevels 同源、羁绊 `placedAnimeNames` 同源，预览=结算）；`settleHomestead` 走门面；SAVE_VERSION=20 未动；4 轮 eval 已逐轮核实 `config/homestead.ts` 数值区 byte 未变。挂机基线守住。
- **✅ 定时器纪律无泄漏**：`HomesteadView` 的 `idleTimer`(setInterval)/`commissionTimers`/`dialogueTimers` 均在 `onUnmounted` 清除（`:517-524`）；`usePlazaWalk` 的 rAF + `timers[]` 在 `onUnmounted` 清除。**本轮加庆祝/晒图务必延续此纪律**（庆祝 setTimeout 登记 `dialogueTimers`，或走 CSS `@keyframes`）。
- **🟡 高档里程碑领取反馈无分级（本轮 R2 要修）**：`onClaimBondMilestone`（`:483-488`）bond_1..bond_6 同反馈——见 Phase 1.3 代码级确认。本轮打磨命门。
- **🟡 两个 dead computed（本轮 R3 收尾清）**：`effectText`(`:377`)/`comfortBonusText`(`:379`)——见 Technical Health。
- **🟢 tap 台词仍全角色共用一池（长线债，非本轮硬修）**：点凉宫和点初音说同一批话（`TAP_GREET_LINES` 通用池）；偶遇专属池 `ENCOUNTER_LINES_BY_ANIME` 首版留空（`homesteadDialogues.ts:88`，通用兜底）。逐角色/逐作品专属台词是长线打磨债，骨架已留、内容后续增量补，收官轮不必铺。
- **🟢 第 2 轮偶遇对满编老玩家可能偏稀（3-4 轮已记，仍未实机验证真实间隔）**：偶遇需「同作品对 + 邻近<9% + 概率门 0.55 + 冷却 55s」四重门。gen_status 承认"活体战斗 HUD 未实机跑过、本机截图不可用靠 eval 验证"——**家园偶遇的真实触发间隔同样缺实机长时观察**。非本轮范围（本轮切片是打磨/晒图），记入体验 backlog；若晒图快照里放"今日特殊角色 / 羁绊命中"，天然也提示了玩家去广场看偶遇，是一个轻微协同。
- **🟢 满摆满编场景密度（3 轮审美债，仍未评审美）**：7 家具（34px emoji + 名牌）+ 6 角色（66×88 sprite）+ 季节粒子 9 个，16:9 缩放后可能视觉拥挤。家具名牌可仿 `pet-name` 改 hover 才显（`:1191-1197` 的 `opacity:.62→hover 1` 范式）。非本轮硬修，记审美 backlog。
- **🟢 禁用态"差多少"提示缺失（合同点名 nice-to-have）**：设施/家具购买按钮 `:disabled` 时（KP 不足）无"还差 X KP"提示。属收尾 nice-to-have，有余量再做。

---

## Prioritized Recommendations

### 🔴 Critical（本轮收官切片核心）

- **R1｜家园快照 / 一键分享图（本轮结构性命门 + 长留存外化出口）**。纯前端 Canvas 出图，把家园状态聚合成一张可下载/分享的统计卡。**直接复用现成三件套**：`utils/shareImage.ts`（`shareOrDownloadImage` + `canvasToPngBlob`）+ `components/ShareCard.vue` 的 `drawCard` 纯 Canvas 自绘范式 + `wrapped/buildWrappedStats.ts` 的纯函数聚合 + 单测范式。落地 = 新纯函数 `buildHomesteadSnapshot.ts`（+ `.test.ts`）聚合基地名/入住角色名/UR 陈列完成度/家具陈列/羁绊命中/今日特殊（**全现成派生源、只读、零新存档**）+ 新组件 `HomesteadShareCard.vue`（Canvas 自绘 + 复用 `shareImage.ts`）+ HomesteadView 加一个"分享基地"按钮 + 弹窗开关。
  - **★ 晒图硬约束（pitfalls 明令，务必遵守）**：① **纯 Canvas 出图**（toBlob + createObjectURL + a.download + revokeObjectURL，`shareImage.ts` 已封装），**别引 html2canvas**；② **首版绝不嵌远程角色/封面图**（cross-origin taint 会让 toBlob 抛错）——角色用**名字文字 + emoji**，别画远程头像（现成 `ShareCard.drawCard` 已示范纯文字自绘）；③ **聚合逻辑抽纯函数**（仿 `buildWrappedStats.ts`，零 Vue/Pinia/DOM，便于单测）；④ **只读快照**（零副作用、零 claim/earn/spend、零升档）。
  - **验收关键（可见性命门）**：家园有"分享基地"入口，点击生成一张含**基地名 + 入住真实番剧角色名 + UR 陈列完成度 + 家具陈列 + 羁绊命中**的图，可下载/系统分享；**968 番差异化务必显形**（入住角色名 + 羁绊作品名带出真实追番信息，是社交货币）；纯文字/emoji 出图不触 cross-origin taint（toBlob 不抛错）。
  - **收官软约束**：晒图代码走独立组件 + 纯函数，**别堆进已 1366 行的 HomesteadView**。

- **R2｜高档里程碑隆重庆祝（情感高点打磨，本轮最高杠杆之一）**。给 `onClaimBondMilestone`（`:483-488`）按 `BOND_MILESTONES` 档位**分级反馈**：低档（bond_1..bond_3）保持现有 `.bond-float` 小字条（克制）；高档（bond_5「羁绊」/ bond_6「命运」，可含 bond_4「挚友」）叠一层**隆重庆祝**——半屏/全屏 fanfare 覆盖层 + 角色名 + 称号（"命运"）+ 光效/粒子 + 短停顿。**纯前端动效、零数值、零存档、零升档**。
  - **落地拍板**：分级判据读 `milestoneId` 或 `BOND_MILESTONES` 里该档的索引（`bond_5`/`bond_6` = 高档）；庆祝层用 CSS `@keyframes` 驱动（不进 rAF）；若用 setTimeout 自动关闭必须登记 `dialogueTimers` + `onUnmounted` 清除；颜色走语义令牌（`--c-highlight`/`--c-accent`），庆祝弹窗别压 `text-white` / 别拼动态色类。
  - **验收关键**：领 bond_6「命运」与领 bond_1「初识」**反馈肉眼可分辨**（高档隆重、低档克制），分级要"肉眼可辨"（可见性命门 + 名字≠行为：庆祝纯展示不带数值）。
  - **别做**：全 6 档都 fanfare（隆重通胀）；庆祝携带任何数值/奖励（纯动效）。

### 🟡 Important（收尾 + 收官核对）

- **R3｜遗留体验债收口 + Sprint 收官核对**。
  - **清两个 dead computed**：`effectText`(`:377`)、`comfortBonusText`(`:379`)（模块级、模板零引用；`comfortBonusText` 的功能已被 `comfortPctText()` 在家具卡正确承担）。删除即可，注意别误删 `residentRows` 里的 per-row `effectText`（`:404`，不同作用域，模板 `:873` 在用）。
  - **收禁用态"差多少"提示**（nice-to-have，有余量再做）：设施/家具购买 `:disabled` 时提示"还差 X KP"。
  - **Sprint 收官核对（本轮必做）**：① S16-T1..T11（+本轮新 T）全部 `[x]` 且与实现一致（grep 未勾选项零命中）；② S14/S15 33+ 项机制无回归（战力单一 seam / facility v17 / 装备强化套装 modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成 / softCap / 家具 v20 / 羁绊 / pity v20 / 墙钟钳位）；③ SAVE_VERSION 仍 =20（本轮零升档预期）；④ `npm run test` 连跑 3 次全绿（当前基线 991）。

### 🟢 Nice-to-have（本轮可选微打磨）

- **R4｜收取瞬间庆祝微反馈**（金色收取 CTA 加 tactile 数字弹跳 / 光效，纯动效）。
- **R5｜偶遇符号/气泡微抛光**（缓动/透明度曲线），非结构性。
- **R6｜家具名牌 hover 才显**（3 轮审美债顺手，降满摆场景密度）。

### 💡 Feature Idea（差异化创新，进 backlog，非本轮）

- **F1｜自定义家具摆位（真正值得 v21 bump 的候选）**。让玩家自由拖拽摆放家具（存各自坐标）——这是全 sprint **唯一**坐标非持久化不可的功能，是 sprint 唯一 v21 bump 的合理归宿（但不是收官轮，留后续 sprint 被验证后做）。
- **F2｜家园"来逛"异步访客（ACNH 梦境门牌完整形态）**。分享码 → 别人异步来逛你的家园（只读，不能破坏）。需后端 + 存档 + 分享码，远超收官轮；R1 静态快照是它零后端的前身。
- **F3｜逐作品专属偶遇台词 / 逐角色专属 tap 台词（长线内容债）**。`ENCOUNTER_LINES_BY_ANIME` 骨架已留（现空），按 968 番真实作品增量补料，把偶遇/tap 从通用兜底做成"真实作品味道"。
- **F4｜快照卡里嵌角色头像（二版，需解 cross-origin）**。首版纯文字，二版若要嵌真实角色脸，需把角色图走同源代理 / 预烘焙 sprite（避 taint），把晒图从"文字卡"升成"真·角色橱窗图"。
- **F5｜主题房 × 真实作品收藏（长线内容）** / **F6｜家具 × 偶遇缝合（角色在特定家具旁偶遇）**。均长线。

---

## 一句话给 Planner

5 轮弧线走到收官，家园已经从"会挂机的壁纸"长成了"有情感（关系/偶遇/台词）、有所有权（家具/陈列）、有回访理由（今日特殊/季节）"的完整活基地——**前两段留存漏斗（进来 + 待着）很扎实，收官轮补最后一段（出去传播）**。最短两步：**R1｜家园快照晒图（结构性命门 + 长留存外化出口）**——纯前端 Canvas 出图，**直接复用现成 `shareImage.ts` + `ShareCard.vue` + `buildWrappedStats.ts` 三件套**（本仓已有一套规避 cross-origin taint 的晒图管线），把基地名 + 入住**真实番剧角色名** + UR 陈列完成度 + 家具陈列 + **羁绊命中作品名**聚合成一张可发出去的图（**这是把 968 番护城河从"我看得见"推到"给人看"的第一块砖，也是自然传播的最轻杠杆**），严守晒图硬约束（**别引 html2canvas、首版绝不嵌远程角色图、聚合抽纯函数 `buildHomesteadSnapshot.ts` 便于单测**）；**R2｜高档里程碑隆重庆祝（最高杠杆情感打磨债）**——`onClaimBondMilestone`（`:483-488`）现在领 bond_6「命运」（4000 好感巅峰）和领 bond_1「初识」（100 好感）**反馈完全一致**，把玩家最大的关系投入做轻了，按档位分级：低档保持克制小字条、高档叠隆重 fanfare（角色名 + 称号 + 光效，纯动效零数值），分级要**肉眼可辨**（gacha fanfare 分层范式）。**★ 升档拍板明确表态：收官轮零升档、SAVE_VERSION 保持 20**——晒图是只读快照聚合（全现成派生源）、打磨是纯动效，天然零存档需求；sprint 唯一 v21 bump 五轮全程未消耗，是健康纪律，留给未来"自定义家具摆位"（F1）不迟。**收官软约束：晒图/庆祝走独立组件 + 纯函数，别再堆进已 1366 行的 HomesteadView**；庆祝 setTimeout 登记 `dialogueTimers` 或走 CSS `@keyframes`。守住**名字≠行为 + 反 completionist**：快照/庆祝纯展示零数值零奖励零 FOMO。**别忘 R3 收尾**：清两个 dead computed（`effectText`/`comfortBonusText`，`:377/379`）+ Sprint 收官核对（S16-T1..T11 全 `[x]`、S14/S15 33+ 机制无回归、SAVE_VERSION=20、test 连跑 3 次全绿）。

### Sources
本轮切片定向竞品研究（晒图 / 展示出口 + 里程碑庆祝分层）：
[ACNH 梦境门牌上传（安全异步晒图，访客只读不可破坏）(Nintendo Support)](https://en-americas-support.nintendo.com/app/answers/detail/a_id/50095/~/how-to-upload-your-island-to-the-dream-library-(animal-crossing:-new-horizons)) · [ACNH 梦境门牌用法 / 为何玩家分享（设计灵感 + show off）(NookFriends)](https://www.nookfriends.com/articles/animal-crossing-new-horizons-dream-islands-guide) · [ACNH 梦境门牌 (Nookipedia)](https://nookipedia.com/wiki/Dream) · [gacha 机制：稀有事件 glowing orbs + 庆祝音乐 + 过场分层 (Wikipedia)](https://en.wikipedia.org/wiki/Gacha_game) · [玩家留存策略：识别创意被榨干、庆祝要真诚 (Game Design Skills)](https://gamedesignskills.com/game-design/player-retention/)
