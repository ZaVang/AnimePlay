<template>
  <div
    v-if="isVisible"
    @click="onBackgroundClick"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
  >
    <div
      @click.stop
      class="bg-white rounded-lg shadow-xl max-w-md w-full text-gray-800 mx-4"
    >
      <!-- Header -->
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-xl font-bold">{{ title }}</h2>
        <p v-if="description" class="text-gray-600 mt-2 text-sm">{{ description }}</p>
      </div>

      <!-- Type Options -->
      <div class="p-6">
        <div class="space-y-3">
          <button
            v-for="type in availableTypes"
            :key="type"
            @click="selectType(type)"
            :class="[
              'w-full p-4 text-left rounded-lg border-2 transition-all duration-200',
              selectedType === type
                ? 'border-blue-500 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ type }}</span>
              <span v-if="selectedType === type" class="text-blue-500">✓</span>
            </div>
            <p v-if="getTypeDescription(type)" class="text-sm text-gray-600 mt-1">
              {{ getTypeDescription(type) }}
            </p>
          </button>
        </div>

        <div v-if="availableTypes.length === 0" class="text-center py-8">
          <p class="text-gray-500">没有可选择的类型</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 p-6 flex justify-between items-center">
        <button
          v-if="allowCancel"
          @click="cancel"
          class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          取消
        </button>
        <button
          @click="confirm"
          :disabled="!selectedType"
          :class="[
            'px-6 py-2 rounded-lg font-medium',
            selectedType
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          ]"
        >
          确认选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  isVisible: boolean;
  availableTypes: string[];
  title: string;
  description?: string;
  allowCancel?: boolean;
  typeDescriptions?: Record<string, string>;
}

const props = withDefaults(defineProps<Props>(), {
  allowCancel: true,
  typeDescriptions: () => ({})
});

const emit = defineEmits<{
  select: [type: string];
  cancel: [];
  close: [];
}>();

const selectedType = ref<string | null>(null);

const defaultTypeDescriptions: Record<string, string> = {
  '科幻': '充满未来感的作品',
  '战斗': '激烈的对决和冒险',
  '恋爱': '浪漫的情感故事',
  '日常': '平凡生活中的温馨时光',
  '校园': '青春洋溢的校园生活',
  '音乐': '动听旋律的音乐作品',
  '奇幻': '充满魔法和奇迹的世界',
  '运动': '汗水与拼搏的竞技精神'
};

function getTypeDescription(type: string): string {
  return props.typeDescriptions[type] || defaultTypeDescriptions[type] || '';
}

function selectType(type: string) {
  selectedType.value = type;
}

function confirm() {
  if (selectedType.value) {
    emit('select', selectedType.value);
    selectedType.value = null;
    emit('close');
  }
}

function cancel() {
  selectedType.value = null;
  emit('cancel');
  emit('close');
}

function onBackgroundClick() {
  if (props.allowCancel) {
    cancel();
  }
}

// 监听可见性变化，重置选择
watch(() => props.isVisible, (visible) => {
  if (!visible) {
    selectedType.value = null;
  }
});
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>