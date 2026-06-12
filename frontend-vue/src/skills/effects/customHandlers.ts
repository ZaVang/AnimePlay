/**
 * 真实现/条件播报/交互式技能 handler（S4 自 skills/effects/index.ts 切分，body 原样保留）。
 * 与播报表（engine/skills/announcements.ts）互斥：一个 effectId 只在一边。
 * 约定：
 *  - 随机一律用 ctx.rng（注入源），禁止 Math.random；
 *  - 持续效果/状态标记经 ../systems 的共享实例；
 *  - 交互式 UI 经 ../interaction 的 InteractionSystem。
 */
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import type { EffectContext } from '@/engine';
import { statusEffects, persistentEffects } from '../systems';
import { InteractionSystem } from '../interaction';

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

export const customHandlers: Record<string, EffectHandler> = {
  DRAW_1: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    playerStore.drawCards(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 触发效果：抽1张牌。`, 'info');
    gameStore.addNotification('效果：抽1张', 'info');
  },

  // Gain 2 TP (simple utility),

  GAIN_TP_2: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    playerStore.changeTp(ctx.playerId, 2);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 恢复2点TP。`, 'info');
  },

  // Gain 1 TP,

  GAIN_TP_1: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    playerStore.changeTp(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 恢复1点TP。`, 'info');
  },

  // Add +2 strength to the side determined by ctx.role (applies in beforeResolve),

  STRENGTH_PLUS_2: (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    ctx.addStrengthBonus(ctx.role, 2);
    const historyStore = useHistoryStore();
    historyStore.addLog(`${ctx.role === 'attacker' ? '攻方' : '守方'} 获得临时强度 +2。`, 'info');
  },

  // Placeholder: Make next played card count as any type (requires status system),

  NEXT_CARD_ANY_TYPE: (ctx) => {
    const historyStore = useHistoryStore();
    const playerStore = usePlayerStore();
    statusEffects.grantNextCardAnyType(ctx.playerId);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 获得效果：下一张卡视为任意类型。`, 'info');
  },

  // Halve opponent bias towards their favor (placeholder demo),

  BIAS_HALVE_OPP: (ctx) => {
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    const oppBias = gameStore.topicBias * (opponentId === 'playerA' ? 1 : -1);
    if (oppBias > 0) {
      const reduce = Math.floor(oppBias / 2);
      gameStore.updateTopicBias(reduce * (opponentId === 'playerA' ? -1 : 1));
      historyStore.addLog(`削减对手议题优势 ${reduce}。`, 'info');
    }
  },

  // +1 Strength for the acting side in beforeResolve,

  STRENGTH_PLUS_1: (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    ctx.addStrengthBonus(ctx.role, 1);
    const historyStore = useHistoryStore();
    historyStore.addLog(`${ctx.role === 'attacker' ? '攻方' : '守方'} 获得临时强度 +1。`, 'info');
  },

  // +1 topic bias towards the acting player's side after resolve,

  TOPIC_BIAS_PLUS_1: (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    gameStore.updateTopicBias(delta);
    historyStore.addLog(`议题偏向 ${delta > 0 ? '+1' : '-1'}。`, 'info');
  },

  // === UR角色技能效果处理器 ===
  // 注：旧版英文 ID 的 handler（KURISU_*、SENJOUGAHARA_*）已于 S1 清理——
  // 全仓库零引用的死代码，实际技能绑定走下方中文 effectId（见 data/urCharacterSkillsGenerated.ts）。
  
  // 牧濑红莉栖技能,

  '牧濑红莉栖_时间理论': async (ctx) => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const interactionSystem = InteractionSystem.getInstance();
    const persistentSystem = persistentEffects;
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 使用了时间理论！`, 'info');
    
    // 查看对手3张手牌
    try {
      await interactionSystem.viewOpponentHand(ctx.playerId, { count: 3, source: 'hand', title: '时间理论：查看对手手牌' });
    } catch (error) {
      console.warn('Hand viewing not available:', error);
    }
    
    // 本回合科幻类卡牌+2强度
    persistentSystem.addCardTypeStrengthBonus(ctx.playerId, '科幻', 2, 1);
    
    gameStore.addNotification('时间理论：查看手牌+科幻强化', 'info');
  },

  '牧濑红莉栖_科学逻辑': (ctx) => {
    if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.includes('科幻')) return;
    
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 30%几率抽1张牌
    if (ctx.rng.next() < 0.3) {
      playerStore.drawCards(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的科学逻辑触发：抽1张牌。`, 'info');
    }
  },

  // 战场原黑仪技能,

  '御坂美琴_超电磁炮': (ctx) => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现本回合科幻或战斗类卡牌+2强度的功能
    // TODO: 实现对对手造成议题偏向-1的功能
    const delta = ctx.playerId === 'playerA' ? -1 : 1;
    gameStore.updateTopicBias(delta);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发射超电磁炮！科幻/战斗卡牌+2强度，议题偏向-1。`, 'info');
    gameStore.addNotification('超电磁炮：科幻/战斗+2强度', 'info');
  },

  '黄前久美子_和谐演奏': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现己方与对方各抽1张牌，若双方都抽到相同类型卡牌，则己方+2TP的功能
    playerStore.drawCards(ctx.playerId, 1);
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    playerStore.drawCards(opponentId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动和谐演奏：双方各抽1张牌。`, 'info');
    // TODO: 检查卡牌类型匹配并给予TP奖励
  },

  '后藤一里_独奏时光': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    const handSize = playerStore[ctx.playerId].hand.length;
    if (handSize >= 7) {
      // TODO: 实现本回合内所有日常类卡牌+3强度的功能
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 进入独奏时光！手牌充足，日常卡牌+3强度。`, 'info');
      gameStore.addNotification('独奏时光：日常卡牌+3强度', 'info');
    }
  },

  // 忍野忍技能,

  '忍野忍_吸血冲击': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    if (playerStore[opponentId].tp >= 2) {
      playerStore.changeTp(opponentId, -2);
      playerStore.changeTp(ctx.playerId, 2);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 发动吸血冲击：吸取对手2TP。`, 'info');
    } else {
      playerStore.changeReputation(opponentId, -3);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 发动吸血冲击：对手TP不足，造成3点声望损失。`, 'info');
    }
  },

  '洛琪希_米格路迪亚_格雷拉特_魔法指导': async (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    const interactionSystem = InteractionSystem.getInstance();
    const persistentSystem = persistentEffects;
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 进行魔法指导：选择一张手牌视为任意类型。`, 'info');
    
    // 选择己方一张手牌
    try {
      const result = await interactionSystem.selectFromHand(ctx.playerId, {
        count: 1,
        source: 'hand',
        required: false,
        title: '魔法指导',
        description: '选择一张手牌，本回合打出时可视为任意类型'
      });
      
      if (!result.cancelled && result.selected.length > 0) {
        // 标记选中的卡牌本回合视为万能类型（这里需要进一步的系统支持）
        gameStore.addNotification('魔法指导：手牌已强化为万能类型', 'info');
        persistentSystem.addEffect({
          playerId: ctx.playerId,
          type: 'card_type_override',
          duration: 1,
          data: { cardId: result.selected[0].id, newType: 'any' },
          description: '魔法指导：卡牌视为任意类型'
        });
      }
    } catch (error) {
      console.warn('Card selection not available:', error);
      gameStore.addNotification('魔法指导：选择手牌变为万能类型', 'info');
    }
  },

  '洛琪希_米格路迪亚_格雷拉特_师者风范': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('奇幻')) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      playerStore.changeTp(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的师者风范：打出奇幻卡牌，获得1TP。`, 'info');
    }
  },

  // 加藤惠技能,

  '加藤惠_平凡魅力': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('日常')) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      // 50%几率获得1TP
      if (ctx.rng.next() < 0.5) {
        playerStore.changeTp(ctx.playerId, 1);
        const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
        historyStore.addLog(`${name} 的平凡魅力：打出日常卡牌，获得1TP。`, 'info');
      }
    }
  },

  // 长门有希技能,

  '千反田爱瑠_好奇探究': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 抽2张牌，然后弃1张牌
    playerStore.drawCards(ctx.playerId, 2);
    // TODO: 实现弃牌选择和校园类卡牌额外抽牌的功能
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 好奇探究：抽2张牌，然后弃1张。`, 'info');
  },

  '凉宫春日_团长命令': (ctx) => {
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    
    // 强制交换双方的议题偏向值（正负号互换）
    const currentBias = gameStore.topicBias;
    gameStore.updateTopicBias(-currentBias * 2); // 从current变为-current
    
    const playerStore = usePlayerStore();
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发出团长命令：议题偏向反转！`, 'info');
  },

  '凉宫春日_SOS团氛围': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.card?.synergy_tags?.includes('日常') && ctx.addStrengthBonus) {
      ctx.addStrengthBonus(ctx.role, 1);
    }
  },

  // 秋山澪技能,

  '秋山澪_学霸气质': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      const playerStore = usePlayerStore();
      if (playerStore[ctx.playerId].reputation >= playerStore[ctx.playerId === 'playerA' ? 'playerB' : 'playerA'].reputation) {
        ctx.addStrengthBonus(ctx.role, 1);
      }
    }
  },

  // 古河渚技能,

  '古河渚_团子治愈': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    // 己方声望+3，对方声望+1
    playerStore.changeReputation(ctx.playerId, 3);
    playerStore.changeReputation(opponentId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 分享团子治愈：双方声望提升。`, 'info');
  },

  // 坂田银时技能,

  '坂田银时_武士觉醒': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    if (playerStore[ctx.playerId].reputation <= 15) {
      // TODO: 实现本回合所有攻击+3强度的功能
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 武士觉醒：逆境中爆发，攻击+3强度！`, 'info');
      gameStore.addNotification('武士觉醒：攻击+3强度', 'info');
    }
  },

  // 远坂凛技能,

  '喜多郁代_社交网络': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手2张手牌的功能
    playerStore.drawCards(ctx.playerId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展开社交网络：查看对手手牌并抽牌。`, 'info');
  },

  // 惠惠技能,

  '惠惠_爆裂魔法': (ctx) => {
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    
    // 造成巨大议题偏向变化+4
    const delta = ctx.playerId === 'playerA' ? 4 : -4;
    gameStore.updateTopicBias(delta);
    
    // TODO: 实现下回合无法使用任何卡牌的功能
    const playerStore = usePlayerStore();
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动爆裂魔法！巨大议题冲击+4，但下回合exhausted！`, 'info');
  },

  '惠惠_爆裂专精': (ctx) => {
    if (ctx.event === 'afterResolve' && ctx.card?.synergy_tags?.includes('奇幻')) {
      const gameStore = useGameStore();
      const delta = ctx.playerId === 'playerA' ? 1 : -1;
      gameStore.updateTopicBias(delta);
    }
  },

  // 鹿目圆技能,

  '鹿目圆_希望之光': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    // 双方声望各+3，己方议题偏向+1
    playerStore.changeReputation(ctx.playerId, 3);
    playerStore.changeReputation(opponentId, 3);
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    gameStore.updateTopicBias(delta);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 释放希望之光：双方声望+3，己方议题+1。`, 'info');
  },

  '鹿目圆_圆环理': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      const playerStore = usePlayerStore();
      const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
      
      if (playerStore[opponentId].reputation <= 5) {
        ctx.addStrengthBonus(ctx.role, 2);
      }
    }
  },

  // 中野梓技能,

  '泉此方_运动天赋': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.card?.synergy_tags?.includes('运动') && ctx.addStrengthBonus) {
      ctx.addStrengthBonus(ctx.role, 2);
    }
  },

  // 千早爱音技能,

  '千早爱音_会长领导': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现己方校园类卡牌本回合+2强度，并获得1TP的功能
    playerStore.changeTp(ctx.playerId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现会长领导力：校园卡牌+2强度，获得1TP。`, 'info');
  },

  '冈部伦太郎_命运探测': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看己方牌库顶5张牌，选择2张加入手牌，其余放回牌库底的功能
    playerStore.drawCards(ctx.playerId, 2); // 简化为直接抽2张
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 进行命运探测：精选未来卡牌。`, 'info');
  },

  '冈部伦太郎_狂乱科学家': (ctx) => {
    if (ctx.event === 'afterResolve' && ctx.card?.synergy_tags?.includes('科幻')) {
      const gameStore = useGameStore();
      const delta = ctx.playerId === 'playerA' ? 1 : -1;
      gameStore.updateTopicBias(delta);
    }
  },

  // 逢坂大河技能,

  '逢坂大河_掌中老虎': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现若对手上回合伤害了己方声望，本回合所有攻击+2强度的功能
    // 简化检测：如果声望低于30则认为受到了伤害
    if (playerStore[ctx.playerId].reputation < 30) {
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 掌中老虎暴走！受到伤害后反击+2强度！`, 'info');
    }
  },

  '椎名真由理_治愈笑容': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    // 双方声望各+2，己方抽1张牌
    playerStore.changeReputation(ctx.playerId, 2);
    playerStore.changeReputation(opponentId, 2);
    playerStore.drawCards(ctx.playerId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现治愈笑容：双方声望+2，己方抽牌。`, 'info');
  },

  // 藤原千花技能,

  '藤原千花_千花游戏': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 抽2张牌，然后隐藏其中一张直到下回合，当打出时+2强度
    playerStore.drawCards(ctx.playerId, 2);
    // TODO: 实现隐藏卡牌和延迟强化的功能
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 开始千花游戏：抽2张牌，隐藏1张备用。`, 'info');
  },

  '宫森葵_制作进行': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看己方牌库顶3张牌，选择一张加入手牌，其余放回牌库顺序不变的功能
    playerStore.drawCards(ctx.playerId, 1); // 简化为直接抽1张
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 制作进行：精选牌库卡牌。`, 'info');
  },

  // 折木奉太郎技能,

  '折木奉太郎_节能推理': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    if (playerStore[ctx.playerId].tp <= playerStore[opponentId].tp) {
      // TODO: 实现查看对手3张手牌的功能
      playerStore.drawCards(ctx.playerId, 1);
      
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 节能推理：TP劣势时侦查并抽牌。`, 'info');
    }
  },

  // 由比滨结衣技能,

  '由比滨结衣_察言观色': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手2张手牌，若其中有恋爱或校园类，己方+1TP的功能
    playerStore.changeTp(ctx.playerId, 1); // 简化为直接给TP
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 察言观色：侦查对手获得1TP。`, 'info');
  },

  // 草薙素子技能,

  '明石_冷静分析': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    // TODO: 实现双方弃掉所有手牌中成本最高的1张，然后各抽2张牌的功能
    playerStore.drawCards(ctx.playerId, 2);
    playerStore.drawCards(opponentId, 2);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 冷静分析：重构双方手牌。`, 'info');
  },

  // 阿良良木历技能,

  '阿良良木历_吐槽连击': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现对手每有一张校园类手牌，己方获得1TP（最多3TP）的功能
    playerStore.changeTp(ctx.playerId, 2); // 简化为固定2TP
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 吐槽连击：针对校园环境获得2TP。`, 'info');
  },

  '艾米莉娅_精灵加护': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    // 双方声望各+3，己方奇幻类卡牌本回合+1强度
    playerStore.changeReputation(ctx.playerId, 3);
    playerStore.changeReputation(opponentId, 3);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 获得精灵加护：双方声望+3，奇幻卡牌+1强度。`, 'info');
  },

  '八九寺真宵_咬咬攻击': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现对手下张卡牌强度-1，若己方手牌≥6张则额外-1的功能
    const handSize = playerStore[ctx.playerId].hand.length;
    const penalty = handSize >= 6 ? 2 : 1;
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 咬咬攻击：对手下张卡牌-${penalty}强度。`, 'info');
    gameStore.addNotification(`咬咬攻击：对手卡牌-${penalty}强度`, 'info');
  },

  '菲伦_魔法修行': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看己方牌库顶4张牌，选择一张奇幻类加入手牌的功能
    playerStore.drawCards(ctx.playerId, 1); // 简化为直接抽1张
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 魔法修行：精选奇幻卡牌。`, 'info');
  },

  '赫萝_商业智慧': async (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    const interactionSystem = InteractionSystem.getInstance();
    const persistentSystem = persistentEffects;
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现商业智慧：选择卡牌类型强化。`, 'info');
    
    // 选择一种卡牌类型
    const availableTypes = ['科幻', '战斗', '恋爱', '日常', '校园', '音乐', '奇幻', '运动'];
    
    try {
      const selectedType = await interactionSystem.selectCardType(
        availableTypes,
        '商业智慧',
        '选择一种卡牌类型，该类型卡牌本回合成本-1且强度+1'
      );
      
      if (selectedType) {
        // 本回合该类型卡牌成本-1且强度+1
        persistentSystem.addCardTypeCostReduction(ctx.playerId, selectedType, 1, 1);
        persistentSystem.addCardTypeStrengthBonus(ctx.playerId, selectedType, 1, 1);
        
        historyStore.addLog(`${name} 选择强化 ${selectedType} 类型卡牌。`, 'info');
        gameStore.addNotification(`商业智慧：${selectedType}类型卡牌强化`, 'info');
      }
    } catch (error) {
      console.warn('Type selection not available:', error);
      gameStore.addNotification('商业智慧：选择卡牌类型强化', 'info');
    }
  },

  // 藤林杏技能,

  '珂朵莉_诺塔_瑟尼欧里斯_圣剑解放': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 本回合奇幻和战斗类卡牌+4强度，但己方声望-3
    playerStore.changeReputation(ctx.playerId, -3);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 圣剑解放：奇幻/战斗卡牌+4强度，代价声望-3。`, 'info');
  },

  '珂朵莉_诺塔_瑟尼欧里斯_牺牲觉悟': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      const playerStore = usePlayerStore();
      if (playerStore[ctx.playerId].reputation <= 10) {
        ctx.addStrengthBonus(ctx.role, 2);
      }
    }
  },

  // 安原绘麻技能,

  '安原绘麻_内向专注': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      const playerStore = usePlayerStore();
      if (playerStore[ctx.playerId].hand.length >= 7) {
        ctx.addStrengthBonus(ctx.role, 1);
      }
    }
  },

  // 妮亚技能,

  '妮亚_天真好奇': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();

    // TODO: 实现查看对手3张手牌，每种不同类型令己方抽1张牌的功能
    playerStore.drawCards(ctx.playerId, 2); // 简化为抽2张

    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 天真好奇：侦查多样性，抽2张牌。`, 'info');
  },

  // === S8a 补全：#36 志摩凛 / #37 三笠（设计即按已消费原语落地，无假实现）===

  '志摩凛_秘境营地': (ctx) => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '日常', 2, 1);
    playerStore.changeTp(ctx.playerId, 1);
    gameStore.addNotification('秘境营地：日常+2强度，TP+1', 'info');
  },

  '志摩凛_围炉夜话': (ctx) => {
    // 打出日常卡且（出牌后）手牌≤3 → 抽1
    if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.includes('日常')) return;
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].hand.length > 3) return;
    playerStore.drawCards(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    useHistoryStore().addLog(`${name} 的围炉夜话：手牌告急，抽1张牌。`, 'info');
  },

  '三笠_阿克曼_立体机动': (ctx) => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '战斗', 2, 1);
    playerStore.drawCards(ctx.playerId, 1);
    gameStore.addNotification('立体机动：战斗+2强度，抽1张', 'info');
  },

  '三笠_阿克曼_阿克曼血统': (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation > 15) return;
    ctx.addStrengthBonus(ctx.role, 1);
    useHistoryStore().addLog('阿克曼血统觉醒：+1强度。', 'info');
  },

};
