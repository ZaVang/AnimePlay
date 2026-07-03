# 小队技能「逐角色差异化」审计报告（2026-07-03）

> **一句话结论**：SSR 开放出战后可出战池 = **318 人**（UR 67 / HR 110 / SSR 141），但**真正逐角色设计过技能（专属 effect）的只有 10 人（全 UR，占 3.1%）**；其余 308 人的技能效果全部来自共享的 6 套 archetype 模板，其中 **141 个 SSR 是 100% 通用克隆**（连技能名都没单独取）。技能配置与生成逻辑目前**混在 `data/squadSkillKits.ts` 一个 801 行文件里**，可、且应拆成独立配置。本报告给出实测数据、根因、三步拆分方案，及一个附带发现的测试/线上数据不一致问题。

> **触发**：2026-07-03 完成「SSR 开放家园入住 + 挑战塔出战」（commit `6d9f9f3` / merge `91a8f36`，见 [HISTORY.md](../HISTORY.md)）后，需确认：① SSR+HR+UR 共多少人；② 是否每人都有专门技能设计；③ 技能配置能否与主逻辑拆分。
>
> **验证等级**：census 三方独立计数一致（人工 + workflow census agent + 对抗性复核 agent）；coverage 由本人按**线上服务名单**重算（workflow coverage agent 误读了测试文件，见 §5）。工作流 run `wf_443b3d7a-eb1`（4 agent，architecture agent 中途 API 断线，方案由人工补全）。

---

## 1. 可出战角色数（问题 ①）

**318 人**（可入住家园、可编入挑战塔小队）。

| 稀有度 | 人数 |
|---|---:|
| UR | 67 |
| HR | 110 |
| SSR | 141 |
| **SSR+HR+UR 合计** | **318** |
| SR | 341（不可出战） |
| R | 851 |
| N | 511 |
| 总角色 | 2021 |

- **数据源**：后端 `/api/all_characters`（`backend/server.py:240`）→ `load_character_cards()`（`server.py:49-53`）**逐字**返回 `data/selected_character/all_cards.json`（2021 人）的 `rarity` 字段，运行时不计算。
- **稀有度怎么定的**：`rarity` 是**生成时固化**的静态字段。最初由 `backend/create_curated_dataset.py` 按人气**百分位**分档（`RARITY_PERCENTILES` = UR 0.10 / HR 0.25 / SSR 0.45 / SR 0.70 / R 1.0，`assign_rarity_by_percentile()` 行 80–101），随后被 `backend/regrade_rarity.py`（`assign_by_current_counts()` 行 55–68）**重排**——保持每档现有人数不变、只按 `popularity_score` 重新决定谁进哪档。**注意**：`create_curated_dataset.py` 里的百分位常量已**过时**（对 n=2021 会给出 UR 202 / HR 303 / SSR 404，与实际 67/110/141 不符）——**以文件实际计数为准，别信公式**。
- 稀有度**不进存档、不影响战力**（仅展示 + gacha 元数据），是安全的静态字段。

**核算命令**：
```bash
python -c "import json,collections; d=json.load(open('data/selected_character/all_cards.json',encoding='utf-8')); \
c=collections.Counter(x.get('rarity') for x in d); print('total',len(d)); \
[print(k,c.get(k,0)) for k in ['UR','HR','SSR','SR','R','N']]; \
print('SSR+HR+UR', c.get('SSR',0)+c.get('HR',0)+c.get('UR',0))"
# total 2021 / UR 67 / HR 110 / SSR 141 / SR 341 / R 851 / N 511 / SSR+HR+UR 318
```

---

## 2. 逐角色技能设计覆盖（问题 ②）——**几乎没有**

按**线上服务名单**（`selected_character/all_cards.json`）重算的差异化分层：

| 稀有度 | 总数 | 专属机制/effect | 只有技能名不同 | 名+效果全通用克隆 |
|---|---:|---:|---:|---:|
| UR | 67 | **10** | 44 | 13 |
| HR | 110 | 0 | 36 | 74 |
| **SSR** | **141** | **0** | **0** | **141** |
| **合计** | 318 | **10（3.1%）** | 80 | 228 |

**定义**：
- **专属 effect** = 手写了独特技能效果（`SIGNATURE_KIT_OVERRIDES`）——真正的机制层差异化。
- **只有名不同** = 技能**名字**取自角色个人技 / 手工名表，但 effect 仍是共享模板。
- **全通用克隆** = 名（`${角色名}·${模板通名}`）与 effect 都来自模板。

### 关键事实

