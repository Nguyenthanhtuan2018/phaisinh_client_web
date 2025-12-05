<template>
  <div class="tvbar">
    <div class="left">
      <!-- Timeframe -->
      <div class="tv-select">
        <select v-model="chartStore.currentFrame" class="tv-dark-select">
          <option value="1s">1s</option>
          <option value="1m">1m</option>
          <option value="5m">5m</option>
        </select>
      </div>

      <span class="sep-h"></span>

      <!-- Rule selector (hidden by default like original) -->
      <div class="tv-select" style="display: none;">
        <select v-model="currentRule" class="tv-dark-select">
          <option value="rule_10">10</option>
          <option value="rule_11">11</option>
          <option value="rule_11_3nen">11 plus</option>
        </select>
      </div>
    </div>

    <div class="right">
      <!-- Rule detail button -->
      <button class="icon-btn" @click="emit('showRuleDetail')" title="Chi tiết">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M21 21l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6"/>
        </svg>
      </button>

      <!-- Layer toggle -->
      <button class="icon-btn" @click="toggleLayer" :title="`Layer: ${currentLayer}`">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M12 3 3 8l9 5 9-5-9-5Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M12 13 3 18l9 5 9-5-9-5Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
        </svg>
        <span id="layerBadge">{{ layerBadge }}</span>
      </button>

      <!-- Group info badge -->
      <div v-if="props.groupInfo" class="group-badge">
        {{ props.groupInfo }}
      </div>

      <!-- Realtime toggle -->
      <button 
        class="icon-btn realtime-btn" 
        :class="{ active: props.wsConnected }"
        @click="emit('toggleRealtime')" 
        :title="props.wsConnected ? 'Disconnect Realtime' : 'Connect Realtime'"
      >
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle cx="12" cy="12" r="3" :fill="props.wsConnected ? '#22c55e' : '#6b7280'"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="1.6" fill="none"/>
        </svg>
        <span v-if="props.wsConnected && props.lastPrice" class="price-badge">{{ props.lastPrice }}</span>
      </button>

      <!-- Status pill -->
      <div class="status-pill" :class="statusClass">
        {{ statusText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useChartStore } from '@/stores/chart';
import type { WaveRule } from '@waves/shared';

const chartStore = useChartStore();

const emit = defineEmits<{
  showRuleDetail: [];
  layerChange: [layer: 'main' | 'prime' | 'both'];
  ruleChange: [rule: WaveRule];
  toggleRealtime: [];
}>();

const props = defineProps<{
  statusText?: string;
  statusClass?: string;
  groupInfo?: string;
  wsConnected?: boolean;
  lastPrice?: number | null;
}>();

const currentRule = ref<WaveRule>('rule_10');
const currentLayer = ref<'main' | 'prime' | 'both'>('both');

const layerBadge = computed(() => {
  switch (currentLayer.value) {
    case 'main': return 'M';
    case 'prime': return 'P';
    case 'both': return 'B';
  }
});

function toggleLayer() {
  const layers: Array<'main' | 'prime' | 'both'> = ['main', 'prime', 'both'];
  const idx = layers.indexOf(currentLayer.value);
  currentLayer.value = layers[(idx + 1) % layers.length];
  emit('layerChange', currentLayer.value);
}
</script>

<style scoped>
.tvbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  background: #131722;
  border-bottom: 1px solid #2d2f36;
  z-index: 10000;
  color: #fff;
}

.left, .right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sep-h {
  width: 1px;
  height: 22px;
  background: #2d2f36;
  margin: 0 6px;
}

.tv-select {
  display: inline-flex;
  align-items: center;
  height: 28px;
  background: #131722;
  border: 1px solid #131722;
  border-radius: 6px;
  padding: 0 4px;
}

.tv-dark-select {
  appearance: none;
  background-color: #131722;
  color: #fff;
  border: 1px solid #131722;
  border-radius: 4px;
  padding: 4px 8px;
  font: 600 13px/1 system-ui, Arial;
  cursor: pointer;
  outline: none;
  width: 60px;
  height: 28px;
  text-align: center;
  background-image: url("data:image/svg+xml;utf8,<svg fill='white' height='14' viewBox='0 0 24 24' width='14' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>");
  background-repeat: no-repeat;
  background-position: right 6px center;
  background-size: 14px;
}

.tv-dark-select:hover {
  border-color: #2d2f36;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  cursor: pointer;
  position: relative;
  transition: background 0.12s ease, border-color 0.12s ease;
}

.icon-btn:hover {
  background: #0f0f0f;
  border-color: #2d2f36;
}

#layerBadge {
  position: absolute;
  right: 2px;
  bottom: 2px;
  font-size: 10px;
  padding: 0 3px;
  border-radius: 4px;
  background: #22c55e;
  color: #fff;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: 700 11px/1 system-ui, Arial;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid #2d2f36;
  min-width: 100px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.pill-green { background: #059669; color: #fff; }
.pill-red { background: #dc2626; color: #fff; }
.pill-gray { background: #374151; color: #fff; }

.group-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font: 600 11px/1 monospace;
  padding: 4px 8px;
  border-radius: 6px;
  background: #1e293b;
  color: #60a5fa;
  border: 1px solid #334155;
}

.realtime-btn.active {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
}

.price-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
  background: #22c55e;
  color: #fff;
  white-space: nowrap;
}
</style>
