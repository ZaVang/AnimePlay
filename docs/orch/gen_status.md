# Generator Status — S16 第 5 轮（收官：打磨 + 晒图 + 收尾）

> 本轮 = 5 轮弧线收官轮。承诺任务 S16-T12（庆祝分级，命门之一）+ S16-T13（家园晒图，命门之一）+ S16-T14（Sprint 收官核对）+ S16-T15（收尾清 dead computed + 可选微打磨）。详见 docs/orch/plan.md。
> **零升档（SAVE_VERSION 保持 20，三处存档装配器一字未动 = git status 全空）、零素材（emoji/CSS/Canvas 自绘）、零数值改（未碰 computeIdleYield / bonds engine / nurture 数值）、纯展示零发奖零联机。**
> 状态：**PASSED**。5 条验收命令全绿（test 1009 连跑 3 次稳定，基线 991→1009，加晒图纯函数 + 庆祝分级判据特征测试）；T12 庆祝分级 + T13 晒图入口 + T15 清债与可选打磨全落地；Sprint 全 15 项 S16-T `[x]`。

## 完成任务

### S16-T12｜里程碑庆祝按档位分级：High-Five / Crowning（P0，命门）— 完成

把里程碑领取反馈从「所有档一个模板」升级成**分级音量**：低档 bond_1/2/3 保持轻飘字（High-Five），高档 bond_4/5/6 升级隆重 Crowning 弹层，bond_6「命运」再加最隆重一档（finale）。

- **分级判据抽纯函数 + 特征测试锁死**：新增 `milestoneCelebrationTier(id): 'highfive' | 'crowning' | 'finale'`（`config/nurture.ts`）。白名单 bond_4/5/6=crowning、bond_6=finale、未知 id 保守回落 highfive。判据有数据支撑（`statBonusPct` 0.02[低档] vs 0.03[高档] + reward 200→400 跳变）。补 5 组特征测试锁「低档→highfive / 高档→crowning / bond_6→finale / 未知→highfive / 与 statBonusPct 分层一致」（`nurture.test.ts`）。
- **分级不是统一动效**（research 深挖① 唯一危险读法）：低档**保持现有 `bondFloat` 轻飘字**（一字未加彩带，别过度打磨低档）；只有高档才升 Crowning 弹层。
- **Crowning 隆重弹层**（新增 `crownCelebration` ref + `.crown-pop`/`.crown-card` 模板 + CSS）：复用 `.settle-pop` 遮罩范式 + 现成 `CharacterAvatar`（本地 sprite 非远程 drawImage，安全）。弹层带：大号称号加冕「「命运」达成」+ 角色名 + 角色脸 + 旋转光芒（`crownSpin` conic-gradient）+ 星屑（`crownSparkle`）+ 头像光环脉冲（`crownGlow`）。finale（bond_6）再加一档：卡边描金 + 更强金光 + 更大称号（`.is-finale` 分支）+ 停留更久（6.5s vs 5.2s）。
- **纯展示零数值零发奖**（可见性命门 + 名字≠行为红线）：`onClaimBondMilestone` 里唯一的发放调用是 pre-existing 的 `userStore.claimBondMilestone`（一字未碰）；tier 分支**只写 `bondFloat`/`crownCelebration` 两个纯视觉 ref**，无任何新 `spend/earn/claim`（审 diff 确认）。
- **定时器登记清除 + 不进 rAF**：Crowning 自动关闭走现成 `scheduleDialogueClear`→`dialogueTimers`→`onUnmounted` 清除（pitfalls:59）；动效全走 CSS `@keyframes`，`usePlazaWalk` 的 rAF 一字未动。
- **连领不叠弹**：`crownCelebration` 是单弹层 `v-if`，后领覆盖前领；加**自增令牌 `crownToken`** 守卫，旧定时器不会误关后领的新弹层（一次只显一个）。
- **颜色令牌零违规**：弹层走 `rgb(var(--c-highlight)/--c-accent/--c-accent-2/--c-ink*/--c-surface/--c-on-accent)`；`:class="`is-${tier}`"` 是**状态修饰类**（is-crowning/is-finale，静态已知值）非动态拼色类；无 text-white 压浅底 / 无未定义令牌 / 无反斜杠透明度（grep 全零命中）。

