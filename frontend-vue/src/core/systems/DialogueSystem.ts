/**
 * 辩论式对话系统 - 管理战斗中的对话内容和视觉效果
 */
export interface DialogueAction {
  id: string;
  playerId: 'playerA' | 'playerB';
  type: 'speech' | 'action' | 'reaction';
  content: string;
  actionType?: 'objection' | 'counterattack' | 'agreement' | 'dismissal';
  duration?: number;
  timestamp: number;
}

export interface SpeechPattern {
  attack: {
    friendly: string[];
    harsh: string[];
  };
  defense: {
    agree: string[];
    disagree: string[];
  };
  special: {
    objection: string[];
    counterattack: string[];
    victory: string[];
    defeat: string[];
  };
}

export class DialogueSystem {
  private static instance: DialogueSystem;
  private dialogueQueue: DialogueAction[] = [];
  private currentDialogue: DialogueAction | null = null;
  private listeners: ((action: DialogueAction) => void)[] = [];

  static getInstance(): DialogueSystem {
    if (!DialogueSystem.instance) {
      DialogueSystem.instance = new DialogueSystem();
    }
    return DialogueSystem.instance;
  }

  // 辩论用语库 - 更丰富的对话内容
  private speechPatterns: SpeechPattern = {
    attack: {
      friendly: [
        "这部作品真的很棒，你应该试试看！",
        "我觉得这个故事会打动你的！",
        "相信我，这绝对值得一看！",
        "这部作品的深度真的很令人惊喜！",
        "我强烈推荐这个，质量很高！"
      ],
      harsh: [
        "你根本没看过这个作品吧？",
        "这种水平的作品你都不认识？",
        "你的品味需要提升一下了！",
        "这明显是经典，你居然不知道？",
        "看来你对这个类型还不够了解啊！"
      ]
    },
    defense: {
      agree: [
        "太有共鸣了！我也是这么想的！",
        "确实，我想多了...",
        "你说得对，惭愧...",
        "这个观点很有道理！",
        "我被你说服了！"
      ],
      disagree: [
        "你这是恶意黑！",
        "XX才是真正的神作！",
        "我看的那个更好！",
        "但是XX更符合我口味！",
        "我更喜欢XX类型的！",
        "这个评价太偏激了吧？"
      ]
    },
    special: {
      objection: [
        "异议！",
        "等等！",
        "住手！",
        "不对！",
        "慢着！"
      ],
      counterattack: [
        "降维打击！",
        "反击成功！",
        "你的论点站不住脚！",
        "这就是实力差距！",
        "让我来教教你什么叫品味！"
      ],
      victory: [
        "看来我的安利成功了！",
        "这就是经典的魅力！",
        "终于理解了吧！",
        "这才是真正的好作品！"
      ],
      defeat: [
        "唔...确实有道理...",
        "你的观点让我重新思考...",
        "这个角度我没想到...",
        "看来我还需要学习..."
      ]
    }
  };

  /**
   * 生成攻击时的对话
   */
  generateAttackDialogue(style: '友好安利' | '辛辣点评', cardName: string): string {
    const patterns = style === '友好安利' 
      ? this.speechPatterns.attack.friendly
      : this.speechPatterns.attack.harsh;
    
    const baseDialogue = patterns[Math.floor(Math.random() * patterns.length)];
    
    // 有时候会提到具体的作品名
    if (Math.random() < 0.3) {
      return baseDialogue.replace(/这部作品|这个|XX/g, `《${cardName}》`);
    }
    
    return baseDialogue;
  }

  /**
   * 生成防御时的对话
   */
  generateDefenseDialogue(response: '赞同' | '反驳', attackCard: string, defenseCard?: string): string {
    const patterns = response === '赞同' 
      ? this.speechPatterns.defense.agree
      : this.speechPatterns.defense.disagree;
    
    const baseDialogue = patterns[Math.floor(Math.random() * patterns.length)];
    
    if (defenseCard && baseDialogue.includes('XX')) {
      return baseDialogue.replace(/XX/g, `《${defenseCard}》`);
    }
    
    return baseDialogue;
  }

  /**
   * 生成特殊动作对话
   */
  generateActionDialogue(actionType: 'objection' | 'counterattack' | 'victory' | 'defeat'): string {
    const patterns = this.speechPatterns.special[actionType];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  /**
   * 添加对话到队列
   */
  addDialogue(playerId: 'playerA' | 'playerB', content: string, type: DialogueAction['type'] = 'speech', actionType?: DialogueAction['actionType']) {
    const action: DialogueAction = {
      id: `dialogue_${Date.now()}_${Math.random()}`,
      playerId,
      type,
      content,
      actionType,
      duration: type === 'action' ? 2000 : 3000,
      timestamp: Date.now()
    };

    this.dialogueQueue.push(action);
    this.processQueue();
  }

  /**
   * 处理对话队列
   */
  private processQueue() {
    if (this.currentDialogue || this.dialogueQueue.length === 0) {
      return;
    }

    const nextAction = this.dialogueQueue.shift()!;
    this.currentDialogue = nextAction;

    // 通知监听器
    this.listeners.forEach(listener => listener(nextAction));

    // 自动清理当前对话
    setTimeout(() => {
      this.currentDialogue = null;
      this.processQueue();
    }, nextAction.duration || 3000);
  }

  /**
   * 注册对话监听器
   */
  onDialogue(listener: (action: DialogueAction) => void) {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   */
  removeListener(listener: (action: DialogueAction) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 清空对话队列
   */
  clearQueue() {
    this.dialogueQueue = [];
    this.currentDialogue = null;
  }

  /**
   * 获取当前对话
   */
  getCurrentDialogue(): DialogueAction | null {
    return this.currentDialogue;
  }
}