import { ref } from 'vue';
import type { WavePoint } from '@waves/shared';
import type { IChartApi } from 'lightweight-charts';

export function useWavesPoints() {
  const pointA = ref<WavePoint | null>(null);
  const isSelecting = ref(false);

  let clickHandler: ((param: any) => void) | null = null;

  function findCandleAtOrBefore(arr: any[], time: number): WavePoint | null {
    if (!arr?.length || !Number.isFinite(time)) return null;
    
    let lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].time <= time) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    
    if (ans < 0) return null;
    return arr[ans];
  }

  function startSelection(chart: IChartApi, candleData: any[]) {
    if (isSelecting.value) return;
    isSelecting.value = true;

    clickHandler = (param: any) => {
      if (!param?.time) return;
      
      const t = typeof param.time === 'number' ? param.time : param.time?.timestamp;
      const candle = findCandleAtOrBefore(candleData, t);
      
      if (!candle) {
        alert('Không tìm thấy nến tại thời điểm click.');
        return;
      }

      pointA.value = { ...candle };
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

  function reset() {
    pointA.value = null;
  }

  return {
    pointA,
    isSelecting,
    startSelection,
    stopSelection,
    reset
  };
}
