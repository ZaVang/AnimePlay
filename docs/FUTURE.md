# AnimePlay 演进 Roadmap（前进路线）

> **这是项目的单一前进任务源。** 只管「还剩什么、下一步做什么」。已完成的 Sprint（S0–S10）、产品进化层（Evo-1..Evo-9）、战斗可读性还债、2026-06-24 产品循环等**完成史已归档到 [HISTORY.md](HISTORY.md)**——要查「做过什么、怎么做的、达到什么 Exit」去那边。
>
> 每个任务的「为什么/证据」见 [项目审计报告-2026-06-12.md](项目审计报告-2026-06-12.md)。
>
> 用法：开工前看「进度总览」找当前 Sprint → 做完勾掉任务 → 一个 Sprint 的 Exit 全满足就把它标 ✅。后续日常产品迭代的需求源在 [SPRINT.md](SPRINT.md)。

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
| S0–S10 | 重构主线（文档/测试/engine 抽取/拆 store/功能闭环/视觉/技能/性能/安全） | ✅ | 已完成 → 详见 [HISTORY.md](HISTORY.md) |
| — | 产品进化层 Evo-1..Evo-9 + 战斗可读性还债 + 2026-06-24 产品循环 | ✅ | 已完成 → 详见 [HISTORY.md](HISTORY.md) |
| S13 | 家园综合系统（基地养成 + 挑战塔闭环 + 养成重构） | 🔄 | 近期主线（A/B 已落地；C=养成精简+装备 C1/C2 已 `/think` 定稿待做；A2 视觉搁置待样本图） |
| S11 | React 视图迁移 | ☐ | 演进 |
| S12 | 权威后端 & 多人/PvP/排行榜 | ☐ | 终点 |

> S0–S10 + Evolution + 产品循环已全部完成并归档（[HISTORY.md](HISTORY.md)）。**近期主线 = S13（家园综合系统，2026-06-29 已 `/think` 定稿、可直接开工）**；S11 / S12 仍为远期方向（到达时再 `/think` 细化，依赖届时的决策）。下方「已知债 / Backlog」是穿插其间、需独立决策的散项。

---

## ☐ S13 — 家园综合系统（基地养成 + 挑战塔闭环，近期主线）

**目标**：把冻结的家园升级为「基地 hub」——拥有的角色「入住」→ 离线挂机被动产出（经验/好感/知识点）→ 升级进战力 → 挑战塔验证拿奖励 → 回流再投入。复用现有 `SquadBattleView` 与养成数值，engine 纯净不破。2026-06-29 `/think` 定稿。

> **设计参考**：二次元手游成熟的「基地被动产出 + 副本验证战力」结构（AFK 离线收益结算 / Arknights 基建被动产出 / 蔚蓝档案好感+体力副本）。**可游玩性四件套**：选谁入住（稀有度越高知识点越多）/ 回归结算仪式 / 可见成长（升级·好感条·chibi 头像）/ 战力有去处（挑战塔）。**不做**：建造装饰经济、独立体力系统、把 `SquadBattleView` 塞进家园、逐秒实时 UI。

**核心循环**：入住(选最强) → 离线产出[经验↑ 好感↑ 知识点↑] → 升级 →（C 阶段）等级进战力 → 挑战塔更高层 → 塔奖励回流 → 再投入。

**关键决策**：
1. 挂机产出 = 经验+好感+知识点，**不直接产 `battleEnhancements`**（保留为养成页主动付费路径，挂机走「等级路径」不蚕食主动训练）。
2. **修复隐藏 gap**（C 阶段）：`engine/squad/combat.ts:134-139` 的 attributeBonus 现只读 `nurtureData.attributes`，**漏读 `levelBonusAttributes`** → 角色升级当前对小队战力零贡献。改为读两者之和，让升级进战力（即挂机→战力的接入点）。代价：既有角色战力上调、塔相对难度变化——单机无 PvP/排行榜可接受，RNG 注入 + 特征测试兜底。
3. 入住上限 **6**（>小队的 4），只有入住角色挂机成长（有意义的选择 + 限制离线累积）。槽位扩展留后续（可做 KP sink）。
4. **存档 v13 极小**：家园域只存 `placedCharacterIds + lastSettleAt`(+ 里程碑统计)；实际成长写进已有 `nurtureData`（经现有 store action），复用养成持久化。
5. 离线结算入口复用 `loadFromServer` + 进/在家园时；elapsed=now−lastSettleAt **封顶 12h**（即软节流，**不做独立体力系统**）。

