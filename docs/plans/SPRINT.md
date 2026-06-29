# AnimePlay — SPRINT 合同（S13-C2：装备系统全栈）

> multi-ralph / product-loop 执行合同（本轮 `--tier1 off`：本文件 `[ ]` 任务即需求源，目标驱动停）。
> **设计基线在 `docs/FUTURE.md` 的 S13 → C 段（C2 部分）**；C1（养成精简+加点制+v14）已完成并合并。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`（尤其「养成重构」「barColor 拼类教训」「白名单重建迁移」三条）、`docs/FUTURE.md` S13-C。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法网页游戏。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`；后端 `python start_server.py`（:5001）。
- 本 sprint = **S13-C2 装备系统全栈**：填上 C1 留的空 equipment 存档域 + 战力 equipBonus 口，做出「获得装备 → 配装 → 提战力」闭环 + 背包/配装 UI。**不再升存档（v14 已含空 equipment 域）。**

## 已锁定设计（不要重新发明，名值都进 `config/equipment.ts`、后调）

**装备模型**
- 3 固定槽：`weapon` 武器 / `armor` 防具 / `supporter`。物品**数值自定义**（`bonus: Partial<{hp,atk,def,sp,spd}>`），稀有度 R/SR/SSR/HR/UR。**任意角色可戴任意装备**（无稀有度硬限制）。物品定义（id/name/slot/rarity/bonus）静态目录放 `config/equipment.ts`。
- **数值预算**（每件总加成，hp 按 ~2.5× 折算，可调）：R~18 / SR~35 / SSR~60 / HR~95 / UR~140。
- **起始目录**（Generator 按预算建在 config，名值可后调；示例）：武器=木刀R/斩月SR/后藤的吉他SSR/死亡笔记HR/朗基努斯之枪UR；防具=校服R/绝对领域SR/纳米装甲SSR/须佐能乎HR/AT力场UR；supporter=应援棒R/竹蜻蜓SR/写轮眼SSR/草帽HR/四次元口袋UR。每槽 ≥1 件/稀有度，覆盖 R..UR。

**实例 / 背包 / 装备槽**（存档域 C1 已建，v14 不再升）
- equipment 域：`{ inventory: {uid,defId}[], equipped: Record<charId,{weapon,armor,supporter: uid|null}> }`。一件实例（uid，`crypto.randomUUID()`，store 层生成）只能戴在一个角色一个槽。
- 装备/卸下/获得入库的行为在 `stores/equipment.ts`（C1 只建了 serialize/deserialize/reset，本轮填行为）；跨域编排（结算+存档）走门面 userStore。

**战力接入**（C1 已留口）
- `engine/squad/combat.ts` 的 `generateBattleStats(base, statPoints, equipBonus)` 已就位。C2 把每角色 `equipped` 解析成 `equipBonus`（三件已装道具 bonus 逐围求和）传入；`SquadBattleView` 现传的恒 0 改为真实 equipBonus。equipBonus 解析是**纯函数**（engine 或 config，便于测试）。

**来源**
- **塔掉落**：通层后 **50% 掉 1 件**，稀有度按层段（1-5→R / 6-15→SR / 16-30→SSR / 31-50→HR / 51+→UR），槽随机。**RNG 必须注入**（engine 纯函数定掉落，便于测试），store 层执行入库。
- **知识点兑换**：商店买**指定**道具，价 R400/SR1200/SSR4000/HR10000/UR24000，**走 `profile.spend('knowledgePoints')`**，成功才入库。

**UI（mock 已定稿）**
- **背包视图 = 变体 1 卡片网格**：稀有度徽章 + 槽位图标 + 名梗名 + 数值加成 + 「装备中·角色」标签；顶部按槽/稀有度筛选。
- **角色页（C1 变体 A）3 个装备槽**接上**配装交互 = 变体 A 弹窗 picker**：点槽 → 弹窗，左列同槽候选（含「卸下/不装备」）+ 右侧**「装上后五维 当前→新值(+Δ)」预览 + 战力 当前→新值**，确认「装备」/「卸下」。

## 架构铁律（不可违反）
engine 纯净（零 Vue/Pinia/DOM/IO/`Math.random`，掉落/equipBonus 纯函数 + 注入 RNG）/ 依赖只向下 / 货币只走 `profile.spend·earn` / 颜色走皮肤语义令牌（**禁 text-white 压浅底、禁拼接动态色类**——见 C1 barColor 教训：稀有度色用完整字面映射）/ 组件 setTimeout/rAF 登记并卸载清除。**别动 C1 已成的养成两轴与家园挂机/塔的加经验·好感入口。**

## 任务清单（S13-C2）

- [ ] **C2-T1｜装备目录 config**：`config/equipment.ts` —— 物品定义类型 + 3 槽 × R..UR 起始目录（按预算，名值可后调）+ 掉落层段表 + 兑换价表 + 槽位元数据（名/图标键）。纯数据/纯常量，零 Vue/IO。
- [ ] **C2-T2｜equipment store 行为**：`stores/equipment.ts` 填行为 —— addItem(defId)→建实例入 inventory、equip(charId,slot,uid)/unequip(charId,slot)（同槽校验、换下旧件留背包）、resolveEquipBonus(charId)→逐围求和（或抽 engine 纯函数）、getEquipped/list。保留 serialize/deserialize/reset。uid 用 crypto.randomUUID()。
  - 验收：单测覆盖 equip/unequip/换装/同槽校验/resolveEquipBonus 求和。
- [ ] **C2-T3｜战力接 equipBonus**：`SquadBattleView` 战力计算把恒 0 的 equipBonus 换成 `resolveEquipBonus(charId)`（两处战力调用 + 角色页战力展示口径一致）；equipBonus 解析为纯函数。更新/补 combat 相关测试。
  - 验收：装上道具后角色战力/五维按 base+加点+装备正确变化；engine 纯净不破。
- [ ] **C2-T4｜来源：塔掉落 + KP 兑换**：engine 纯函数 `rollTowerDrop(floor, rng)`（50% + 层段稀有度 + 随机槽）；塔通层结算调它、命中则 store addItem + 通知。知识点兑换商店：买指定道具 → `profile.spend` 成功 → addItem。RNG 注入。
  - 验收：掉落纯函数特征测试（层段→稀有度、概率边界、注入 RNG 可复现）；兑换走 spend、余额不足不发货。
- [ ] **C2-T5｜UI：背包 + 配装**：背包视图（变体 1 网格 + 筛选）；角色页 3 槽接配装弹窗（变体 A：候选 + 五维/战力 delta 预览 + 装备/卸下）。颜色语义令牌、稀有度色用完整字面映射（勿运行时拼类）。
  - 验收：type-check 0 / build 通过；能在 UI 里查背包、给角色配装/卸下、看到 delta、战力随之变。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含新增 equipment store / 掉落 / equipBonus / combat 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（C2 不碰后端，期望退出码 0、全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且 C2-T1..C2-T5 全部 `[x]`。
