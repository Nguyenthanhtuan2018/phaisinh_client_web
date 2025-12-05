export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
}

export type TimeFrame = '1s' | '1m' | '5m';

export interface CandleData {
  data1s: Candle[];
  data1m: Candle[];
  data5m: Candle[];
}