**经济标定**（全进 `config/homestead.ts`，可调）：入住槽位 6 / 离线封顶 12h / 经验 200·小时·角色 / 好感 5·小时·角色 / 知识点 2×稀有度系数(N0.5…UR3)·小时·角色。源汇核验：满挂机 ≈216 KP/次 ≈ 一趟塔的零头；图鉴 UR 解锁 12000 KP 要 ~55 次纯挂机 → 挂机是**回归补充**，不盖过主动收入（塔/看番/小游戏）、不架空图鉴解锁 sink。

> **与「挑战塔/养成将调整」的解耦（重要）**：本设计建在**稳定接口**上而非内部实现——A/B 阶段**完全不碰挑战塔**（C 阶段也只在「入口 + 奖励调平」层，不动塔内部玩法）；挂机成长**写穿现有养成 store action**（`addCharacterExp`/`increaseAffection`），养成的活动/对话/训练「细节·数值」调整不影响家园结算（养成怎么改，挂机自动一致）。**仅当养成数据模型本身被推翻**（删/改 affection·exp·level·attributes 等核心字段）才需回头改 B/C。**排期建议**：A/B 先做（与塔/养成解耦），**C 放在塔/养成调整落地之后**，让 C 对着最终数值调平，不做无用功。

### A · 地基（无存档改动，~5 文件，独立可上线）
- [x] `utils/cardImage.ts` 加 `chibiImageSrc(id)` + 原图 `@error` 兜底；HomesteadView `pixelSrc`→chibi 源（空目录→显示原立绘，不再空场景）；建 `data/images/character/chibi/` 约定。
- [x] 解冻：`router/index.ts` 恢复 `/homestead` lazy 路由、`App.vue` 恢复导航、补回 `frontend-vue/CLAUDE.md` 模块表那行。
- **Exit**：`/homestead` 可访问；拥有的 UR/HR 角色用立绘在场景走动 + 点击看详情；chibi PNG 丢进目录即自动替换。type-check/test/build 通过。

### A2 · 家园 2.5D 视觉升级（平面俯视 + 四向序列帧，表现层）— ⏸ 搁置中
> 纯表现层、零存档、与 B/C 玩法正交，可任意时机独立推进。**当前搁置**：等一张角色生成样本图来校准精灵图规格（下方数字按样本定）后，再写 `docs/家园精灵图规格.md` 落地。
> 设计已定（2026-06-29 `/think`）：星露谷式**平面俯视**（无透视/等距，2.5D 靠 ¾ 角美术 + y-sort，引擎只做平 2D）。精灵图契约**暂定**：单格 **48×64 px** · **3 列(帧) × 4 行(下/上/左/右)** · 锚点=脚底底部中心 · 透明 PNG · `data/images/character/sprite/<id>.png`（与 chibi/、thumb/ 平级，gitignore）；列序 0左脚/1中立/2右脚、走路 0→1→2→1 ping-pong、待机=列1+CSS 呼吸；左右可由画师镜像省工但 sheet 存 4 显式行（运行时不翻转）。**三级回退** `sprite→chibi→原立绘`（`new Image()` 预加载检测，动画的与静态的同场景混摆）。Web 留 DOM/CSS（div-background + 现有 rAF 步进，不引 PixiJS）；像素 sprite 用 `image-rendering: pixelated`。拆 **A2a 平面俯视引擎（零素材即可上线：x,y 游走 + y-sort + 近大远小 + CSS 俯视地板）** + **A2b 序列帧动画层（需旗舰少量素材）**。契约与生成工具无关；Godot `AnimatedSprite2D` + `SpriteFrames`「从网格切帧」(uniform 3×4) 直接复用。
> - [ ] A2a · 平面俯视引擎（无新素材）　- [ ] A2b · 序列帧动画层 + 三级回退（需旗舰素材）　- [ ] 落 `docs/家园精灵图规格.md`（样本图到位后）

