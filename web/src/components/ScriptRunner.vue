<template>
  <div class="script-runner">
    <h2 class="script-title">{{ script.name }}</h2>
    <p class="script-description">{{ script.description }}</p>

    <form @submit.prevent="executeScript">
      <div v-for="param in script.params" :key="param.name" class="form-group">
        <label :class="['form-label', { 'form-label-required': param.required }]">
          {{ param.name }}
        </label>

        <input
          v-if="param.type === 'string' || param.type === 'number'"
          v-model="formData[param.name]"
          :type="param.type === 'number' ? 'number' : 'text'"
          :required="param.required"
          class="form-input"
          :placeholder="param.description"
        />

        <select
          v-else-if="param.type === 'select'"
          v-model="formData[param.name]"
          :required="param.required"
          class="form-select"
        >
          <option value="">Select {{ param.name }}</option>
          <option v-for="option in param.options" :key="option" :value="option">
            {{ option }}
          </option>
        </select>

        <label v-else-if="param.type === 'boolean'" style="display: flex; align-items: center; cursor: pointer;">
          <input
            v-model="formData[param.name]"
            type="checkbox"
            class="form-checkbox"
          />
          <span style="margin-left: 0.5rem;">{{ param.description }}</span>
        </label>

        <span v-if="param.description && param.type !== 'boolean'" class="form-help">
          {{ param.description }}
        </span>
      </div>

      <div style="display: flex; align-items: center;">
        <button type="submit" :disabled="isRunning" class="btn btn-primary">
          <span v-if="isRunning" style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="loading"></span>
            Running...
          </span>
          <span v-else>Run Script</span>
        </button>

        <button
          v-if="isRunning"
          type="button"
          @click="stopScript"
          class="btn btn-danger"
        >
          Stop
        </button>
      </div>
    </form>
    <ScriptTerminal :output="output" ref="outputRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue';
import ScriptTerminal from './ScriptTerminal.vue';

const props = defineProps<{
    script: {
        name: string;
        description: string;
        fileName: string;
        params: Array<{
            name: string;
            type: 'string' | 'number' | 'boolean' | 'select';
            description?: string;
            required?: boolean;
            default?: any;
            options?: string[];
        }>;
    };
}>();

const formData = reactive<Record<string, any>>({});
const output = ref<string[]>([]);
const isRunning = ref(false);
const outputRef = ref<HTMLElement | null>(null);

// Initialize form data with defaults
for (const param of props.script.params) {
  if (param.type === 'boolean') {
    formData[param.name] = param.default || false;
  } else {
    formData[param.name] = param.default || '';
  }
}

async function executeScript() {
  if (isRunning.value) return;

  isRunning.value = true;
  output.value = [];

  try {

    // Create SSE connection
    const response = await fetch(`/api/execute/${props.script.fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        params: formData
      })
    });

    if (!response.ok) {
      const error = await response.json();
      output.value.push(`[Error] ${error.error || 'Failed to execute script'}`);
      isRunning.value = false;
      return;
    }

    // Read SSE stream
    if(response.body === null) {
      output.value.push('[Error] No response body');
      isRunning.value = false;
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.output) {
            output.value.push(data.output);
            await scrollToBottom();
          }

          if (data.done) {
            isRunning.value = false;
          }

          if (data.error) {
            output.value.push(`[Error] ${data.error}`);
            isRunning.value = false;
          }
        }
      }
    }
  } catch (error: any) {
    output.value.push(`[Error] ${error.message}`);
    isRunning.value = false;
  }
}

function stopScript() {
  isRunning.value = false;
  output.value.push('\n[Script stopped by user]');
}
async function scrollToBottom() {
  await nextTick();
  if (outputRef.value) {
    outputRef.value.scrollTop = outputRef.value.scrollHeight;
  }
}
</script>
