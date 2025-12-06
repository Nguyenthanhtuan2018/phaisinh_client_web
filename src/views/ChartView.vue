<template>
  <div class="chart-view">
    <div ref="chartContainer" class="chart-container"></div>
    
    <!-- Core Validation Popup -->
    <div v-if="showValidationPopup" class="validation-popup">
      <div class="popup-header">
        <span class="popup-title">Core Validation</span>
        <button class="close-btn" @click="showValidationPopup = false">×</button>
      </div>
      <div class="popup-content">
        <div v-if="coreValidation.result.value" class="validation-result">
          <!-- Status Header -->
          <div class="result-header" :class="coreValidation.statusClass.value">
            {{ coreValidation.statusText.value }}
          </div>
          
          <!-- Group Info -->
          <div v-if="coreValidation.groupInfo.value" class="group-info">
            {{ coreValidation.groupInfo.value }}
          </div>

          <!-- Failed Prerequisites -->
          <div v-if="coreValidation.result.value.failedPrerequisites.length > 0" class="section">
            <div class="section-title fail">Prerequisites thất bại</div>
            <div v-for="(p, i) in coreValidation.result.value.failedPrerequisites" :key="i" class="condition-row fail">
              <span class="condition-text">{{ p }}</span>
              <span class="cross">✗</span>
            </div>
          </div>

          <!-- Failed Conditions -->
          <div v-if="coreValidation.result.value.failedConditions.length > 0" class="section">
            <div class="section-title fail">Điều kiện thất bại</div>
            <div v-for="(c, i) in coreValidation.result.value.failedConditions" :key="i" class="condition-row fail">
              <span class="condition-text">{{ c }}</span>
              <span class="cross">✗</span>
            </div>
          </div>

          <!-- Passed Conditions -->
          <div v-if="coreValidation.result.value.passedConditions.length > 0" class="section collapsible">
            <div class="section-title pass" @click="togglePassedConditions">
              Điều kiện đạt ({{ coreValidation.result.value.passedConditions.length }})
              <span class="toggle-icon">{{ showPassedConditions ? '▼' : '▶' }}</span>
            </div>
            <div v-if="showPassedConditions" class="conditions-list">
              <div v-for="(c, i) in coreValidation.result.value.passedConditions" :key="i" class="condition-row pass">
                <span class="condition-text">{{ c }}</span>
                <span class="tick">✓</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="no-data">Chưa có dữ liệu phân tích</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { createChart } from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { useChartStore } from '@/stores/chart';
import { useWavesPoints } from '@/composables/useWavesPoints';
import { useWavesStop } from '@/composables/useWavesStop';
import { useWavesLock } from '@/composables/useWavesLock';
import { useWavesEngine } from '@/composables/useWavesEngine';
import { useWavesRender } from '@/composables/useWavesRender';
import { useRulesValidation } from '@/composables/useRulesValidation';
import { useWavesVariables } from '@/composables/useWavesVariables';
import { useRefreshApi } from '@/composables/useRefreshApi';
import { useCoreValidation } from '@/composables/useCoreValidation';
import { useVpsWebSocket } from '@/composables/useVpsWebSocket';

const chartContainer = ref<HTMLElement | null>(null);
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;

const chartStore = useChartStore();
const wavesPoints = useWavesPoints();
const wavesStop = useWavesStop();
const wavesLock = useWavesLock();
const wavesEngine = useWavesEngine();
const wavesRender = useWavesRender();
const rulesValidation = useRulesValidation();
const wavesVariables = useWavesVariables();
const refreshApi = useRefreshApi();
const coreValidation = useCoreValidation();
const vpsWebSocket = useVpsWebSocket();

const showValidationPopup = ref(false);
const showMain = ref(true);
const showPrime = ref(true);
const autoSPEnabled = ref(false);
const showPassedConditions = ref(false);

function togglePassedConditions() {
  showPassedConditions.value = !showPassedConditions.value;
}

defineExpose({
  startPointSelection: () => { if (chart) wavesPoints.startSelection(chart, chartStore.currentData); },
  stopPointSelection: () => { if (chart) wavesStop.startSelection(chart, chartStore.currentData); },
  lockABCSelection: () => {
    if (chart) {
      if (wavesLock.isLocked.value) wavesLock.unlock();
      else wavesLock.startSelection(chart);
    }
  },
  showValidation: () => { showValidationPopup.value = true; },
  reset: () => {
    wavesPoints.reset();
    wavesStop.reset();
    wavesLock.reset();
    wavesEngine.result.value = null;
    wavesRender.clear();
    wavesVariables.reset();
    rulesValidation.validationResult.value = null;
    coreValidation.reset();
  },
  setAutoSP: (enabled: boolean) => {
    autoSPEnabled.value = enabled;
    if (enabled) wavesStop.setAutoStop(chartStore.currentData);
  },
  setLayer: (layer: 'main' | 'prime' | 'both') => {
    showMain.value = layer === 'main' || layer === 'both';
    showPrime.value = layer === 'prime' || layer === 'both';
    rerender();
  },
  toggleMain: () => { showMain.value = !showMain.value; rerender(); },
  togglePrime: () => { showPrime.value = !showPrime.value; rerender(); },
  importData: handleImport,
  refresh: handleRefresh,
  connectRealtime: () => vpsWebSocket.connect(),
  disconnectRealtime: () => vpsWebSocket.disconnect(),
  wavesPoints, wavesStop, wavesLock, rulesValidation, wavesVariables, coreValidation, vpsWebSocket
});

