<template>
    <div class="output-terminal">
        <div class="output-header">
        <span>Output</span>
      </div>
      <div class="output-content" ref="outputRef">
        <div v-for="(line, index) in output" :key="index" v-html="ansiToHtml(line)">
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'


const props = defineProps<{
    output: string[];
}>();


const ansiToHtml = (text: string) => {
  // Map ANSI codes to CSS styles
  const ansiMap: Record<string, string> = {
    '1': 'font-weight: bold;',
    '4': 'text-decoration: underline;',
    '30': 'color: black;',
    '31': 'color: red;',
    '32': 'color: green;',
    '33': 'color: yellow;',
    '34': 'color: blue;',
    '35': 'color: magenta;',
    '36': 'color: cyan;',
    '37': 'color: white;',
    '90': 'color: gray;',
    '0': '</span>', // reset
  };

  // Replace ANSI codes with HTML
  return text.replace(/\x1b\[(\d+)m/g, (_, code) => {
    if (code === '0') return '</span>';
    const style = ansiMap[code];
    return style ? `<span style="${style}">` : '';
  });
};
</script>

<style scoped>

</style>