### B · 挂机养成（存档 v13，~8-10 文件，独立可上线）
- [x] 新 `config/homestead.ts`（常量 + `computeIdleYield` 纯计算）；新 `stores/homestead.ts`（`placedCharacterIds`/`lastSettleAt` + place/unplace + serialize/deserialize/reset，自身不触发保存）。
- [x] 存档三处同改：`infra/persistence/schema.ts` 升 v13 + `HomesteadSave` + `createDefaultHomestead`；`migrations.ts` 字段级缺省；`stores/persistence.ts` 装配器三联；+ `migrations.test.ts`/`homestead.test.ts` 用例。
- [x] `userStore.settleHomestead()` 门面：算 elapsed(封顶12h) → 按入住角色发经验(addCharacterExp)/好感(addIdleAffection) + 知识点(`profile.earn`) → 推进 `lastSettleAt` → 存档。**结算时机=进家园(onMounted)+入住/移出前**（带离线收益弹窗）；登录不静默结算（免弹窗显 0）；`placeInHomestead/unplaceFromHomestead` 先结算再增删防刷。
- [x] HomesteadView 重写（桌宠=入住角色）+ `HomesteadManageModal`（选 ≤6 角色，稀有度降序）+「离线收益」弹窗。
- **Exit**：入住角色离线回来领到经验/好感/知识点；封顶生效；v13 跨重开保真；经济走 `earn`；结算公式特征测试（0时长/封顶/多角色/未登录）。`npm run type-check`(0错)/`npm run test`(全绿+新增)/`npm run build` 通过 + 回归基线 `python backend/test_security.py`(全 PASS)/`grep -rn "debug=True" backend/server.py api/index.py`(零命中)。

### C · 养成重构（替换原「闭环收紧」，2026-06-29 `/think` 定稿）

> 原 C（combat 补 levelBonus + 去塔入口）已废弃，替换为「养成精简两轴 + 装备系统」——把又多又乱的养成砍成标准二游结构。家园挂机(B)原样兼容（它产出的正是新养成两轴）。

**新养成模型**：
- **养成 = 等级 + 好感** 两轴。删掉 训练/心情/活动/对话/礼物 + `attributes(charm/int/str)`/`levelBonusAttributes`/`battleEnhancements`/`intimacy`/`preferences` 等。
- **等级 = 固定初始五维 + 每级随机加点**：角色初始 5 维 = 卡牌 `battle_stats`；每升一级 roll `POINTS_PER_LEVEL`(起 10，可调) 点随机分配到 5 维，累加进 `statPoints`（注入 RNG，升级时 roll 一次并存档；复用 `distributeRandomAttributes` 改到战斗维）。
- **好感 = 关系仪表 + 里程碑**，**不接战力**。6 档 `100/250/500/1000/2000/4000` → 一次性小额 KP(`50/100/200/400/800/1500`) + 羁绊称号（初识/熟络/要好/挚友/羁绊/命运）。
- **新战力公式（纯加法）**：`最终某围 = base围 + statPoints围 + 装备该围加成`。`combat.ts` → `generateBattleStats(base, statPoints, equipBonus)`。无乘算、无 charm/int/str、无 battleEnh%。
- **装备 = 武器/防具/supporter 3 槽 + 名梗道具**：数值**由物品自定义**（`bonus: Partial<{hp,atk,def,sp,spd}>`，非槽位固定）；稀有度 R/SR/SSR/HR/UR（按稀有度预算 R~15/SR~30/SSR~55/HR~90/UR~140 总点指导配数值）；命名用动漫名梗（朗基努斯之枪/AT力场/死亡笔记/后藤的吉他…），目录在 `config/equipment.ts`（内容，可扩）；任意角色可戴任意装备（暂无稀有度硬限制）。
- **装备来源**：塔通层 50% 掉随机道具（稀有度按层段 1-5→R…56+→UR，可调）+ 知识点商店买**指定**名梗道具（R400/SR1200/SSR4000/HR10000/UR24000，可调）。
- **经验/好感获取**：经验 = 挂机 + 塔战斗 + 「补习」(角色页花 KP 换经验，新 KP sink)；好感 = 挂机 + 带它打塔（并肩作战涨好感）。
- **存档 v14**：nurtureData 瘦身为 `{affection, level, experience, totalExperience, lastInteraction, statPoints:{hp,atk,def,sp,spd}}`；新增独立 equipment 域 `{inventory:{uid,defId}[], equipped:Record<charId,{weapon,armor,supporter:uid|null}>}`（uid 用 `crypto.randomUUID()`）；迁移丢弃旧训练字段、**旧投入不退**。