1. **真正专门设计过的只有 10 人,全是 UR 招牌**：`SIGNATURE_KIT_OVERRIDES`（`squadSkillKits.ts:460-600`，10 条）是**唯一**的专属 effect 来源。ids = `[49, 303, 304, 706, 1211, 3575, 10439, 10440, 10596, 12393]`（御坂美琴超电磁炮点名沉默、晓美焰时停全体眩晕、鹿目圆圆环之理群疗+复活…）。

2. **SSR 全 141 是通用克隆**：0 出现在任何 override 表（`SIGNATURE_KIT_OVERRIDES` / `EXPLICIT_ARCHETYPE` / `HR_SKILL_NAME_OVERRIDES`），线上名单里 0 个 SSR 有个人技名绑定 → **141/141 全通用**。

3. **结构性天花板——五槽里只有两槽能个性化**：`getSquadSkillKitForCharacter`（`squadSkillKits.ts:706-751`）装配五槽，只有 `skill1` 和 `ultimate` **能**承载专属 effect（且只对那 10 个 UR）；`normalAttack` / `skill2` / `passive` 对**任何人**恒为模板效果。

4. **SSR 约 2/3 坍缩成同一套**：`resolveArchetype` 兜底链 = `EXPLICIT_ARCHETYPE` 表 → `inferArchetypeByText` 正则 → `battle_stats` → 稀有度。SSR 面板偏肉，约 **129/141 走 `battle_stats` 的 `hpDef>atkSp` 分支被判成 guardian**（`squadSkillKits.ts:172`），kit 近乎相同。（注：不是 `line 176` 的 `rarity→support` 末端兜底——那条对 SSR 触发 0 次。）

### 配置数据结构清单（全在 `data/squadSkillKits.ts`，801 行）

| 结构 | 位置 | 规模 | 作用 |
|---|---|---:|---|
| `EXPLICIT_ARCHETYPE` | 125–146 | 18 条 | 只钉 archetype 归类,无 effect/名 |
| `SIGNATURE_KIT_OVERRIDES` | 460–600 | 10 条（全 UR） | **唯一**专属 effect 来源（覆盖 skill1 或 ultimate） |
| `HR_SKILL_NAME_OVERRIDES` | 622–679 | 26 条（全 HR） | 只改技能**名**,effect 不动 |
| `archetypeEffects()` | 249–431 | 6 套模板 | **所有**非专属 effect 的来源 |
| `urCharacterSkillMap` | `urCharacterSkillsGenerated.ts:1148` | 67 键（个人技名绑定） | 提供 skill1/passive/ultimate 的**名** |

**重算脚本**：`scratchpad/recompute_coverage.py`（按 id 解析各表 → 与线上 id→rarity 求交 → 分层计数）。

---

## 3. 配置/逻辑耦合现状（问题 ③ 现状）

`data/squadSkillKits.ts` **一个 801 行文件**同时承担两类职责：

- **配置数据（声明式）**：`EXPLICIT_ARCHETYPE` / `SIGNATURE_KIT_OVERRIDES` / `HR_SKILL_NAME_OVERRIDES` 三张表 + `archetypeEffects` 6 套模板 + `archetypeLabels`/`targetLabels`/`statusLabels`。
- **生成逻辑（命令式）**：`resolveArchetype`/`inferArchetypeByText`（归类）+ `getSquadSkillKitForCharacter`（装配）+ `describeSquadSkill`/`describeEffect`（描述派生）+ `validateSquadSkillKit`/`validateSquadSkillCoverage`（校验）+ 一批导出谓词。

诉求 = 把 per-character 技能配置拆进固定配置文件、与主逻辑分离。

---

## 4. 建议方案（三步,全程保留模板兜底 → 零回归）

每步都能保持测试全绿（未配置角色继续走程序化模板 = 与今天完全一致）。

1. **纯拆分（无行为变更）** — 配置表抽到 `data/squad/`：
   - `data/squad/archetypeTemplates.ts` — 6 套模板 + labels（纯数据）。
   - `data/squad/characterKits.ts` — 按 id 的 per-character 覆盖表。
   - 装配/校验/描述留成纯函数模块（可留 `data/` 或提到 `engine/squad/`,注意 engine 纯净铁律)。
   - **本步即交付"配置与逻辑分离"**,风险最低。