### S16-T13｜家园快照晒图：一键出「基地身份卡」（P0，命门）— 完成

给家园一个对外的脸：橱窗卡头加「📤 晒基地」入口，点击把家园状态聚合成一张**纯前端 Canvas 暖色「基地身份卡」**，系统分享 / 下载 PNG。

- **聚合抽纯函数**（新增 `wrapped/buildHomesteadSnapshot.ts`，仿 `buildWrappedStats.ts`）：零 Vue/Pinia/DOM。输入 = 从 store 读出的 plain object 快照（username/level/placedCharacterNames/furniture/showcaseRarity/bondHits/todaySpecialName/comfort），输出 = 可直接喂 Canvas 的视图模型。**晒身份不晒缺口**：只正着念「陈列 X/7」「入住 N」「拥有 UR 12/48」「《XX》羁绊」，输出模型里**根本没有缺口字段**（无「还差 Y」概念）。**空态优雅**：`isEmpty`（0 入住+0 收藏+0 家具+0 羁绊）标志，`showcaseRarity.owned<=0` 视为 null 不晒「UR 0/N」；`safeCount`/`cleanNames` 对负数/NaN/undefined/空串全兜底。满配裁上限（脸位 6、羁绊作品 4）。补 20 条特征测试（满配/0 入住/0 收藏/空基地 + 正着念计数 + 空态不 NaN + 去重 + 裁上限 + 脏输入兜底）。
- **纯前端 Canvas 手绘、别引 html2canvas、零 drawImage 远程图**（本轮最易翻车地雷）：新增 `components/homestead/HomesteadShareCard.vue`（仿 `ShareCard.vue`）。600×800 竖版暖色渐变；角色「脸」用**名字首字 + 暖色圆块自绘**（`ctx.arc`+`fillText`），**零 `drawImage`**（grep 证实只在注释里出现「绝不 drawImage」）。IO 复用现成 `utils/shareImage.ts`（`canvasToPngBlob`/`shareOrDownloadImage`，系统分享 + 下载回落 + AbortError 处理，零新基建）。**浏览器实测**：600×800 canvas 渐变+fillText+arc → `toDataURL('image/png')` 返回有效 PNG（~97KB，`startsWith('data:image/png')`=true），确认零 taint 出图路径成立。
- **主标题走 `profile.currentUser`「XX 的家园」不引基地名**（拍板二，零升档）：`buildHomesteadSnapshot` 用 username 拼「XX 的家园」，空 username 软兜底「我的家园」。**未新增任何存档字段**。
- **今日寄语上卡**（传播钩子）：`pickTodaySpecialId`（date-seeded）派生今日特殊角色名画进卡面「☀ 今天「XX」心情特别好」，每天生成的图不同 → 鼓励重复晒。
- **只读派生零副作用零升档零联机**：只读 `profile`/`homestead.placedCharacterIds`/`codex.characterCompletion`/`furniture`/`equipment.resolveHomeEffect`/`computeIdleYield.bondHits`（全现成派生源，与家园 homeEffect/羁绊同源口径）；组件无 `claim/earn/spend/place/buy/dailyBond` 调用（审 diff 确认），无上传/排行榜/后端。
- **薄接入**（别堆进 1366 行 HomesteadView）：Canvas 绘制全在独立 `HomesteadShareCard.vue`；view 只加 `showShareCard` ref + 橱窗卡头一个 `.g-share-btn` 入口按钮 + view 根挂 `<HomesteadShareCard v-if @close>`（仿 `CollectionsView.vue` 范式）。入口按钮走语义令牌（accent-soft 底 + accent-2 文）。