- **UI/数值显示口径**（mock 定稿）：角色详情页用**变体 A（立绘前置双栏）**；五维进度条用**软上限参考** `STAT_DISPLAY_REF`（起始 生命1500/攻击800/防御600/技力700/速度600，可调；`条填充 = min(100%, 该围值/参考)`，超出满条 + `MAX` 标记），跨角色可比、避免用绝对理论最大值导致条永远空。**数值本身无硬上限**（等级点池 `POINTS_PER_LEVEL×99` + 3 装备槽天然封顶）。`STAT_DISPLAY_REF` 放 `config/`、不进存档、不影响战斗结算。

#### ☐ C1 · 养成精简 + 战力改加点制（存档 v14，~12 文件含删除，独立可上线）
- [ ] `types/nurture.ts` + `engine/nurture/rules.ts`：nurtureData 瘦身；删训练相关函数；`distributeRandomAttributes`/升级加点改到 5 战斗维（`statPoints`）；留等级曲线。
- [ ] `engine/squad/combat.ts` → `generateBattleStats(base, statPoints, equipBonus)`（纯加法，equipBonus 暂传 0）；`SquadBattleView` 改 2 处调用 + 保留 414 `addCharacterExp` + 加「塔后涨好感」。
- [ ] 删 `NurtureActions.vue/InteractionPanel.vue/DialogueSystem.vue` + 相关测试；`NurtureView` 重写为**游戏化角色详情面板**：角色列表 + 选中角色详情（头像 / 等级进度 / 好感+里程碑 / **5 维数值面板(base + statPoints 分解)** / **3 个装备槽位展示**[C1 空槽占位，C2 接配装] / 补习 KP→exp 入口）。整体观感往"真游戏角色页"靠。
- [ ] 好感里程碑 config + 领取；存档三处同改升 v14（瘦身 nurtureData + 建**空** equipment 域占位）+ 迁移/往返测试。
- **Exit**：养成只剩等级(加点)+好感(里程碑)；战力=base+statPoints；训练/活动/对话/礼物及测试删除；v14 迁移丢旧字段；`npm run type-check`(0)/`test`(全绿)/`build` + `python backend/test_security.py`(PASS)。**独立可玩**（靠等级变强，装备槽空着）。

#### ☐ C2 · 装备系统全栈（用 C1 已建的 v14 equipment 域，不再升档，~10 文件，独立可上线）
- [ ] `config/equipment.ts`：名梗道具目录（3 槽 × R..UR）+ 塔掉落表 + 知识点兑换价。
- [ ] equipment store（inventory + equip/unequip per character，serialize/deserialize/reset）+ 装配器接入。
- [ ] `combat`/`SquadBattleView` 接 equipBonus（解析 equipped → 逐围加成）；塔掉落（通层 roll 道具入背包）；知识点兑换 shop。
- [ ] **装备背包视图**（**卡片网格布局，mock 变体 1**：稀有度徽章 + 槽位图标 + 名梗名 + 数值加成 + 装备中标签；顶部按槽/稀有度筛选）+ 角色详情面板 3 槽位的**配装/卸下**交互（点槽 → 背包 picker 选同槽道具）；测试（equipment store / combat 带装备 / 掉落与兑换）。
- **Exit**：塔掉落 + KP 兑换能拿装备；配装改变战力；UI 可配可卸；type-check/test/build + 基线。**独立可上线**（C1 之上加装备层）。

**Exit（整体）**：合并后家园闭环 = 「入住挂机长级/好感 → 带去打塔(涨经验/好感 + 掉装备) → 配装提战力 → 打更高塔」，且 A/B/C1/C2 每步曾独立可玩。

> **最脆弱假设**：去掉 attributes/battleEnhancements、战力改"初始五维+加点+装备"后，塔不过易/过难。变形求生：塔按层自适应难度，旧投入已丢、玩家重新练级，单机无 PvP/排行榜，`POINTS_PER_LEVEL` 可调到让满级战力对齐旧区间。回滚：v14 删字段不可逆，但删的是已决定丢弃的训练数据；v13 代码读 v14 档会把旧字段补默认空值、角色照常工作，回滚成本低。背包膨胀留 backlog（后续加"分解装备换 KP"）。

