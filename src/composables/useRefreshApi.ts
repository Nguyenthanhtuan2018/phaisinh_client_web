import { ref } from 'vue';
import { REFRESH_API_URL, CHART_TIME_OFFSET_SEC } from '@/config/settings';
import type { Candle } from '@waves/shared';

export function useRefreshApi() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function fetchHistoricalData(): Promise<Candle[]> {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(REFRESH_API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[RefreshAPI] Raw data:', data);
      
      // Parse and normalize data
      const candles: Candle[] = [];
      
      if (Array.isArray(data)) {
        for (const item of data) {
          const candle = parseCandle(item);
          if (candle) candles.push(candle);
        }
      } else if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          const candle = parseCandle(item);
          if (candle) candles.push(candle);
        }
      }

      console.log('[RefreshAPI] Parsed candles:', candles.length, candles.slice(0, 3));
      return candles;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
      console.error('[RefreshAPI] Error:', e);
      return [];
    } finally {
      isLoading.value = false;
    }
  }

  function parseCandle(item: any): Candle | null {
    if (!item) return null;

    // Try to get time
    let time: number | null = null;
    
    if (typeof item.time === 'number') {
      time = item.time > 1e12 ? Math.floor(item.time / 1000) : item.time;
    } else if (item.timeServer || item.TimeServer) {
      const ts = item.timeServer || item.TimeServer;
      time = parseTimeString(ts);
    } else if (item.time && typeof item.time === 'string') {
      time = parseTimeString(item.time);
    } else if (item.date && item.hhmmss) {
      time = parseDateHMS(item.date, item.hhmmss);
    }

    if (!time) return null;

    // Note: Don't add timezone offset here - it's already handled by parseTimeString using local time

    // Get OHLC - VPS API uses: openPrice, hp (high), lp (low), lastPrice
    const open = Number(item.openPrice ?? item.open ?? item.Open ?? item.o ?? item.O);
    const high = Number(item.hp ?? item.high ?? item.High ?? item.h ?? item.H);
    const low = Number(item.lp ?? item.low ?? item.Low ?? item.l ?? item.L);
    const close = Number(item.lastPrice ?? item.close ?? item.Close ?? item.c ?? item.C ?? item.price);

    if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
      return null;
    }

    return { time, open, high, low, close };
  }

  function parseTimeString(ts: string): number | null {
    if (!ts) return null;
    
    // Check if it's just time (HH:MM:SS or HH:MM)
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(ts)) {
      const [h, m, s = '0'] = ts.split(':').map(Number);
      const today = new Date();
      today.setHours(h, m, Number(s), 0);
      return Math.floor(today.getTime() / 1000);
    }
    
    const d = new Date(ts.replace(' ', 'T'));
    if (isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }

  function parseDateHMS(date: string, hms: string): number | null {
    const ds = date.replace(/[/\.]/g, '-');
    const hs = hms.length === 6 
      ? `${hms.slice(0, 2)}:${hms.slice(2, 4)}:${hms.slice(4)}`
      : hms;
    const d = new Date(`${ds}T${hs}`);
    if (isNaN(d.getTime())) return null;
    return Math.floor(d.getTime() / 1000);
  }

  return {
    fetchHistoricalData,
    isLoading,
    error
  };
}