### S16-T14｜Sprint 收官核对（P0 收官任务）— 完成

- **checkbox 核对**：`docs/plans/SPRINT.md` 的 S16-T1..T15 **全部 `[x]`**，`grep "\[ \].*S16-T"` 主线**零命中**。`docs/SPRINT.md` 的 17 处 `[ ]` 是 S11/S12 路线图残留（非 S16 项，未误判）。
- **零升档核对**：`schema.ts:57 SAVE_VERSION=20` 不变；`git status` 对 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts` **三处全空**（本轮天然零存档需求）。sprint 唯一 v21 bump 五轮全程未消耗，留 backlog。
- **无回归核对**：本轮改动仅 = `nurture.ts`(+tier 纯函数)/`nurture.test.ts`/`HomesteadView.vue`（视觉层 + 清 dead computed + 收取打磨）+ 2 新文件（`HomesteadShareCard.vue`/`buildHomesteadSnapshot.ts(.test)`）。**未碰 `config/homestead.ts` 的 computeIdleYield（grep 证实 config 里零 session-5 markers、函数签名/arity 不变）、未碰 `engine/homestead/bonds.ts`（零 markers）、未碰 nurture 数值/发放逻辑**。三处 idle-yield 预览 computed（hourlyYield/projectedYield/nextHourlyYield）仍同喂 computeIdleYield，单 seam 完好。S14/S15 + 1-4 轮机制（facility v17 / 装备强化套装 modifier / 暴击轴 / 扫荡委托日循环 v19 / comfort 软加成 / softCap / 家具 v20 y-sort / 羁绊 bondHits 同源 / pity v20 / 墙钟钳位 / setTimeout·rAF 全登记清除 / 收藏橱窗+今日特殊+季节）全绿测试覆盖，无回归。
- **5 命令全绿**（下方验收输出）。

### S16-T15｜收尾清债 + 可选微打磨 — 完成

- **【必做】清两个 dead computed**：删 `HomesteadView.vue` 的 top-level `const effectText`（原 :377）+ `const comfortBonusText`（原 :379/381）——两个模板零引用的死 computed。**未误删 `residentRows` 内部字段 `effectText: formatHomeEffect(effect)`**（那是模板 `row.effectText` 的真实数据源，入住名单效果显示无回归）。`formatHomeEffect`/`comfortBonusPct` import 仍被 residentRows/comfortPctText/furnitureRows 消费，未变孤儿。type-check 0 错。
- **【可选加分，已做 1 个】收取瞬间到手反馈**（product R3）：`runSettle(fromClick)` 在**用户主动点「收取」**且有 KP 入账时冒一个「+X KP」到手小飘字 + 按钮成功态脉冲（`.g-collect-float`/`collectPulse`，纯 CSS）。**只可视化 settleHomestead 已发放的 knowledge，绝不改数值 / 不二次发奖**；onMounted 的初始结算不冒（免打断）；setTimeout 登记 `dialogueTimers` 清除。其余可选项（新 UR 高光 / 偶遇微调 / 禁用态提示）本着「收官轮克制优先」未做（非缺陷）。

## 验收命令实际输出（Generator 亲跑，cwd = 仓库根 D:\work\AnimePlay）

```
# 1. cd frontend-vue && npm run type-check
> vue-tsc --build
（0 错误，无输出即通过）

# 2. cd frontend-vue && npm run test（收官轮连跑 3 次）
run 1: Test Files  73 passed (73) | Tests  1009 passed (1009)  Duration 40.48s
run 2: Test Files  73 passed (73) | Tests  1009 passed (1009)  Duration 22.17s
run 3: Test Files  73 passed (73) | Tests  1009 passed (1009)  Duration 21.14s
（基线 991 → 1009，+18 = buildHomesteadSnapshot 20 条 + milestoneCelebrationTier 5 组 - 部分调整；三次稳定全绿）

