import { ref, watch } from 'vue';
import type { WavePoint, WaveDirection, WaveAnalysisResult, WaveResult, PrimeWaveResult } from '@waves/shared';

export function useWavesEngine() {
  const result = ref<WaveAnalysisResult | null>(null);

  function getDirection(A: WavePoint, End: WavePoint): WaveDirection {
    const diff = (A.close ?? 0) - (End.close ?? 0);
    if (diff > 0) return 'DOWN';
    if (diff < 0) return 'UP';
    return 'FLAT';
  }

  function opposite(dir: WaveDirection): WaveDirection {
    if (dir === 'UP') return 'DOWN';
    if (dir === 'DOWN') return 'UP';
    return 'FLAT';
  }

  function indexAfterTime(arr: any[], t: number): number {
    if (!arr?.length) return -1;
    let lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].time > t) {
        ans = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return ans;
  }

  function indexAtOrBefore(arr: any[], t: number): number {
    if (!arr?.length) return -1;
    let lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].time <= t) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  function findPairSequential(
    arr: any[],
    dir: WaveDirection,
    startT: number,
    endT: number | null
  ): { B: WavePoint; C: WavePoint; span: number } | null {
    const L = indexAfterTime(arr, startT);
    const R = endT != null ? indexAtOrBefore(arr, endT) : arr.length - 1;
    
    if (L < 0 || R < 0 || L >= R) return null;

    let best: any = null;
    let B = arr[L];
    let C: any = null;

    if (dir === 'UP') {
      for (let i = L + 1; i <= R; i++) {
        const c = arr[i];
        if (!C || c.low < C.low) C = c;
        if (c.high > B.high) {
          if (C) {
            const span = B.high - C.low;
            if (!best || span > best.span) best = { B, C, span };
          }
          B = c;
          C = null;
        }
      }
      if (C) {
        const span = B.high - C.low;
        if (!best || span > best.span) best = { B, C, span };
      }
      return best;
    }

    if (dir === 'DOWN') {
      for (let i = L + 1; i <= R; i++) {
        const c = arr[i];
        if (!C || c.high > C.high) C = c;
        if (c.low < B.low) {
          if (C) {
            const span = C.high - B.low;
            if (!best || span > best.span) best = { B, C, span };
          }
          B = c;
          C = null;
        }
      }
      if (C) {
        const span = C.high - B.low;
        if (!best || span > best.span) best = { B, C, span };
      }
      return best;
    }

    return null;
  }

  function findChainSequential(
    arr: any[],
    dir: WaveDirection,
    startT: number,
    endT: number | null,
    lockT: number | null
  ) {
    const out: any = {
      B: null, C: null, D: null, E: null, F: null, G: null, H: null, I: null,
      spans: {}
    };

    // BC with lock limit
    const endT_BC = lockT == null ? endT : (endT == null ? lockT : Math.min(endT, lockT));
    const bc = findPairSequential(arr, dir, startT ?? -Infinity, endT_BC);
    if (!bc) return out;
    out.B = bc.B;
    out.C = bc.C;
    out.spans.BC = bc.span;

    // DE
    const de = findPairSequential(arr, dir, out.C.time, endT);
    if (!de) return out;
    out.D = de.B;
    out.E = de.C;
    out.spans.DE = de.span;

    // FG
    const fg = findPairSequential(arr, dir, out.E.time, endT);
    if (!fg) return out;
    out.F = fg.B;
    out.G = fg.C;
    out.spans.FG = fg.span;

    // HI
    const hi = findPairSequential(arr, dir, out.G.time, endT);
    if (hi) {
      out.H = hi.B;
      out.I = hi.C;
      out.spans.HI = hi.span;
    }

    return out;
  }

  function segmentSpan(dir: WaveDirection, P: WavePoint | null, Q: WavePoint | null): number | null {
    if (!P || !Q) return null;
    if (dir === 'UP') return (Q.high ?? Q.close ?? 0) - (P.low ?? P.close ?? 0);
    if (dir === 'DOWN') return (P.high ?? P.close ?? 0) - (Q.low ?? Q.close ?? 0);
    return null;
  }

  function buildResult(A: WavePoint, End: WavePoint, dir: WaveDirection, chain: any): WaveResult {
    const res: WaveResult = {
      directionMain: dir,
      A,
      End,
      points: {
        A,
        B: chain.B,
        C: chain.C,
        D: chain.D,
        E: chain.E,
        F: chain.F,
        G: chain.G,
        H: chain.H,
        I: chain.I
      },
      segments: {}
    };

    if (chain.B) {
      res.segments.AB = dir === 'UP'
        ? chain.B.high - (A.low ?? A.close)
        : (A.high ?? A.close) - chain.B.low;
    }
    if (chain.C && chain.D) res.segments.CD = segmentSpan(dir, chain.C, chain.D) ?? undefined;
    if (chain.E && chain.F) res.segments.EF = segmentSpan(dir, chain.E, chain.F) ?? undefined;
    if (chain.G && chain.H) res.segments.GH = segmentSpan(dir, chain.G, chain.H) ?? undefined;
    
    Object.assign(res.segments, chain.spans);
    return res;
  }

  function compute(
    candleData: any[],
    A: WavePoint | null,
    End: WavePoint | null,
    lockT: number | null
  ) {
    if (!A || !End || !candleData?.length || End.time <= A.time) {
      result.value = null;
      return;
    }

    const dir = getDirection(A, End);
    if (dir === 'FLAT') {
      result.value = null;
      return;
    }

    // Main chain
    const mainChain = findChainSequential(candleData, dir, A.time, End.time, lockT);
    const resultMain = buildResult(A, End, dir, mainChain);

    // Prime chain
    let resultPrime: PrimeWaveResult | null = null;
    if (mainChain.B) {
      const Aprime = mainChain.B;
      const dir2 = opposite(dir);
      const primeChain = findChainSequential(candleData, dir2, Aprime.time, End.time, lockT);

      resultPrime = {
        directionPrime: dir2,
        Aprime,
        pointsPrime: {
          A1: Aprime,
          B1: primeChain.B,
          C1: primeChain.C,
          D1: primeChain.D,
          E1: primeChain.E,
          F1: primeChain.F,
          G1: primeChain.G,
          H1: primeChain.H,
          I1: primeChain.I
        },
        segmentsPrime: {
          A1B1: dir2 === 'UP'
            ? (primeChain.B ? primeChain.B.high - (Aprime.low ?? Aprime.close) : undefined)
            : (primeChain.B ? (Aprime.high ?? Aprime.close) - primeChain.B.low : undefined),
          BC: primeChain.spans.BC,
          DE: primeChain.spans.DE,
          FG: primeChain.spans.FG,
          HI: primeChain.spans.HI,
          C1D1: segmentSpan(dir2, primeChain.C, primeChain.D) ?? undefined,
          E1F1: segmentSpan(dir2, primeChain.E, primeChain.F) ?? undefined,
          G1H1: segmentSpan(dir2, primeChain.G, primeChain.H) ?? undefined
        }
      };
    }

    result.value = { main: resultMain, prime: resultPrime };
  }

  return {
    result,
    compute
  };
}