2. **统一形状** — 把 3 张 override 表并成**一张** per-character kit 配置：
   ```ts
   { role?: SquadArchetype, slots?: { skill1?: SlotDef, skill2?: SlotDef, passive?: SlotDef, ultimate?: SlotDef } }
   ```
   可仿项目**已有**的 UR 技能 **docs→生成** 管线（`docs/UR角色技能设计.md` + `scripts/generateUrSkills.js` → `urCharacterSkillsGenerated.ts`,标「请勿手动编辑」）：做一份 `docs/小队技能设计.md` + `scripts/generateSquadKits.js` → 生成 `data/squad/characterKitsGenerated.ts`。人改文档、机器生成配置,可评审、可扩展到全 318。
3. **逐角色补设计** — 优先 **SSR（141,100% 通用、收益最大）** → HR 通用 74 → UR 通用 13。不必五槽全手写:每人「1 个 role + ≥1 招牌槽」即可摆脱克隆感（参照现有 10 UR 招牌粒度）,约 228 人需要补。

**约束**：准入仍走 `engine/squad/eligibility.ts` 的 `TOWER_SQUAD_ALLOWED_RARITIES` 单一真相源;kit 配置按 id 正交,不碰准入。遵守 engine 纯净 + 依赖只向下铁律。

**取舍**：程序化模板（现状）= 零维护但 228/318 是克隆、141 SSR 近乎同一套;显式 per-character = 完全差异化但需逐个作者化。推荐**中间路线**（每人 role + 招牌槽,其余复用模板）+ docs→生成管线,先啃 SSR。

---

## 5. 附带发现：测试数据文件 ≠ 线上服务文件（须修）

小队技能 coverage **测试**（`frontend-vue/src/data/squadSkillKits.test.ts:26`）读的是 `data/character/all_cards.json`（**3647 人**,UR 42 / HR 55 / SSR 201）;而游戏**线上服务**的是 `data/selected_character/all_cards.json`（**2021 人**,UR 67 / HR 110 / SSR 141,`backend/server.py:53`）。**两份文件、两套稀有度分档**。

后果：coverage 测试的稀有度假设 ≠ 线上,等于**没在守真实出战名单**。例:线上 0 个 SSR 有个人技名,测试文件里却有 9 个（ids `7,77,84,707,708,2355,12394,19915,27235`——它们在两份文件里稀有度不同）。测试仍能过（生成对任意名单都产出合法 kit）,但它验证的不是玩家实际会遇到的角色集。**拆分时顺手把测试指到服务同源文件。**

---

## 6. 落点

- 已在 [FUTURE.md](../FUTURE.md) → 「已知债 / Backlog」→「gameplay 决策」立项:**小队技能 per-character 差异化 + 技能配置表拆分**。
- 本报告为该 backlog 项的证据源（file:line 可回查）。
- 相关铁律与既有模式:`frontend-vue/CLAUDE.md`（engine 纯净 / 依赖只向下 / 生成文件请勿手编）、[挑战塔系统.md](../挑战塔系统.md)（出战准入）。

---

## 7. 进展（2026-07-03 当日落地）

三步方案已启动并完成到 SSR：

| 步骤 | 状态 | commit | 要点 |
|---|---|---|---|
| Step1 配置/逻辑拆分 | ✅ | `a3dce5d` | 抽出 `data/squad/archetypeTemplates.ts`（6 模板+标签）+ `characterKits.ts`（3 覆盖表）；`squadSkillKits.ts` 纯逻辑。逐行 diff 174 数据行零变更 |
| Step2 统一形状 | ✅ | `bb1be57` | 三表并成一张 `CHARACTER_KITS`（一角色一条目）；程序化迁移 + **3647 角色 kit 输出等价快照 0 差异**；解除「signature=UR 专属」测试约束 |
| Step3 逐角色设计（全出战池） | ✅ | `44fdeb5`+`b770793`+`7135a21` | 8 小样评审 + 铺量 133 SSR + 87 通用 HR/UR = **全 318 出战池差异化**（workflow 生成 + 人工 balance-lint 0 warning + 1 例手补） |

**差异化重算（服务名单 318 出战池）**：bespoke effect 从 **10 人（3.1%）→ 约 238 人（~75%）**；**「名+effect 全通用」克隆 87 → 0**（141 SSR + 74 HR + 13 UR 全部逐角色设计）。附带修复 dot/hot 描述把每跳点数误渲染成 %。

**可选后续**：① 80 个 name-only（44 UR + 36 HR，有招牌名但沿用定位模板 effect）可再深一层做四槽全专属；② 修 §5 测试/线上数据文件不一致。

*审计于 2026-07-03。数据源 commit `cd75c09` 时点；进展更新至 `b770793`。*
