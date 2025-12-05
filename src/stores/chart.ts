import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Candle, TimeFrame } from '@waves/shared/src/types/candle';

export const useChartStore = defineStore('chart', () => {
  const data1s = ref<Candle[]>([]);
  const data1m = ref<Candle[]>([]);
  const data5m = ref<Candle[]>([]);
  const currentFrame = ref<TimeFrame>('1s');
  const timeOffset = ref(7 * 3600); // +7h for Vietnam

  const candles1s = new Map<number, Candle>();
  const candles1m = new Map<number, Candle>();
  const candles5m = new Map<number, Candle>();

  const currentData = computed(() => {
    switch (currentFrame.value) {
      case '1m': return data1m.value;
      case '5m': return data5m.value;
      default: return data1s.value;
    }
  });

  const frameBucket = (unixSec: number, frame: TimeFrame): number => {
    const u = Math.floor(unixSec);
    if (frame === '1m') return Math.floor(u / 60) * 60;
    if (frame === '5m') return Math.floor(u / 300) * 300;
    return u;
  };

  const updateCandle = (
    candleMap: Map<number, Candle>,
    dataArr: Candle[],
    price: number,
    unixSec: number,
    frame: TimeFrame
  ) => {
    const bucket = frameBucket(unixSec, frame);
    let candle = candleMap.get(bucket);

    if (!candle) {
      candle = {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price
      };
      candleMap.set(bucket, candle);
      dataArr.push(candle);
    } else {
      if (price > candle.high) candle.high = price;
      if (price < candle.low) candle.low = price;
      candle.close = price;
    }
  };

  const processTick = (tick: any) => {
    if (!tick || !Number.isFinite(tick.time)) return;

    const t = Math.floor(tick.time + timeOffset.value);
    let price = tick.price ?? tick.close ?? tick.lastPrice;
    
    if (!Number.isFinite(price)) return;

    updateCandle(candles1s, data1s.value, price, t, '1s');
    updateCandle(candles1m, data1m.value, price, t, '1m');
    updateCandle(candles5m, data5m.value, price, t, '5m');
  };

  const mergeData = (payload: { data1s?: Candle[]; data1m?: Candle[]; data5m?: Candle[] }) => {
    // Process each candle as a tick to aggregate properly
    if (payload.data1s) {
      for (const c of payload.data1s) {
        if (!c || !Number.isFinite(c.time)) continue;
        const price = c.close ?? c.open ?? c.high ?? c.low;
        if (!Number.isFinite(price)) continue;
        
        // Aggregate into 1s bucket
        const bucket1s = Math.floor(c.time);
        let candle1s = candles1s.get(bucket1s);
        if (!candle1s) {
          candle1s = { time: bucket1s, open: c.open, high: c.high, low: c.low, close: c.close };
          candles1s.set(bucket1s, candle1s);
          data1s.value.push(candle1s);
        } else {
          if (c.high > candle1s.high) candle1s.high = c.high;
          if (c.low < candle1s.low) candle1s.low = c.low;
          candle1s.close = c.close;
        }
        
        // Aggregate into 1m bucket
        const bucket1m = Math.floor(c.time / 60) * 60;
        let candle1m = candles1m.get(bucket1m);
        if (!candle1m) {
          candle1m = { time: bucket1m, open: c.open, high: c.high, low: c.low, close: c.close };
          candles1m.set(bucket1m, candle1m);
          data1m.value.push(candle1m);
        } else {
          if (c.high > candle1m.high) candle1m.high = c.high;
          if (c.low < candle1m.low) candle1m.low = c.low;
          candle1m.close = c.close;
        }
        
        // Aggregate into 5m bucket
        const bucket5m = Math.floor(c.time / 300) * 300;
        let candle5m = candles5m.get(bucket5m);
        if (!candle5m) {
          candle5m = { time: bucket5m, open: c.open, high: c.high, low: c.low, close: c.close };
          candles5m.set(bucket5m, candle5m);
          data5m.value.push(candle5m);
        } else {
          if (c.high > candle5m.high) candle5m.high = c.high;
          if (c.low < candle5m.low) candle5m.low = c.low;
          candle5m.close = c.close;
        }
      }
    }

    // Sort all
    data1s.value.sort((a, b) => a.time - b.time);
    data1m.value.sort((a, b) => a.time - b.time);
    data5m.value.sort((a, b) => a.time - b.time);
  };

  const setTimeFrame = (frame: TimeFrame) => {
    currentFrame.value = frame;
  };

  return {
    data1s,
    data1m,
    data5m,
    currentFrame,
    currentData,
    processTick,
    mergeData,
    setTimeFrame
  };
});
