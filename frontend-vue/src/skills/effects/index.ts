import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';
import { StatusEffectSystem } from '@/core/systems/StatusEffectSystem';
import { InteractionSystem } from '@/core/systems/InteractionSystem';
import { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem';

export type BattleEvent = 'onPlay' | 'beforeResolve' | 'afterResolve';
export type CombatRole = 'attacker' | 'defender';

export interface EffectContext {
  event: BattleEvent;
  playerId: 'playerA' | 'playerB';
  role: CombatRole;
  card?: AnimeCard;
  clash?: ClashInfo;
  addStrengthBonus?: (role: CombatRole, amount: number) => void;
}

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

// Effect registry
const handlers: Record<string, EffectHandler> = {
  // Draw 1 card for the acting player
  DRAW_1: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    playerStore.drawCards(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 触发效果：抽1张牌。`, 'info');
    gameStore.addNotification('效果：抽1张', 'info');
  },

  // Gain 2 TP (simple utility)
  GAIN_TP_2: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    playerStore.changeTp(ctx.playerId, 2);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 恢复2点TP。`, 'info');
  },

  // Gain 1 TP
  GAIN_TP_1: (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    playerStore.changeTp(ctx.playerId, 1);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 恢复1点TP。`, 'info');
  },

  // Add +2 strength to the side determined by ctx.role (applies in beforeResolve)
  STRENGTH_PLUS_2: (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    ctx.addStrengthBonus(ctx.role, 2);
    const historyStore = useHistoryStore();
    historyStore.addLog(`${ctx.role === 'attacker' ? '攻方' : '守方'} 获得临时强度 +2。`, 'info');
  },

  // Placeholder: Make next played card count as any type (requires status system)
  NEXT_CARD_ANY_TYPE: (ctx) => {
    const historyStore = useHistoryStore();
    const playerStore = usePlayerStore();
    StatusEffectSystem.grantNextCardAnyType(ctx.playerId);
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 获得效果：下一张卡视为任意类型。`, 'info');
  },

  // Halve opponent bias towards their favor (placeholder demo)
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

  // +1 Strength for the acting side in beforeResolve
  STRENGTH_PLUS_1: (ctx) => {
    if (ctx.event !== 'beforeResolve' || !ctx.addStrengthBonus) return;
    ctx.addStrengthBonus(ctx.role, 1);
    const historyStore = useHistoryStore();
    historyStore.addLog(`${ctx.role === 'attacker' ? '攻方' : '守方'} 获得临时强度 +1。`, 'info');
  },

  // +1 topic bias towards the acting player's side after resolve
  TOPIC_BIAS_PLUS_1: (ctx) => {
    if (ctx.event !== 'afterResolve') return;
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    gameStore.updateTopicBias(delta);
    historyStore.addLog(`议题偏向 ${delta > 0 ? '+1' : '-1'}。`, 'info');
  },

  // === UR Character Effects ===
  
  // 牧濑红莉栖 - 时间理论
  KURISU_TIME_THEORY: (ctx) => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手3张手牌的功能
    // TODO: 实现本回合科幻类卡牌+2强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 使用了时间理论！`, 'info');
    gameStore.addNotification('时间理论：科幻卡牌+2强度', 'info');
  },

  // 牧濑红莉栖 - 科学逻辑
  KURISU_SCIENCE_LOGIC: (ctx) => {
    if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.includes('科幻')) return;
    
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 30%几率抽1张牌
    if (Math.random() < 0.3) {
      playerStore.drawCards(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的科学逻辑触发：抽1张牌。`, 'info');
    }
  },

  // 战场原黑仪 - 毒舌反击
  SENJOUGAHARA_POISON_TONGUE: (ctx) => {
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const playerStore = usePlayerStore();
    
    // TODO: 实现对手下次"辛辣点评"强度-3的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 准备毒舌反击！`, 'info');
    gameStore.addNotification('毒舌反击：对方辛辣点评-3强度', 'warning');
  },

  // 战场原黑仪 - 傲娇魅力  
  SENJOUGAHARA_TSUNDERE_CHARM: (ctx) => {
    // TODO: 实现对手使用"友好安利"时议题偏向额外+1的功能
    console.log('傲娇魅力被动光环触发');
  },

  // === UR角色技能效果处理器 ===
  
  // 牧濑红莉栖技能
  '牧濑红莉栖_时间理论': async (ctx) => {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const interactionSystem = InteractionSystem.getInstance();
    const persistentSystem = PersistentEffectSystem.getInstance();
    
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
    if (Math.random() < 0.3) {
      playerStore.drawCards(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的科学逻辑触发：抽1张牌。`, 'info');
    }
  },

  // 战场原黑仪技能
  '战场原黑仪_毒舌反击': (ctx) => {
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();
    const playerStore = usePlayerStore();
    
    // TODO: 实现对手下次"辛辣点评"强度-3的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 准备毒舌反击！`, 'info');
    gameStore.addNotification('毒舌反击：对方辛辣点评-3强度', 'warning');
  },

  '战场原黑仪_傲娇魅力': (ctx) => {
    // TODO: 实现对手使用"友好安利"时议题偏向额外+1的功能
    console.log('傲娇魅力被动光环触发');
  },

  // 惣流明日香技能
  '惣流_明日香_兰格雷_同步率爆发': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合所有己方论述+3强度的功能
    // TODO: 实现下回合TP恢复-2的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动同步率爆发！本回合+3强度，下回合TP恢复减少。`, 'info');
    gameStore.addNotification('同步率爆发：+3强度，下回合TP恢复-2', 'warning');
  },

  '惣流_明日香_兰格雷_驾驶员骄傲': (ctx) => {
    // TODO: 实现己方议题偏向≥3时所有卡牌成本-1的功能
    console.log('驾驶员骄傲被动光环生效');
  },

  // 御坂美琴技能
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

  '御坂美琴_电磁干扰': (ctx) => {
    // TODO: 实现对手使用技能时25%几率使其技能冷却+1的功能
    console.log('电磁干扰被动光环监听中');
  },

  // 黄前久美子技能
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

  '黄前久美子_校园协调': (ctx) => {
    // TODO: 实现己方打出校园类卡牌时下次使用技能成本-1的功能
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('校园')) {
      console.log('校园协调：下次技能成本-1');
    }
  },

  // 阿尔托莉雅技能
  '阿尔托莉雅_潘德拉贡_王者威严': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合内奇幻或战斗类卡牌+2强度的功能
    // TODO: 实现"友好安利"的议题偏向效果+1的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现王者威严！奇幻/战斗卡牌+2强度。`, 'info');
    gameStore.addNotification('王者威严：奇幻/战斗+2强度', 'info');
  },

  '阿尔托莉雅_潘德拉贡_骑士守护': (ctx) => {
    // TODO: 实现己方声望≤15时所有防守时强度+1的功能
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation <= 15) {
      console.log('骑士守护：防守强度+1');
    }
  },

  // 后藤一里技能
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

  '后藤一里_隐居创作': (ctx) => {
    // TODO: 实现回合开始时，若己方TP<对方TP则抽1张牌的功能
    if (ctx.event === 'onPlay') { // 简化处理，实际应该是回合开始
      const playerStore = usePlayerStore();
      const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
      if (playerStore[ctx.playerId].tp < playerStore[opponentId].tp) {
        playerStore.drawCards(ctx.playerId, 1);
        console.log('隐居创作：TP劣势，抽1张牌');
      }
    }
  },

  // 忍野忍技能
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

  '忍野忍_不老传说': (ctx) => {
    // TODO: 实现己方技能冷却每回合额外-1的功能
    if (ctx.event === 'onPlay') { // 简化处理
      console.log('不老传说：技能冷却额外-1');
    }
  },

  // 绫波丽技能
  '绫波丽_绝对沉默': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现对手下回合无法使用任何技能的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动绝对沉默：对手下回合无法使用技能。`, 'info');
    gameStore.addNotification('绝对沉默：对手技能禁用', 'warning');
  },

  '绫波丽_零的存在': (ctx) => {
    // TODO: 实现己方议题偏向=0时所有卡牌强度+1的功能
    const gameStore = useGameStore();
    if (gameStore.topicBias === 0) {
      console.log('零的存在：议题中立，卡牌强度+1');
    }
  },

  // 洛琪希技能
  '洛琪希_米格路迪亚_格雷拉特_魔法指导': async (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    const interactionSystem = InteractionSystem.getInstance();
    const persistentSystem = PersistentEffectSystem.getInstance();
    
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

  // 加藤惠技能
  '加藤惠_存在感消失': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合对手无法查看己方手牌的功能
    // TODO: 实现己方恋爱类卡牌成本-1的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 存在感消失：恋爱卡牌成本-1，手牌隐藏。`, 'info');
    gameStore.addNotification('存在感消失：恋爱卡牌-1费用', 'info');
  },

  '加藤惠_平凡魅力': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('日常')) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      // 50%几率获得1TP
      if (Math.random() < 0.5) {
        playerStore.changeTp(ctx.playerId, 1);
        const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
        historyStore.addLog(`${name} 的平凡魅力：打出日常卡牌，获得1TP。`, 'info');
      }
    }
  },

  // 长门有希技能
  '长门有希_信息操作': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现查看己方牌库顶3张牌，选择其顺序重新放回的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 进行信息操作：重新排列牌库顶部。`, 'info');
    gameStore.addNotification('信息操作：重排牌库', 'info');
  },

  '长门有希_数据分析': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('科幻')) {
      // TODO: 实现下张卡牌成本-1的功能
      console.log('数据分析：科幻卡牌打出，下张卡牌成本-1');
    }
  },

  // 千反田爱瑠技能
  '千反田爱瑠_好奇探究': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 抽2张牌，然后弃1张牌
    playerStore.drawCards(ctx.playerId, 2);
    // TODO: 实现弃牌选择和校园类卡牌额外抽牌的功能
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 好奇探究：抽2张牌，然后弃1张。`, 'info');
  },

  '千反田爱瑠_大小姐魅力': (ctx) => {
    // TODO: 实现对手对己方使用"友好安利"时己方声望+1的功能
    console.log('大小姐魅力：友好安利时声望+1');
  },

  // 凉宫春日技能
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
      console.log('SOS团氛围：日常卡牌+1强度');
    }
  },

  // 秋山澪技能
  '秋山澪_贝斯节奏': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现本回合内每打出一张音乐类卡牌，下张卡牌成本-1的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 设定贝斯节奏：音乐卡牌连击减费。`, 'info');
  },

  '秋山澪_学霸气质': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      const playerStore = usePlayerStore();
      if (playerStore[ctx.playerId].reputation >= playerStore[ctx.playerId === 'playerA' ? 'playerB' : 'playerA'].reputation) {
        ctx.addStrengthBonus(ctx.role, 1);
        console.log('学霸气质：声望优势，卡牌+1强度');
      }
    }
  },

  // 古河渚技能
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

  '古河渚_温柔鼓励': (ctx) => {
    // TODO: 实现己方声望≤20时回合开始获得额外1TP的功能
    if (ctx.event === 'onPlay') { // 简化处理
      const playerStore = usePlayerStore();
      if (playerStore[ctx.playerId].reputation <= 20) {
        playerStore.changeTp(ctx.playerId, 1);
        console.log('温柔鼓励：声望低迷时获得1TP');
      }
    }
  },

  // 晓美焰技能
  '晓美焰_时间停止': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现下回合己方先手（打破轮流制一次）的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动时间停止：下回合获得先手权！`, 'info');
    gameStore.addNotification('时间停止：获得额外回合', 'warning');
  },

  '晓美焰_轮回记忆': (ctx) => {
    // TODO: 实现己方被击败的卡牌25%几率返回手牌的功能
    console.log('轮回记忆：败北卡牌可能回收');
  },

  // 伊地知虹夏技能
  '伊地知虹夏_节拍调整': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现重置一个己方角色技能冷却的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 进行节拍调整：重置角色技能冷却。`, 'info');
  },

  '伊地知虹夏_团队协调': (ctx) => {
    // TODO: 实现己方使用技能后全队技能冷却-1的功能
    console.log('团队协调：技能使用后全队冷却-1');
  },

  // 八奈见杏菜技能
  '八奈见杏菜_天然魅力': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现对手下次攻击必须选择"友好安利"的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现天然魅力：对手只能友好安利。`, 'info');
    gameStore.addNotification('天然魅力：强制友好安利', 'info');
  },

  '八奈见杏菜_人气者': (ctx) => {
    if (ctx.event === 'onPlay' && Math.random() < 0.3) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      playerStore.changeTp(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的人气者魅力：获得1TP。`, 'info');
    }
  },

  // 坂田银时技能
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

  '坂田银时_万事屋精神': (ctx) => {
    // TODO: 实现己方手牌种类≥3种时所有卡牌成本-1的功能
    const playerStore = usePlayerStore();
    const handTypes = new Set();
    playerStore[ctx.playerId].hand.forEach(card => {
      if (card.synergy_tags) {
        card.synergy_tags.forEach(tag => handTypes.add(tag));
      }
    });
    
    if (handTypes.size >= 3) {
      console.log('万事屋精神：手牌多样性，卡牌成本-1');
    }
  },

  // 雪之下雪乃技能
  '雪之下雪乃_完美主义': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现本回合内若己方卡牌强度≥对方则额外+1强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现完美主义：优势卡牌额外增强。`, 'info');
  },

  '雪之下雪乃_优等生': (ctx) => {
    // TODO: 实现己方每回合抽取的第一张牌强度+1的功能
    console.log('优等生：第一张抽牌强度+1');
  },

  // 平泽唯技能
  '平泽唯_专注演奏': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合只能打出1张牌，但该牌强度+3的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 专注演奏：限制出牌但大幅增强。`, 'info');
    gameStore.addNotification('专注演奏：单牌+3强度', 'info');
  },

  '平泽唯_天然直觉': (ctx) => {
    // TODO: 实现己方打出的第一张音乐类卡牌每回合强度+1的功能
    if (ctx.event === 'beforeResolve' && ctx.card?.synergy_tags?.includes('音乐') && ctx.addStrengthBonus) {
      ctx.addStrengthBonus(ctx.role, 1);
      console.log('天然直觉：首张音乐卡牌+1强度');
    }
  },

  // C.C.技能
  'CC_GEASS契约': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现双方交换一张手牌，己方获得的牌本回合成本-2的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 缔结Geass契约：交换手牌。`, 'info');
  },

  'CC_不死之身': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    if (ctx.event === 'onPlay' && playerStore[ctx.playerId].reputation < 10) {
      playerStore.changeReputation(ctx.playerId, 2);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的不死之身：声望自动恢复。`, 'info');
    }
  },

  // 远坂凛技能
  '远坂凛_宝石魔术': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现选择一张己方手牌，获得"结算前强度+2"效果的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 施展宝石魔术：强化手牌。`, 'info');
  },

  '远坂凛_魔术师血统': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('奇幻') && Math.random() < 0.4) {
      // TODO: 实现40%几率不消耗该牌的功能
      console.log('魔术师血统：奇幻卡牌不消耗');
    }
  },

  // 喜多郁代技能
  '喜多郁代_社交网络': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手2张手牌的功能
    playerStore.drawCards(ctx.playerId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展开社交网络：查看对手手牌并抽牌。`, 'info');
  },

  '喜多郁代_阳光魅力': (ctx) => {
    if (ctx.event === 'onPlay') {
      const gameStore = useGameStore();
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      const bias = ctx.playerId === 'playerA' ? gameStore.topicBias : -gameStore.topicBias;
      if (bias > 0) {
        playerStore.changeTp(ctx.playerId, 1);
        const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
        historyStore.addLog(`${name} 的阳光魅力：议题优势，获得1TP。`, 'info');
      }
    }
  },

  // 惠惠技能
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
      console.log('爆裂专精：奇幻卡牌议题偏向效果+1');
    }
  },

  // 鹿目圆技能
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
        console.log('圆环理：对手危机，卡牌强度+2');
      }
    }
  },

  // 中野梓技能
  '中野梓_认真练习': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现己方下3张打出的音乐类卡牌强度各+1的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 认真练习：下3张音乐卡牌+1强度。`, 'info');
  },

  '中野梓_后辈努力': (ctx) => {
    // TODO: 实现己方TP<对方时所有音乐类卡牌成本-1的功能
    const playerStore = usePlayerStore();
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    if (playerStore[ctx.playerId].tp < playerStore[opponentId].tp && 
        ctx.card?.synergy_tags?.includes('音乐')) {
      console.log('后辈努力：TP劣势，音乐卡牌成本-1');
    }
  },

  // 鲁路修技能
  '鲁路修_兰佩路基_GEASS命令': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现对手下回合必须打出指定类型的卡牌的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动Geass命令：强制对手行动！`, 'info');
    gameStore.addNotification('Geass命令：对手行动受限', 'warning');
  },

  '鲁路修_兰佩路基_皇族智谋': (ctx) => {
    // TODO: 实现己方每使用一次技能，下次卡牌强度+1的功能
    console.log('皇族智谋：技能使用增强后续卡牌');
  },

  // 千石抚子技能
  '千石抚子_蛇神缠绕': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现对手下张打出的卡牌强度-2，持续2回合的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 施展蛇神缠绕：削弱对手后续卡牌。`, 'info');
    gameStore.addNotification('蛇神缠绕：对手卡牌-2强度', 'warning');
  },

  '千石抚子_害羞可爱': (ctx) => {
    // TODO: 实现对手使用"辛辣点评"时己方声望损失-1的功能
    console.log('害羞可爱：减轻辛辣点评伤害');
  },

  // 山田凉技能
  '山田凉_贝斯律动': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现本回合内每打出一张日常类卡牌，下张卡牌强度+1的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 设定贝斯律动：日常卡牌强化连击。`, 'info');
  },

  '山田凉_音乐狂热': (ctx) => {
    // TODO: 实现己方打出3张不同类型卡牌后下次卡牌成本-2的功能
    console.log('音乐狂热：多样化演奏降低成本');
  },

  // 泉此方技能
  '泉此方_宅女知识': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手2张手牌，若其中有日常类卡牌则己方抽1张牌的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现宅女知识：侦查对手战术。`, 'info');
  },

  '泉此方_运动天赋': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.card?.synergy_tags?.includes('运动') && ctx.addStrengthBonus) {
      ctx.addStrengthBonus(ctx.role, 2);
      console.log('运动天赋：运动卡牌+2强度');
    }
  },

  // 千早爱音技能
  '千早爱音_会长领导': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现己方校园类卡牌本回合+2强度，并获得1TP的功能
    playerStore.changeTp(ctx.playerId, 1);
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现会长领导力：校园卡牌+2强度，获得1TP。`, 'info');
  },

  '千早爱音_流行追随': (ctx) => {
    // TODO: 实现对手打出的卡牌类型，己方下次打出相同类型时成本-1的功能
    console.log('流行追随：模仿对手降低成本');
  },

  // 羽川翼技能
  '羽川翼_完美主义': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现选择己方一张手牌，将其强度调整为5点的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现完美主义：强制标准化卡牌强度。`, 'info');
  },

  '羽川翼_班长职责': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('校园')) {
      // TODO: 实现对手下次攻击成本+1的功能
      console.log('班长职责：校园环境增加对手负担');
    }
  },

  // 冈部伦太郎技能
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
      console.log('狂乱科学家：科幻卡牌议题偏向+1');
    }
  },

  // 逢坂大河技能
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

  '逢坂大河_傲娇反击': (ctx) => {
    // TODO: 实现对手使用"辛辣点评"时己方下次攻击必须选择"辛辣点评"的功能
    console.log('傲娇反击：以牙还牙');
  },

  // 椎名真由理技能
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

  '椎名真由理_天然黑洞': (ctx) => {
    // TODO: 实现对手每使用一次技能，己方有30%几率获得1TP的功能
    if (Math.random() < 0.3) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      playerStore.changeTp(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的天然黑洞：吸收对手技能能量，获得1TP。`, 'info');
    }
  },

  // 芙莉莲技能
  '芙莉莲_魔法收集': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手所有手牌，选择一张奇幻类卡牌复制到己方手牌的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 收集魔法：从对手手牌复制奇幻卡牌。`, 'info');
  },

  '芙莉莲_魔法精通': (ctx) => {
    // TODO: 实现己方奇幻类卡牌无视类型限制，可触发任意被动效果的功能
    if (ctx.card?.synergy_tags?.includes('奇幻')) {
      console.log('魔法精通：奇幻卡牌万能触发');
    }
  },

  // 艾莉丝技能
  '艾莉丝_格雷拉特_狂犬突击': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合所有战斗和奇幻类卡牌+2强度，但下回合无法选择"友好安利"的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动狂犬突击：战斗/奇幻卡牌+2强度！`, 'info');
    gameStore.addNotification('狂犬突击：战斗/奇幻+2强度', 'info');
  },

  '艾莉丝_格雷拉特_贵族血统': (ctx) => {
    // TODO: 实现己方打出同一类型的第2张卡牌时成本-1的功能
    console.log('贵族血统：同类型第2张卡牌成本-1');
  },

  // 坂上智代技能
  '坂上智代_学生会改革': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现重置己方一个技能的冷却时间，并使所有校园类卡牌本回合+1强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 推行学生会改革：重置技能冷却，校园卡牌+1强度。`, 'info');
  },

  '坂上智代_领导魅力': (ctx) => {
    // TODO: 实现回合开始时，若己方议题偏向≥0，全队技能冷却-1的功能
    if (ctx.event === 'onPlay') { // 简化处理
      const gameStore = useGameStore();
      const bias = ctx.playerId === 'playerA' ? gameStore.topicBias : -gameStore.topicBias;
      if (bias >= 0) {
        console.log('领导魅力：议题优势，全队技能冷却-1');
      }
    }
  },

  // 高坂丽奈技能
  '高坂丽奈_专业演奏': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合所有校园类卡牌+3强度，但只能打出1张卡牌的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 专业演奏：校园卡牌+3强度，限制出牌。`, 'info');
    gameStore.addNotification('专业演奏：校园+3强度，限1张牌', 'info');
  },

  '高坂丽奈_音乐世家': (ctx) => {
    // TODO: 实现己方打出的第一张校园类卡牌每回合+2强度的功能
    if (ctx.event === 'beforeResolve' && ctx.card?.synergy_tags?.includes('校园') && ctx.addStrengthBonus) {
      ctx.addStrengthBonus(ctx.role, 2);
      console.log('音乐世家：首张校园卡牌+2强度');
    }
  },

  // 藤原千花技能
  '藤原千花_千花游戏': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // 抽2张牌，然后隐藏其中一张直到下回合，当打出时+2强度
    playerStore.drawCards(ctx.playerId, 2);
    // TODO: 实现隐藏卡牌和延迟强化的功能
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 开始千花游戏：抽2张牌，隐藏1张备用。`, 'info');
  },

  '藤原千花_天真烂漫': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('恋爱')) {
      // TODO: 实现下次使用技能成本-1的功能
      console.log('天真烂漫：恋爱卡牌降低技能成本');
    }
  },

  // 宫森葵技能
  '宫森葵_制作进行': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看己方牌库顶3张牌，选择一张加入手牌，其余放回牌库顺序不变的功能
    playerStore.drawCards(ctx.playerId, 1); // 简化为直接抽1张
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 制作进行：精选牌库卡牌。`, 'info');
  },

  '宫森葵_团队合作': (ctx) => {
    // TODO: 实现己方打出的第2张和第3张不同类型的卡牌都+1强度的功能
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      // 简化检测：假设是多样化出牌
      ctx.addStrengthBonus(ctx.role, 1);
      console.log('团队合作：多样化出牌+1强度');
    }
  },

  // 折木奉太郎技能
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

  '折木奉太郎_省力主义': (ctx) => {
    // TODO: 实现己方每跳过一次攻击机会，下次卡牌成本-1的功能
    console.log('省力主义：跳过攻击降低成本');
  },

  // 阿万音铃羽技能
  '阿万音铃羽_时间警告': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现查看对手下张要打出的牌，可选择令其成本+2的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发出时间警告：预知并干扰对手。`, 'info');
    gameStore.addNotification('时间警告：对手卡牌成本+2', 'info');
  },

  '阿万音铃羽_未来知识': (ctx) => {
    // TODO: 实现己方科幻类卡牌可预知对手下回合的第一张牌的功能
    if (ctx.card?.synergy_tags?.includes('科幻')) {
      console.log('未来知识：科幻卡牌预知对手行动');
    }
  },

  // 立华奏技能
  '立华奏_天使守护': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合己方免疫所有声望损失，并使校园类卡牌+2强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展开天使守护：声望保护，校园卡牌+2强度。`, 'info');
    gameStore.addNotification('天使守护：声望免疫+校园强化', 'info');
  },

  '立华奏_沉默威严': (ctx) => {
    // TODO: 实现对手使用技能时有20%几率无效化的功能
    if (Math.random() < 0.2) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的沉默威严：技能被无效化。`, 'info');
      console.log('沉默威严：技能无效化');
      // TODO: 实际实现技能无效化机制
    }
  },

  // 由比滨结衣技能
  '由比滨结衣_察言观色': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手2张手牌，若其中有恋爱或校园类，己方+1TP的功能
    playerStore.changeTp(ctx.playerId, 1); // 简化为直接给TP
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 察言观色：侦查对手获得1TP。`, 'info');
  },

  '由比滨结衣_温柔体贴': (ctx) => {
    if (ctx.event === 'onPlay') {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
      const repDiff = Math.abs(playerStore[ctx.playerId].reputation - playerStore[opponentId].reputation);
      
      if (repDiff >= 5) {
        playerStore.changeTp(ctx.playerId, 1);
        const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
        historyStore.addLog(`${name} 的温柔体贴：声望差距大时获得1TP。`, 'info');
      }
    }
  },

  // 草薙素子技能
  '草薙素子_电子战': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现禁用对手下回合的一个随机技能，并使己方科幻类卡牌+2强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动电子战：禁用对手技能，科幻卡牌+2强度。`, 'info');
    gameStore.addNotification('电子战：技能禁用+科幻强化', 'info');
  },

  '草薙素子_义体强化': (ctx) => {
    // TODO: 实现己方科幻类卡牌无视防守方的被动光环效果的功能
    if (ctx.card?.synergy_tags?.includes('科幻')) {
      console.log('义体强化：科幻卡牌无视对手被动');
    }
  },

  // 明石技能
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

  '明石_理智思考': (ctx) => {
    // TODO: 实现己方每回合打出的第一张卡牌成本-1的功能
    console.log('理智思考：首张卡牌成本-1');
  },

  // 柊镜技能
  '柊镜_射击精准': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现指定对手一张手牌，令其成本+2，持续到被打出为止的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 射击精准：锁定对手卡牌增加成本。`, 'info');
    gameStore.addNotification('射击精准：对手卡牌+2费用', 'info');
  },

  '柊镜_双子感应': (ctx) => {
    // TODO: 实现己方打出与上张卡牌相同类型时强度+2的功能
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      // 简化检测：假设是连续同类型
      ctx.addStrengthBonus(ctx.role, 2);
      console.log('双子感应：同类型连击+2强度');
    }
  },

  // 阿良良木历技能
  '阿良良木历_吐槽连击': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现对手每有一张校园类手牌，己方获得1TP（最多3TP）的功能
    playerStore.changeTp(ctx.playerId, 2); // 简化为固定2TP
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 吐槽连击：针对校园环境获得2TP。`, 'info');
  },

  '阿良良木历_半吸血鬼': (ctx) => {
    // TODO: 实现己方声望损失时有30%几率减少1点损失的功能
    if (Math.random() < 0.3) {
      console.log('半吸血鬼：减少声望损失');
    }
  },

  // 亚丝娜技能
  '亚丝娜_结城明日奈_闪光剑技': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合科幻类卡牌+3强度，若击败对手获得额外1TP的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 发动闪光剑技：科幻卡牌+3强度！`, 'info');
    gameStore.addNotification('闪光剑技：科幻+3强度', 'info');
  },

  '亚丝娜_结城明日奈_副团长': (ctx) => {
    if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('科幻')) {
      // TODO: 实现下次恋爱类卡牌成本-1的功能
      console.log('副团长：科幻卡牌降低恋爱成本');
    }
  },

  // 碇真嗣技能
  '碇真嗣_AT力场': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合免疫对手的所有技能效果，科幻类卡牌+1强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展开AT力场：技能免疫，科幻卡牌+1强度。`, 'info');
    gameStore.addNotification('AT力场：技能免疫+科幻强化', 'info');
  },

  '碇真嗣_逃避现实': (ctx) => {
    // TODO: 实现己方声望≤15时所有卡牌成本-1的功能
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation <= 15) {
      console.log('逃避现实：低声望时卡牌成本-1');
    }
  },

  // 艾米莉娅技能
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

  '艾米莉娅_银发王选': (ctx) => {
    // TODO: 实现己方议题偏向=0时所有奇幻类卡牌成本-1的功能
    const gameStore = useGameStore();
    if (gameStore.topicBias === 0 && ctx.card?.synergy_tags?.includes('奇幻')) {
      console.log('银发王选：议题中立时奇幻卡牌成本-1');
    }
  },

  // 八九寺真宵技能
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

  '八九寺真宵_迷路小学生': (ctx) => {
    // TODO: 实现对手查看己方手牌时可选择隐藏其中1张的功能
    console.log('迷路小学生：手牌查看时隐藏1张');
  },

  // 菲伦技能
  '菲伦_魔法修行': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看己方牌库顶4张牌，选择一张奇幻类加入手牌的功能
    playerStore.drawCards(ctx.playerId, 1); // 简化为直接抽1张
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 魔法修行：精选奇幻卡牌。`, 'info');
  },

  '菲伦_师父照顾': (ctx) => {
    // TODO: 实现己方奇幻类卡牌连续打出时第2张起成本-1的功能
    if (ctx.card?.synergy_tags?.includes('奇幻')) {
      console.log('师父照顾：奇幻连击降低成本');
    }
  },

  // 樱岛麻衣技能
  '樱岛麻衣_存在感操作': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现本回合己方打出的校园类卡牌无法被对手的技能指定的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 存在感操作：校园卡牌获得技能保护。`, 'info');
    gameStore.addNotification('存在感操作：校园卡牌技能免疫', 'info');
  },

  '樱岛麻衣_前偶像': (ctx) => {
    // TODO: 实现己方校园类卡牌与恋爱类卡牌可互相触发对方的被动效果的功能
    if (ctx.card?.synergy_tags?.includes('校园') || ctx.card?.synergy_tags?.includes('恋爱')) {
      console.log('前偶像：校园恋爱卡牌互相触发');
    }
  },

  // 赫萝技能
  '赫萝_商业智慧': async (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    const interactionSystem = InteractionSystem.getInstance();
    const persistentSystem = PersistentEffectSystem.getInstance();
    
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

  '赫萝_丰收之神': (ctx) => {
    // TODO: 实现己方每打出3张不同类型的卡牌后抽1张牌的功能
    if (ctx.event === 'onPlay') {
      // 简化检测：每次打出卡牌时有33%几率抽牌
      if (Math.random() < 0.33) {
        const playerStore = usePlayerStore();
        const historyStore = useHistoryStore();
        
        playerStore.drawCards(ctx.playerId, 1);
        const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
        historyStore.addLog(`${name} 的丰收之神：多样化出牌，抽1张牌。`, 'info');
      }
    }
  },

  // 藤林杏技能
  '藤林杏_不良委员长': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现本回合校园类卡牌+2强度，若使用"辛辣点评"则额外+1强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现不良委员长：校园卡牌+2强度。`, 'info');
  },

  '藤林杏_外硬内软': (ctx) => {
    // TODO: 实现己方声望受损时下次校园类卡牌成本-1的功能
    const playerStore = usePlayerStore();
    if (playerStore[ctx.playerId].reputation < 30) { // 简化检测
      console.log('外硬内软：声望受损，校园卡牌成本-1');
    }
  },

  // 珂朵莉技能
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
        console.log('牺牲觉悟：危机状态，卡牌强度+2');
      }
    }
  },

  // 史派克技能
  '史派克_斯皮格尔_截拳道': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现本回合战斗类卡牌+2强度，并在击败对手时获得2TP的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 施展截拳道：战斗卡牌+2强度。`, 'info');
  },

  '史派克_斯皮格尔_赏金猎人': (ctx) => {
    // TODO: 实现己方造成对手声望损失时有40%几率获得1TP的功能
    if (Math.random() < 0.4) {
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      playerStore.changeTp(ctx.playerId, 1);
      const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 的赏金猎人：造成损失获得1TP。`, 'info');
    }
  },

  // 安原绘麻技能
  '安原绘麻_原画创作': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现将己方一张手牌的类型改变为任意类型直到打出为止的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 原画创作：改变手牌类型。`, 'info');
  },

  '安原绘麻_内向专注': (ctx) => {
    if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
      const playerStore = usePlayerStore();
      if (playerStore[ctx.playerId].hand.length >= 7) {
        ctx.addStrengthBonus(ctx.role, 1);
        console.log('内向专注：手牌充足，卡牌强度+1');
      }
    }
  },

  // 妮亚技能
  '妮亚_天真好奇': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    // TODO: 实现查看对手3张手牌，每种不同类型令己方抽1张牌的功能
    playerStore.drawCards(ctx.playerId, 2); // 简化为抽2张
    
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 天真好奇：侦查多样性，抽2张牌。`, 'info');
  },

  '妮亚_螺旋公主': (ctx) => {
    if (ctx.event === 'afterResolve') {
      const gameStore = useGameStore();
      // TODO: 实现己方议题偏向变化时额外+1（朝己方有利方向）的功能
      const delta = ctx.playerId === 'playerA' ? 1 : -1;
      gameStore.updateTopicBias(delta);
      console.log('螺旋公主：议题偏向额外+1');
    }
  },

  // 安和昴技能
  '安和昴_偶像魅力': (ctx) => {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    // TODO: 实现对手下回合必须选择"友好安利"，己方校园类卡牌本回合+1强度的功能
    const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name} 展现偶像魅力：强制友好安利，校园卡牌+1强度。`, 'info');
    gameStore.addNotification('偶像魅力：强制友好安利', 'info');
  },

  '安和昴_世渡_上手': (ctx) => {
    if (ctx.event === 'onPlay') {
      const gameStore = useGameStore();
      const playerStore = usePlayerStore();
      const historyStore = useHistoryStore();
      
      const bias = ctx.playerId === 'playerA' ? gameStore.topicBias : -gameStore.topicBias;
      if (bias > 0) {
        playerStore.changeTp(ctx.playerId, 1);
        const name = ctx.playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
        historyStore.addLog(`${name} 世渡り上手：议题优势，获得1TP。`, 'info');
      }
    }
  },
};

export async function runEffect(effectId: string, ctx: EffectContext) {
  const fn = handlers[effectId];
  if (!fn) {
    console.warn(`Effect handler not found: ${effectId}`);
    return;
  }
  try {
    await fn(ctx);
  } catch (e) {
    console.error(`Effect handler error: ${effectId}`, e);
  }
}


