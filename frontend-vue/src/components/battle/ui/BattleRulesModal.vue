<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits(['close']);

const battleConfig = computed(() => GAME_CONFIG.battle);

const actionStyles = computed(() => [
  { key: 'friendly', ...battleConfig.value.actions.friendly, description: '温和推荐 // 消耗 0 TP // 低强度干预' },
  { key: 'harsh', ...battleConfig.value.actions.harsh, description: '辛辣点评 // 消耗 1 TP // 高强度负反馈' },
  { key: 'agree', ...battleConfig.value.actions.agree, description: '语义赞同 // 消耗 0 TP // 共鸣同步' },
  { key: 'disagree', ...battleConfig.value.actions.disagree, description: '逻辑反驳 // 消耗 1 TP // 认知阻断' }
]);

const battleMechanics = computed(() => [
  {
    title: 'TERMINATION_OBJ',
    content: '对方声望归零 / 议题偏向度达临界值 (±10)'
  },
  {
    title: 'INIT_SEQUENCE',
    content: 'HP: 30 // TP_CAP: 2 // HAND: 5'
  },
  {
    title: 'ENERGY_RELOAD',
    content: '每回合 TP 上限 +1 (MAX: 10) // 动态同步恢复'
  },
  {
    title: 'DATA_UPLINK',
    content: '每回合循环抽取 1 枚数据模块 (无手牌上限)'
  },
  {
    title: 'BIAS_VECTOR',
    content: '范围 [-10, +10] // 正值表征玩家主导权，负值表征 AI 干扰强度'
  },
  {
    title: 'CLOCK_LIMIT',
    content: '12 回合强制结算 // 逾期将按剩余 HP 百分比决定优劣'
  }
]);

const battleResults = computed(() => [
  {
    situation: 'CORE_LOGIC: 强度结算',
    outcomes: [
      '结果 = 攻击侧强度 - 防御侧强度',
      'DIFF >= 5: 压制 | 1-4: 优胜 | 0: 对冲 | <0: 反嗜'
    ]
  },
  {
    situation: 'PROTOCOL: 友好安利 (0 TP)',
    outcomes: [
      'VS 赞同: 低能耗交互，根据强度差线性调整议题',
      'VS 反驳: 动态博弈，防御方承担高额风险溢出'
    ]
  },
  {
    situation: 'PROTOCOL: 辛辣点评 (1 TP)',
    outcomes: [
      'VS 赞同: 认知妥协，议题偏向度受攻击方主导',
      'VS 反驳: 全面交锋，极端结果产出概率提升'
    ]
  }
]);
</script>

