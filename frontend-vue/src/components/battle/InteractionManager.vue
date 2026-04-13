<template>
  <div>
    <!-- Hand View Modal -->
    <HandViewModal
      :is-visible="handViewState.visible"
      :cards="handViewState.cards"
      :title="handViewState.title"
      :subtitle="handViewState.subtitle"
      :empty-message="handViewState.emptyMessage"
      :show-types="handViewState.showTypes"
      @close="closeHandView"
    />

    <!-- Card Selection Modal -->
    <CardSelectionModal
      :is-visible="cardSelectionState.visible"
      :cards="cardSelectionState.cards"
      :options="cardSelectionState.options"
      @select="onCardSelection"
      @cancel="onCardSelectionCancel"
      @close="closeCardSelection"
    />

    <!-- Type Selection Modal -->
    <TypeSelectionModal
      :is-visible="typeSelectionState.visible"
      :available-types="typeSelectionState.availableTypes"
      :title="typeSelectionState.title"
      :description="typeSelectionState.description"
      :allow-cancel="typeSelectionState.allowCancel"
      :type-descriptions="typeSelectionState.typeDescriptions"
      @select="onTypeSelection"
      @cancel="onTypeSelectionCancel"
      @close="closeTypeSelection"
    />

    <!-- Confirmation Dialog: Refactored to ATL Standard -->
    <div
      v-if="confirmationState.visible"
      @click.self="onConfirmationBackgroundClick"
      class="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 transition-all duration-500"
    >
      <GlassPanel
        class="max-w-md w-full border-white/10 shadow-3xl quantic-reveal"
      >
        <template #header>
           <div class="mb-4">
              <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70 mb-1">Confirmation_Protocol</div>
              <h2 class="text-xl font-display font-black text-white uppercase tracking-tighter">{{ confirmationState.title || 'REQUIRED_CONFIRMATION' }}</h2>
           </div>
        </template>

        <div class="py-4">
           <p class="text-xs text-industrial-200 leading-relaxed font-ui italic opacity-80 border-l border-gold/40 pl-4">
             {{ confirmationState.message }}
           </p>
        </div>

        <template #footer>
          <div class="flex justify-end gap-4 mt-8 pt-6 border-t border-white/5">
            <TacticalButton
              variant="ghost"
              size="md"
              @click="onConfirmationCancel"
            >
              ABORT
            </TacticalButton>
            <TacticalButton
              variant="primary"
              size="lg"
              @click="onConfirmationConfirm"
            >
              CONFIRM_EXECUTION
            </TacticalButton>
          </div>
        </template>
      </GlassPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import type { AnimeCard } from '@/types/card';
import type { CardSelectionOptions } from '@/core/systems/InteractionSystem';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

import HandViewModal from './HandViewModal.vue';
import CardSelectionModal from './CardSelectionModal.vue';
import TypeSelectionModal from './TypeSelectionModal.vue';

// Hand View State
const handViewState = reactive({
  visible: false,
  cards: [] as AnimeCard[],
  title: '',
  subtitle: '',
  emptyMessage: '',
  showTypes: false,
  resolve: null as (() => void) | null
});

// Card Selection State
const cardSelectionState = reactive({
  visible: false,
  cards: [] as AnimeCard[],
  options: {} as CardSelectionOptions,
  resolve: null as ((result: { selected: AnimeCard[], cancelled: boolean }) => void) | null
});

// Type Selection State
const typeSelectionState = reactive({
  visible: false,
  availableTypes: [] as string[],
  title: '',
  description: '',
  allowCancel: true,
  typeDescriptions: {} as Record<string, string>,
  resolve: null as ((result: string | null) => void) | null
});

// Confirmation Dialog State
const confirmationState = reactive({
  visible: false,
  title: '',
  message: '',
  resolve: null as ((result: boolean) => void) | null
});

/**
 * Show hand view modal
 */
function showHandView(
  cards: AnimeCard[], 
  title: string, 
  subtitle?: string, 
  emptyMessage?: string,
  showTypes?: boolean
): Promise<void> {
  handViewState.visible = true;
  handViewState.cards = cards;
  handViewState.title = title;
  handViewState.subtitle = subtitle || '';
  handViewState.emptyMessage = emptyMessage || '';
  handViewState.showTypes = showTypes || false;
  
  return new Promise((resolve) => {
    const closeHandler = () => {
      resolve();
    };
    handViewState.resolve = closeHandler;
  });
}

function closeHandView() {
  handViewState.visible = false;
  handViewState.cards = [];
  if (handViewState.resolve) {
    handViewState.resolve();
    handViewState.resolve = null;
  }
}

/**
 * Show card selection modal
 */
function showCardSelection(
  cards: AnimeCard[], 
  options: CardSelectionOptions
): Promise<{ selected: AnimeCard[], cancelled: boolean }> {
  cardSelectionState.visible = true;
  cardSelectionState.cards = cards;
  cardSelectionState.options = options;
  
  return new Promise((resolve) => {
    cardSelectionState.resolve = resolve;
  });
}

function onCardSelection(selected: AnimeCard[]) {
  if (cardSelectionState.resolve) {
    cardSelectionState.resolve({ selected, cancelled: false });
    cardSelectionState.resolve = null;
  }
}

function onCardSelectionCancel() {
  if (cardSelectionState.resolve) {
    cardSelectionState.resolve({ selected: [], cancelled: true });
    cardSelectionState.resolve = null;
  }
}

function closeCardSelection() {
  cardSelectionState.visible = false;
  cardSelectionState.cards = [];
}

/**
 * Show type selection modal
 */
function showTypeSelection(
  availableTypes: string[],
  title: string,
  description?: string,
  allowCancel: boolean = true,
  typeDescriptions?: Record<string, string>
): Promise<string | null> {
  typeSelectionState.visible = true;
  typeSelectionState.availableTypes = availableTypes;
  typeSelectionState.title = title;
  typeSelectionState.description = description || '';
  typeSelectionState.allowCancel = allowCancel;
  typeSelectionState.typeDescriptions = typeDescriptions || {};
  
  return new Promise((resolve) => {
    typeSelectionState.resolve = resolve;
  });
}

function onTypeSelection(type: string) {
  if (typeSelectionState.resolve) {
    typeSelectionState.resolve(type);
    typeSelectionState.resolve = null;
  }
}

function onTypeSelectionCancel() {
  if (typeSelectionState.resolve) {
    typeSelectionState.resolve(null);
    typeSelectionState.resolve = null;
  }
}

function closeTypeSelection() {
  typeSelectionState.visible = false;
  typeSelectionState.availableTypes = [];
}

/**
 * Show confirmation dialog
 */
function showConfirmation(message: string, title?: string): Promise<boolean> {
  confirmationState.visible = true;
  confirmationState.message = message;
  confirmationState.title = title || 'REQ_CONFIRM';
  
  return new Promise((resolve) => {
    confirmationState.resolve = resolve;
  });
}

function onConfirmationConfirm() {
  if (confirmationState.resolve) {
    confirmationState.resolve(true);
    confirmationState.resolve = null;
  }
  confirmationState.visible = false;
}

function onConfirmationCancel() {
  if (confirmationState.resolve) {
    confirmationState.resolve(false);
    confirmationState.resolve = null;
  }
  confirmationState.visible = false;
}

function onConfirmationBackgroundClick() {
  onConfirmationCancel();
}

// Expose methods for external use
defineExpose({
  showHandView,
  showCardSelection,
  showTypeSelection,
  showConfirmation
});
</script>

<style scoped>
.shadow-3xl {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.9);
}
</style>