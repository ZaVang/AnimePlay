<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps<{
  text: string;
  speed?: number;
  delay?: number;
}>();

const displayText = ref('');
const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+<>?:{}';

const decode = async () => {
  const targetText = props.text;
  const length = targetText.length;
  let iterations = 0;
  
  const interval = setInterval(() => {
    displayText.value = targetText
      .split('')
      .map((char, index) => {
        if (index < iterations) {
          return targetText[index];
        }
        return characters[Math.floor(Math.random() * characters.length)];
      })
      .join('');

    if (iterations >= length) {
      clearInterval(interval);
    }

    iterations += 1 / (props.speed || 3);
  }, 30);
};

onMounted(() => {
    setTimeout(decode, props.delay || 0);
});

watch(() => props.text, () => {
  decode();
});
</script>

<template>
  <span class="lore-decoder font-mono">
    {{ displayText }}
  </span>
</template>

<style scoped>
.lore-decoder {
  display: inline-block;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--color-text-secondary);
  text-shadow: 0 0 5px rgba(212, 165, 116, 0.3);
}
</style>