<template>
  <div v-if="show" @click.self="emit('close')" class="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 transition-all duration-500">
    <GlassPanel class="max-w-5xl w-full border-gold/20 shadow-4xl quantic-reveal h-[85vh] flex flex-col">
      <template #header>
        <div class="flex justify-between items-center mb-8">
          <div class="space-y-1">
             <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70 italic font-black">Tactical Protocol Registry</div>
             <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">宅理论战 // 战斗规则详解</h2>
          </div>
          <TacticalButton variant="ghost" size="sm" @click="emit('close')">ABORT_READOUT</TacticalButton>
        </div>
      </template>

      <div class="flex-1 overflow-y-auto pr-6 -mr-6 scrollbar-none space-y-10">
        <!-- 01 // 系统逻辑 -->
        <section class="space-y-6">
           <div class="flex items-center gap-4">
              <div class="text-2xl font-display font-black text-gold/20">01</div>
              <h3 class="text-xs font-display font-bold text-gold tracking-[0.3em] uppercase opacity-80 decoration-gold/30 underline-offset-8 underline">System Logic // 基础规则</h3>
           </div>
           <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div v-for="rule in battleMechanics" :key="rule.title" 
                   class="bg-white/[0.02] border border-white/5 p-4 group hover:bg-white/[0.04] transition-all">
                <h4 class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-2 group-hover:text-gold transition-colors">{{ rule.title }}</h4>
                <p class="text-[11px] text-industrial-100 font-mono leading-relaxed opacity-80">{{ rule.content }}</p>
              </div>
           </div>
        </section>

        <!-- 02 // 协议映射 -->
        <section class="space-y-6">
           <div class="flex items-center gap-4">
              <div class="text-2xl font-display font-black text-gold/20">02</div>
              <h3 class="text-xs font-display font-bold text-gold tracking-[0.3em] uppercase opacity-80 decoration-gold/30 underline-offset-8 underline">Protocol Map // 行动类型</h3>
           </div>
           <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div v-for="action in actionStyles" :key="action.key" 
                   class="bg-white/[0.03] border border-white/5 p-4 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-2 opacity-10">
                   <div class="text-2xl font-black">{{ action.cost > 0 ? '⚡' : '◈' }}</div>
                </div>
                <h4 class="text-xs font-display font-black text-white uppercase mb-2 group-hover:text-gold transition-colors">{{ action.name }}</h4>
                <div class="text-[9px] font-mono text-industrial-400 mb-2 uppercase">{{ action.cost > 0 ? `+${action.cost} TP CONSUMPTION` : 'ZERO_COST_UPLINK' }}</div>
                <p class="text-[10px] text-industrial-300 font-ui italic leading-tight">{{ action.description }}</p>
              </div>
           </div>
        </section>

        <!-- 03 // 结算矩阵 -->
        <section class="space-y-6">
           <div class="flex items-center gap-4">
              <div class="text-2xl font-display font-black text-gold/20">03</div>
              <h3 class="text-xs font-display font-bold text-gold tracking-[0.3em] uppercase opacity-80 decoration-gold/30 underline-offset-8 underline">Settlement Matrix // 结算矩阵</h3>
           </div>
           <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div v-for="result in battleResults" :key="result.situation" 
                   class="bg-black/40 border border-gold/10 relative">
                <div class="bg-gold/5 px-4 py-2 border-b border-gold/10">
                   <h4 class="text-[9px] font-display font-bold text-gold uppercase tracking-widest">{{ result.situation }}</h4>
                </div>
                <div class="p-4 space-y-3">
                   <div v-for="outcome in result.outcomes" :key="outcome" 
                        class="text-[10px] text-industrial-200 font-mono pl-4 border-l-2 border-gold/30 py-1 flex items-start gap-2">
                        <span class="text-gold/40 mt-0.5">»</span>
                        <span>{{ outcome }}</span>
                   </div>
                </div>
              </div>
           </div>
        </section>

        <!-- 04 // 建议规约 -->
        <section class="space-y-6 pb-10">
           <div class="flex items-center gap-4">
              <div class="text-2xl font-display font-black text-gold/20">04</div>
              <h3 class="text-xs font-display font-bold text-gold tracking-[0.3em] uppercase opacity-80 decoration-gold/30 underline-offset-8 underline">Tactical Advisory // 执行预案</h3>
           </div>
           <div class="bg-gold/[0.03] border border-gold/10 p-6 flex flex-col md:flex-row gap-8">
              <div class="flex-1 space-y-4">
                 <div class="flex items-start gap-4">
                    <div class="w-1 h-1 bg-gold rounded-full mt-1.5 flex-shrink-0 animate-pulse"></div>
                    <div>
                       <div class="text-[10px] font-display font-black text-white uppercase mb-1">UNIT_STRENGTH // 强度基准</div>
                       <div class="text-xs text-industrial-400">卡牌点数决定核心强度，角色技能可叠加强度阈值。</div>
                    </div>
                 </div>
                 <div class="flex items-start gap-4">
                    <div class="w-1 h-1 bg-gold rounded-full mt-1.5 flex-shrink-0 animate-pulse"></div>
                    <div>
                       <div class="text-[10px] font-display font-black text-white uppercase mb-1">TP_MANAGEMENT // 能量调度</div>
                       <div class="text-xs text-industrial-400">在高价值博弈点使用“辛辣点评”或“反驳”，通过能耗溢出压制对手。</div>
                    </div>
                 </div>
              </div>
              <div class="flex-1 space-y-4">
                 <div class="flex items-start gap-4">
                    <div class="w-1 h-1 bg-gold rounded-full mt-1.5 flex-shrink-0 animate-pulse"></div>
                    <div>
                       <div class="text-[10px] font-display font-black text-white uppercase mb-1">BIAS_CONTROL // 议题主导</div>
                       <div class="text-xs text-industrial-400">维持议题偏向度处于正向区间，临界值 10 即可立即终结对比。</div>
                    </div>
                 </div>
                 <div class="flex items-start gap-4">
                    <div class="w-1 h-1 bg-gold rounded-full mt-1.5 flex-shrink-0 animate-pulse"></div>
                    <div>
                       <div class="text-[10px] font-display font-black text-white uppercase mb-1">DEFENSE_STRATEGY // 防御逻辑</div>
                       <div class="text-xs text-industrial-400">“赞同”保证低损耗，“反驳”具备扭转因果的潜力。</div>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </div>

      <template #footer>
        <div class="flex items-center justify-center mt-8 pt-8 border-t border-white/5">
           <TacticalButton variant="primary" size="lg" @click="emit('close')">INITIATE_TACTICAL_UPLINK // 开始论战</TacticalButton>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

.shadow-4xl {
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 165, 116, 0.1);
}
</style>