> **最脆弱假设**：单机/无体力/本地存档下玩家会被挂机吸引。变形求生：挂机不发明 FOMO，喂给已有的内在目标（塔进度 + 图鉴/好感收集）；即使玩家不在意，功能零阻塞、低危害、可低成本回滚（v13 增量，停读家园域即可，已写入 nurture 的成长留存）。**显式延后**：槽位扩展是否做成 KP sink / chibi 美术出多少张 / C 阶段养成页是「交叉链接」还是「真迁入」——到时按体验定。

---

## ☐ S11 — React 视图迁移（演进）

**目标**：视图层换 React，盖在已干净的 engine 上，拿到单一 TS 栈。

- [ ] 新建 React 应用骨架，直接复用 `engine / types / config / data / infra`
- [ ] 状态层重写：Pinia → Zustand / Jotai（仍是「薄编排」）
- [ ] `views` / `components` 按域用 React 重写
- [ ] 对照功能逐页验收

**Exit**：React 版功能对齐；engine 复用率 > 50%。
> 粗粒度。前置依赖 S2–S5 的 engine 必须已干净（已达成，见 HISTORY.md）。详细拆解在 [SPRINT.md](SPRINT.md)（仍决策门控/未激活）。到达时再 `/think` 细化。

---

## ☐ S12 — 权威后端 & 多人/PvP/排行榜（终点）

**目标**：达成多人闭环。

- [ ] `engine` 提升为前后端共享包（monorepo）
- [ ] Node 权威服务端（战斗/抽卡服务端计算，客户端预测）
- [ ] 排行榜（战绩/收集进度）
- [ ] PvP 匹配 + 对战

**Exit**：多人对战与排行榜上线。
> 粗粒度。决策门控（数据库选型、匹配机制等），到达时再 `/think`。下方 Backlog 的三项（品味契合度对照 / 声优维度 / beforeResolve 决策中除外）多数需后端配合，归此 Sprint 一并消化。

---

## 🧾 已知债 / Backlog

穿插在 S11/S12 之间、需独立决策或后端配合的散项。**不属任何已完成 Sprint**，需要时单独立项。

### 🎮 gameplay 决策（可独立做，无后端依赖）

- ⚠️ **beforeResolve 临时强度计入结算档位的去留——已修复，待回访确认是否为最终设计**：原 bug（`battleFlow.resolveClash` 把 `addStrengthBonus` 只加进展示强度、rewards 档位用不含它的 `baseStrengths`，导致学霸气质/圆环理/运动天赋/SOS团氛围等 beforeResolve「+N强度」被动**不影响胜负**只改显示数字）已于 2026-06-17 由提交 `3c359cd` 修复：现在 engine 拿到的最终强度已含临时加成，展示与判定一致（`frontend-vue/src/stores/battleFlow.ts:441-453`）。**当前选择是「计入档位（增强）」**而非「从展示剔除（诚实）」。保留于此仅作回访路标：若将来做技能数值平衡时需要重新权衡这两条路径，从这里接着想；否则可视为已闭环。交叉引用：`frontend-vue/CLAUDE.md` Known Debt 的「行为=描述」簇。

### 🔌 需后端配合（归 S12，未做）

- ☐ **品味契合度对照 / taste-social compatibility**（玩家间品味重合度 / 社交化发现，"你和 X 87% 契合"）：2026-06-24 产品循环浮现的 #1 剩余结构性机会——persona 当前被困为单人镜子。需后端 + 触存档 schema，故归 S12。SPRINT.md 明确「本轮不做」。**前置可做**：纯前端异步「品味码」能在投入后端前先验证形态。
- ☐ **声优收集维度 / voice-actor dimension**（按声优收集 / seiyuu 相关玩法）：跨栈，需后端吐 `角色id→声优` 映射。actor 数据在 S9 性能优化时被 `server.py` 在服务 `all_animes` 路径上剥离（占体积 94%），前端拿不到，任何声优功能都需后端先恢复该映射。归 S12。
  > 注：此项在历史上以两处不同措辞出现（Evolution 尾注的「按声优收集维度」与 2026-06-24 循环 round 1 的「声优维度」），是**同一个**跨栈/需后端项，此处已合并为一条，勿再拆。

---
*本文只列「还剩什么」。完成史在 [HISTORY.md](HISTORY.md)；日常产品迭代需求源在 [SPRINT.md](SPRINT.md)。每完成一项请同步勾选；每完成一个 Sprint 请更新「进度总览」状态。最后整理 2026-06-29（S13 家园 A/B 落地 + C 重构为养成精简+装备 C1/C2）。*
