<template>
  <div id="app-root">
    <TopBar 
      :status-text="statusText"
      :status-class="statusClass"
      :group-info="groupInfo"
      :ws-connected="vpsWebSocket.connected.value"
      :last-price="vpsWebSocket.lastPrice.value"
      @show-rule-detail="chartView?.showValidation()"
      @layer-change="handleLayerChange"
      @toggle-realtime="toggleRealtime"
    />
    <LeftBar 
      :is-selecting-start="chartView?.wavesPoints?.isSelecting?.value"
      :is-selecting-stop="chartView?.wavesStop?.isSelecting?.value"
      :is-locked="chartView?.wavesLock?.isLocked?.value"
      @start-point="chartView?.startPointSelection()"
      @stop-point="chartView?.stopPointSelection()"
      @lock-a-b-c="chartView?.lockABCSelection()"
      @show-validation="chartView?.showValidation()"
      @refresh="chartView?.refresh()"
      @reset="chartView?.reset()"
      @import="handleImport"
      @auto-s-p-change="handleAutoSPChange"
    />
    <main class="main-content">
      <ChartView ref="chartView" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useVpsWebSocket } from '@/composables/useVpsWebSocket';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import TopBar from '@/components/TopBar.vue';
import LeftBar from '@/components/LeftBar.vue';
import ChartView from '@/views/ChartView.vue';

const vpsWebSocket = useVpsWebSocket();
const chartView = ref<InstanceType<typeof ChartView> | null>(null);

// Use Core Validation instead of Rules Validation
const statusText = computed(() => chartView.value?.coreValidation?.statusText?.value ?? 'CHƯA XÁC ĐỊNH');
const statusClass = computed(() => chartView.value?.coreValidation?.statusClass?.value ?? 'pill-gray');
const groupInfo = computed(() => chartView.value?.coreValidation?.groupInfo?.value ?? '');

function handleLayerChange(layer: 'main' | 'prime' | 'both') {
  chartView.value?.setLayer(layer);
}

function handleImport(files: FileList) {
  chartView.value?.importData(files);
}

function handleAutoSPChange(enabled: boolean) {
  chartView.value?.setAutoSP(enabled);
}

function toggleFullscreen() {
  const root = document.getElementById('app-root');
  if (!root) return;
  if (!document.fullscreenElement) {
    root.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function toggleRealtime() {
  if (vpsWebSocket.connected.value) {
    vpsWebSocket.disconnect();
  } else {
    vpsWebSocket.connect();
  }
}

// Keyboard shortcuts
useKeyboardShortcuts({
  onToggleMain: () => chartView.value?.toggleMain(),
  onTogglePrime: () => chartView.value?.togglePrime(),
  onToggleLayer: () => {
    // Cycle through layers
    const cv = chartView.value;
    if (!cv) return;
    // Simple toggle for now
  },
  onFullscreen: toggleFullscreen,
  onStart: () => chartView.value?.startPointSelection(),
  onStop: () => chartView.value?.stopPointSelection(),
  onAuto: () => handleAutoSPChange(true),
  onLock: () => chartView.value?.lockABCSelection(),
  onReset: () => chartView.value?.reset()
});

onMounted(() => {
  // Connect to VPS WebSocket for realtime data
  vpsWebSocket.connect();
});

onUnmounted(() => {
  vpsWebSocket.disconnect();
});
</script>

<style scoped>
#app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #080808;
}

.main-content {
  flex: 1;
  margin-top: 40px;
  margin-left: 44px;
  overflow: hidden;
}
</style>