# 3. cd frontend-vue && npm run build
✓ built in 8.78s（含 shareImage-*.js chunk = IO 复用现成，未造第二套）

# 4. .venv/Scripts/python.exe backend/test_security.py
RESULT: PASS — all security checks passed   （EXIT=0）

# 5. grep -rn "debug=True" backend/server.py api/index.py
（零命中，grep EXITCODE=1 = no match）
```

## 收官核对结果

- **S16-T1..T15 全 `[x]`**（docs/plans/SPRINT.md），主线 `grep "\[ \].*S16-T"` 零命中。
- **零升档**：SAVE_VERSION=20，三处存档装配器 git status 全空，v21 bump 未消耗。
- **无回归**：computeIdleYield 单 seam / engine bonds / nurture 数值 全未碰（本轮仅加视觉层 + 1 纯函数 + 清 dead code）。
- **5 命令全绿**，test 连跑 3 次稳定 1009。
- **浏览器烟测**：/homestead 挂载零 console error；Canvas 600×800 出图管线（fillText/arc/toDataURL）实测有效 PNG 无 taint。

## 新陷阱（追加给 pitfalls）

- **[晒图 Canvas 脸位=名字首字自绘]**：角色「脸」在导出 Canvas 里用「名字首字 + 稀有度/暖色圆块」`ctx.arc`+`fillText` 自绘，屏幕预览也走同一自绘 canvas（**没有用 DOM CharacterAvatar 塞进 Canvas**）——彻底规避 cross-origin taint，`toBlob`/`toDataURL` 稳过。Crowning 弹层的角色脸才用 DOM `CharacterAvatar`（那是 DOM 层，非 Canvas，安全）。两个「脸」来源分明：DOM 显真图、Canvas 自绘首字。
- **[庆祝分级令牌守卫防旧定时器误关]**：连领多个高档时，后领覆盖前领的 `crownCelebration`；旧的自动关闭 setTimeout 若不守卫会关掉新弹层。加自增 `crownToken`，定时器回调只在 `myToken===crownToken` 时才关——「后领覆盖前领 + 一次只显一个」干净成立。
- **[状态修饰类 vs 动态拼色类]**：`:class="`is-${tier}`"` 产出 `is-crowning`/`is-finale` 是**状态修饰类**（值域固定已知），不违反「禁运行时拼接动态颜色类」（那禁的是 `bg-${color}` 这类拼**颜色**类）。审色 grep 时别把状态修饰类误报。

## 文件结构变更自报

**新增**：
- `frontend-vue/src/wrapped/buildHomesteadSnapshot.ts`（家园快照聚合纯函数，零 Vue/Pinia/DOM）
- `frontend-vue/src/wrapped/buildHomesteadSnapshot.test.ts`（20 条特征测试）
- `frontend-vue/src/components/homestead/HomesteadShareCard.vue`（基地身份卡 Canvas 手绘 + 分享/下载，仿 ShareCard.vue）

**修改**：
- `frontend-vue/src/config/nurture.ts`（+`milestoneCelebrationTier` 纯函数 + `MilestoneCelebrationTier` 类型；BOND_MILESTONES 数值一字未改）
- `frontend-vue/src/config/nurture.test.ts`（+5 组分级判据特征测试）
- `frontend-vue/src/views/HomesteadView.vue`（+Crowning 弹层 + 晒图入口/挂载 + 收取到手反馈 + 删两个 dead top-level computed；未碰 computeIdleYield 调用/comfort 汇入/rAF）

**存档三件套（schema/migrations/persistence 装配器）**：本轮 diff **全空**（零升档）。

## 状态

**PASSED** — 5 条验收命令全绿（type-check 0 错 / test 连跑 3 次稳定 1009 / build 成功 / 后端安全 exit 0 / debug 零命中）；S16-T12/T13/T14/T15 全落地并与实现一致；Sprint 全 15 项 S16-T `[x]`、零升档、无回归、纯展示零数值零联机。5 轮弧线收官闭环。
