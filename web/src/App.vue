<template>
  <div class="container">
    <header class="header">
      <h1>Dev Utils</h1>
      <p>Web-based script runner for developer utilities</p>
    </header>

    <div v-if="loading" style="text-align: center; padding: 4rem;">
      <div class="loading" style="width: 3rem; height: 3rem;"></div>
      <p style="margin-top: 1rem; color: #64748b;">Loading scripts...</p>
    </div>

    <div v-else-if="error" style="text-align: center; padding: 4rem;">
      <p style="color: #ef4444; margin-bottom: 1rem;">{{ error }}</p>
      <button @click="loadScripts" class="btn btn-primary">Retry</button>
    </div>

    <div v-else class="scripts-container">
      <aside class="scripts-list">
        <div v-for="(scripts, category) in scriptsByCategory" :key="category" class="category">
          <h3 class="category-title">{{ category }}</h3>
          <div
            v-for="script in scripts"
            :key="script.fileName"
            @click="selectScript(script)"
            :class="['script-card', { active: selectedScript?.fileName === script.fileName }]"
          >
            <div class="script-card-name">{{ script.name }}</div>
            <div class="script-card-description">{{ script.description }}</div>
            <span class="script-card-context">{{ script.context }}</span>
          </div>
        </div>
      </aside>

      <main>
        <ScriptRunner
          v-if="selectedScript"
          :script="selectedScript"
          :key="selectedScript.fileName"
        />
        <div v-else class="script-runner-empty">
          <p>Select a script from the list to get started</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ScriptRunner from './components/ScriptRunner.vue';

const scripts = ref([]);
const selectedScript = ref(null);
const loading = ref(true);
const error = ref(null);

const scriptsByCategory = computed(() => {
  const grouped = {};
  for (const script of scripts.value) {
    if (!grouped[script.category]) {
      grouped[script.category] = [];
    }
    grouped[script.category].push(script);
  }
  return grouped;
});

async function loadScripts() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/scripts');
    if (!response.ok) throw new Error('Failed to load scripts');
    scripts.value = await response.json();
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function selectScript(script) {
  selectedScript.value = script;
}

onMounted(() => {
  loadScripts();
});
</script>
