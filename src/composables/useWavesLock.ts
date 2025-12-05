import { ref } from 'vue';
import type { IChartApi } from 'lightweight-charts';

export function useWavesLock() {
  const lockTime = ref<number | null>(null);
  const isLocked = ref(false);
  const isSelecting = ref(false);

  let clickHandler: ((param: any) => void) | null = null;

  function startSelection(chart: IChartApi) {
    if (isSelecting.value) return;
    isSelecting.value = true;

    clickHandler = (param: any) => {
      if (!param?.time) return;
      
      const t = typeof param.time === 'number' ? param.time : param.time?.timestamp;
      lockTime.value = t;
      isLocked.value = true;
      isSelecting.value = false;
      
      if (clickHandler) {
        chart.unsubscribeClick(clickHandler);
      }
    };

    chart.subscribeClick(clickHandler);
  }

  function stopSelection(chart: IChartApi) {
    if (isSelecting.value && clickHandler) {
      chart.unsubscribeClick(clickHandler);
    }
    isSelecting.value = false;
  }

  function unlock() {
    lockTime.value = null;
    isLocked.value = false;
  }

  function reset() {
    unlock();
  }

  return {
    lockTime,
    isLocked,
    isSelecting,
    startSelection,
    stopSelection,
    unlock,
    reset
  };
}
