import { ref } from 'vue';
import type { Candle } from '@/types';

// Backend API endpoint
const API_URL = '/api/intraday';
const SYMBOL = 'VN30F2512';

export function useRefreshApi() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchHistoricalData(): Promise<Candle[]> {
    isLoading.value = true;
    error.value = null;

    try {
      console.log('[RefreshAPI] Fetching from BE:', `${API_URL}/${SYMBOL}`);

      const response = await fetch(`${API_URL}/${SYMBOL}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[RefreshAPI] Received:', data.length, 'items');
      console.log('[RefreshAPI] Sample:', data.slice(0, 3));

      // Convert to candles format
      const candles: Candle[] = data
        .filter((item: any) => item.time && item.close)
        .map((item: any) => ({
          time: Math.floor(item.time),
          open: item.open || item.close,
          high: item.high || item.close,
          low: item.low || item.close,
          close: item.close
        }));

      console.log('[RefreshAPI] Candles:', candles.length);
      return candles;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
      console.error('[RefreshAPI] Error:', e);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  return {
    fetchHistoricalData,
    isLoading,
    error
  };
}