function recompute() {
  wavesEngine.compute(chartStore.currentData, wavesPoints.pointA.value, wavesStop.stopPoint.value, wavesLock.lockTime.value);
  wavesVariables.buildFromResult(wavesEngine.result.value);
  rulesValidation.validate(wavesEngine.result.value);
  // Core validation với variables
  coreValidation.validate(wavesVariables.variables.value);
  rerender();
}

function rerender() {
  wavesRender.render(wavesEngine.result.value, showMain.value, showPrime.value);
}

async function handleImport(files: FileList) {
  for (const file of Array.from(files)) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.data1s) chartStore.mergeData({ data1s: data.data1s });
      if (data.data1m) chartStore.mergeData({ data1m: data.data1m });
      if (data.data5m) chartStore.mergeData({ data5m: data.data5m });
      if (Array.isArray(data)) chartStore.mergeData({ data1s: data });
    } catch (e) { console.error('Import error:', e); }
  }
  recompute();
}

async function handleRefresh() {
  const candles = await refreshApi.fetchHistoricalData();
  if (candles.length > 0) {
    chartStore.mergeData({ data1s: candles });
    recompute();
    // Fit content to show all data
    if (chart) {
      chart.timeScale().fitContent();
    }
  }
}

onMounted(() => {
  if (!chartContainer.value) return;

  chart = createChart(chartContainer.value, {
    layout: { background: { color: '#080808' }, textColor: '#ffffff' },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    crosshair: { mode: 0 },
    timeScale: { 
      timeVisible: true, 
      secondsVisible: true, 
      barSpacing: 2,
      minBarSpacing: 0.1,
      rightOffset: 5
    }
  });

  candleSeries = chart.addCandlestickSeries({
    upColor: '#F5F5F5', downColor: '#F5F5F5', borderVisible: false,
    wickUpColor: '#F5F5F5', wickDownColor: '#F5F5F5', priceFormat: { minMove: 0.1 }
  });

  wavesRender.init(chart, candleSeries);
  updateChart();

  watch(() => chartStore.currentData, updateChart, { deep: true });
  watch(() => chartStore.currentFrame, updateChart);
  watch(() => wavesPoints.pointA.value, recompute);
  watch(() => wavesStop.stopPoint.value, recompute);
  watch(() => wavesLock.lockTime.value, recompute);

  watch(() => chartStore.currentData, () => {
    if (autoSPEnabled.value && chartStore.currentData.length > 0) {
      wavesStop.setAutoStop(chartStore.currentData);
    }
  }, { deep: true });

  const resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainer.value) {
      const rect = chartContainer.value.getBoundingClientRect();
      chart.resize(Math.floor(rect.width), Math.floor(rect.height));
    }
  });
  resizeObserver.observe(chartContainer.value);
});

function updateChart() {
  if (!candleSeries) return;
  candleSeries.setData(chartStore.currentData);
}

onUnmounted(() => { if (chart) { chart.remove(); chart = null; } });
</script>

<style scoped>
.chart-view { width: 100%; height: 100%; position: relative; }
.chart-container { width: 100%; height: 100%; }

.validation-popup {
  position: fixed; top: 48px; left: 52px; width: 380px; max-height: calc(100vh - 80px);
  overflow: auto; background: #131722; color: #fff; border: 1px solid #2d2f36;
  border-radius: 12px; box-shadow: 0 18px 36px rgba(0, 0, 0, 0.45); z-index: 10020;
}
.popup-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid #2d2f36;
}
.popup-title { font: 600 14px/1.2 system-ui, Arial; }
.close-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.popup-content { padding: 16px; }
.result-header { text-align: center; padding: 8px 16px; border-radius: 8px; font: 700 14px/1 system-ui; margin-bottom: 16px; }
.result-header.pill-green { background: #059669; }
.result-header.pill-red { background: #dc2626; }
.result-header.pill-gray { background: #374151; }
.steps { display: flex; flex-direction: column; gap: 8px; }
.step-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #0f0f0f; border-radius: 8px; }
.step-info { display: flex; flex-direction: column; gap: 4px; }
.step-name { font-size: 13px; font-weight: 600; }
.step-details { display: flex; gap: 12px; font-size: 11px; color: #9ca3af; }
.step-result { font-size: 16px; font-weight: 700; }
.tick { color: #22c55e; }
.cross { color: #ef4444; }
.no-data { text-align: center; color: #6b7280; padding: 20px; }

.group-info { 
  text-align: center; padding: 6px 12px; background: #1e293b; 
  border-radius: 6px; font: 600 12px/1.4 monospace; color: #60a5fa; margin-bottom: 12px;
}
.section { margin-bottom: 12px; }
.section-title { 
  font: 600 12px/1.4 system-ui; padding: 6px 8px; border-radius: 4px; margin-bottom: 6px;
  display: flex; align-items: center; justify-content: space-between;
}
.section-title.fail { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.section-title.pass { background: rgba(34, 197, 94, 0.15); color: #4ade80; cursor: pointer; }
.toggle-icon { font-size: 10px; }
.condition-row { 
  display: flex; align-items: center; justify-content: space-between; 
  padding: 6px 10px; background: #0f0f0f; border-radius: 6px; margin-bottom: 4px;
  font: 11px/1.4 monospace;
}
.condition-row.fail { border-left: 2px solid #ef4444; }
.condition-row.pass { border-left: 2px solid #22c55e; }
.condition-text { flex: 1; word-break: break-all; color: #d1d5db; }
.conditions-list { max-height: 200px; overflow-y: auto; }
</style>
