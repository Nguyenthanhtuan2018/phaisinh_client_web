import { ref } from 'vue';
import type { WaveAnalysisResult, WavePoint } from '@/types';

export interface WaveVariables {
  // Main points coordinates
  mains: Record<string, { x: number | null; y: number | null }>;
  // Prime points coordinates
  primes: Record<string, { x: number | null; y: number | null }>;
  // Segments Main
  segmentsMain: Record<string, { dx: number | null; dy: number | null; value: number | null }>;
  // Segments Prime
  segmentsPrime: Record<string, { dx: number | null; dy: number | null; value: number | null }>;
  // Ratios Main
  ratiosMain: Record<string, number | null>;
  // Ratios Prime
  ratiosPrime: Record<string, number | null>;
  // Delta T Main
  deltasTMain: Record<string, number | null>;
  // Delta T Prime
  deltasTPrime: Record<string, number | null>;
}

export function useWavesVariables() {
  const variables = ref<WaveVariables>({
    mains: { A: { x: null, y: null }, B: { x: null, y: null }, C: { x: null, y: null }, D: { x: null, y: null }, E: { x: null, y: null }, F: { x: null, y: null }, G: { x: null, y: null }, H: { x: null, y: null }, I: { x: null, y: null } },
    primes: { A: { x: null, y: null }, B: { x: null, y: null }, C: { x: null, y: null }, D: { x: null, y: null }, E: { x: null, y: null }, F: { x: null, y: null }, G: { x: null, y: null }, H: { x: null, y: null }, I: { x: null, y: null } },
    segmentsMain: {},
    segmentsPrime: {},
    ratiosMain: {},
    ratiosPrime: {},
    deltasTMain: {},
    deltasTPrime: {}
  });

  function pct(numer: number | null | undefined, denom: number | null | undefined): number | null {
    if (numer == null || denom == null || denom === 0) return null;
    return (numer / denom) * 100;
  }

  // Lunch break config (11:30 - 13:00 = 5400 giây nghỉ)
  const LUNCH_START_SEC = 11 * 3600 + 30 * 60; // 11:30 = 41400 giây từ 00:00
  const LUNCH_END_SEC = 13 * 3600; // 13:00 = 46800 giây từ 00:00
  const LUNCH_DURATION = LUNCH_END_SEC - LUNCH_START_SEC; // 5400 giây

  function calcDeltaT(p1: WavePoint | null, p2: WavePoint | null): number | null {
    if (!p1 || !p2) return null;
    return Math.abs(p2.time - p1.time);
  }

  // Tính delta T có trừ nghỉ trưa (effective time)
  function calcEffectiveDeltaT(t1: number | null, t2: number | null): number | null {
    if (t1 == null || t2 == null) return null;
    const start = Math.min(t1, t2);
    const end = Math.max(t1, t2);
    const raw = end - start;

    // Tính số ngày và overlap với lunch break
    const dayStart = (t: number) => Math.floor(t / 86400) * 86400;
    let overlap = 0;
    let cur = start;

    while (cur < end) {
      const day = dayStart(cur);
      const lunchStart = day + LUNCH_START_SEC;
      const lunchEnd = day + LUNCH_END_SEC;

      // Tính overlap trong ngày này
      const segStart = Math.max(cur, lunchStart);
      const segEnd = Math.min(end, lunchEnd);
      if (segStart < segEnd) {
        overlap += segEnd - segStart;
      }

      // Chuyển sang ngày tiếp theo
      cur = day + 86400;
    }

    return raw - overlap;
  }

  function buildFromResult(result: WaveAnalysisResult | null) {
    if (!result) {
      reset();
      return;
    }

    const main = result.main;
    const prime = result.prime;

    // Build Main points
    if (main) {
      const { points, segments, directionMain } = main;
      const isUp = directionMain === 'UP';

      // Coordinates
      if (points.A) variables.value.mains.A = { x: points.A.time, y: isUp ? points.A.low : points.A.high };
      if (points.B) variables.value.mains.B = { x: points.B.time, y: isUp ? points.B.high : points.B.low };
      if (points.C) variables.value.mains.C = { x: points.C.time, y: isUp ? points.C.low : points.C.high };
      if (points.D) variables.value.mains.D = { x: points.D.time, y: isUp ? points.D.high : points.D.low };
      if (points.E) variables.value.mains.E = { x: points.E.time, y: isUp ? points.E.low : points.E.high };
      if (points.F) variables.value.mains.F = { x: points.F.time, y: isUp ? points.F.high : points.F.low };
      if (points.G) variables.value.mains.G = { x: points.G.time, y: isUp ? points.G.low : points.G.high };
      if (points.H) variables.value.mains.H = { x: points.H?.time ?? null, y: points.H ? (isUp ? points.H.high : points.H.low) : null };
      if (points.I) variables.value.mains.I = { x: points.I?.time ?? null, y: points.I ? (isUp ? points.I.low : points.I.high) : null };

      // Segments
      variables.value.segmentsMain = {
        AB: { dx: calcDeltaT(points.A, points.B), dy: null, value: segments.AB ?? null },
        BC: { dx: calcDeltaT(points.B, points.C), dy: null, value: segments.BC ?? null },
        CD: { dx: calcDeltaT(points.C, points.D), dy: null, value: segments.CD ?? null },
        DE: { dx: calcDeltaT(points.D, points.E), dy: null, value: segments.DE ?? null },
        EF: { dx: calcDeltaT(points.E, points.F), dy: null, value: segments.EF ?? null },
        FG: { dx: calcDeltaT(points.F, points.G), dy: null, value: segments.FG ?? null },
        GH: { dx: calcDeltaT(points.G, points.H), dy: null, value: segments.GH ?? null },
        HI: { dx: calcDeltaT(points.H, points.I), dy: null, value: segments.HI ?? null }
      };

      // Ratios Main - Bổ sung đầy đủ theo core.js
      const BE = segments.BC != null && segments.DE != null ? Math.abs(segments.BC - segments.DE) : null;
      const DG = segments.DE != null && segments.FG != null ? Math.abs(segments.DE - segments.FG) : null;
      const DI = segments.DE != null && segments.HI != null ? Math.abs(segments.DE - segments.HI) : null;
      const FH = segments.FG != null && segments.GH != null ? segments.FG + segments.GH : null;
      const FI = segments.FG != null && segments.GH != null && segments.HI != null ? segments.FG + segments.GH + segments.HI : null;

      variables.value.ratiosMain = {
        ratioBCOverAB: pct(segments.BC, segments.AB),
        ratioDEOverCD: pct(segments.DE, segments.CD),
        ratioFGOverEF: pct(segments.FG, segments.EF),
        ratioEFOverDE: pct(segments.EF, segments.DE),
        ratioCDOverBC: pct(segments.CD, segments.BC),
        ratioDEOverBC: pct(segments.DE, segments.BC),
        ratioFGOverDE: pct(segments.FG, segments.DE),
        ratioFGOverBC: pct(segments.FG, segments.BC),
        // Thêm các ratio cho core.js
        ratioBEOverBC: pct(BE, segments.BC),
        ratioDGOverDE: pct(DG, segments.DE),
        ratioDIOverDE: pct(DI, segments.DE),
        ratioFHOverFG: pct(FH, segments.FG),
        ratioFIOverFG: pct(FI, segments.FG),
        ratioHIOverDE: pct(segments.HI, segments.DE)
      };

      // Delta T Main (có trừ nghỉ trưa)
      variables.value.deltasTMain = {
        BCtime: calcEffectiveDeltaT(points.B?.time ?? null, points.C?.time ?? null),
        CDtime: calcEffectiveDeltaT(points.C?.time ?? null, points.D?.time ?? null),
        DEtime: calcEffectiveDeltaT(points.D?.time ?? null, points.E?.time ?? null),
        EFtime: calcEffectiveDeltaT(points.E?.time ?? null, points.F?.time ?? null),
        FGtime: calcEffectiveDeltaT(points.F?.time ?? null, points.G?.time ?? null),
        BGtime: calcEffectiveDeltaT(points.B?.time ?? null, points.G?.time ?? null),
        BDtime: calcEffectiveDeltaT(points.B?.time ?? null, points.D?.time ?? null),
        DFtime: calcEffectiveDeltaT(points.D?.time ?? null, points.F?.time ?? null)
      };
    }

    // Build Prime points
    if (prime) {
      const { pointsPrime, segmentsPrime, directionPrime } = prime;
      const isUp = directionPrime === 'UP';

      // Coordinates
      if (pointsPrime.A1) variables.value.primes.A = { x: pointsPrime.A1.time, y: isUp ? pointsPrime.A1.low : pointsPrime.A1.high };
      if (pointsPrime.B1) variables.value.primes.B = { x: pointsPrime.B1.time, y: isUp ? pointsPrime.B1.high : pointsPrime.B1.low };
      if (pointsPrime.C1) variables.value.primes.C = { x: pointsPrime.C1.time, y: isUp ? pointsPrime.C1.low : pointsPrime.C1.high };
      if (pointsPrime.D1) variables.value.primes.D = { x: pointsPrime.D1.time, y: isUp ? pointsPrime.D1.high : pointsPrime.D1.low };
      if (pointsPrime.E1) variables.value.primes.E = { x: pointsPrime.E1.time, y: isUp ? pointsPrime.E1.low : pointsPrime.E1.high };
      if (pointsPrime.F1) variables.value.primes.F = { x: pointsPrime.F1.time, y: isUp ? pointsPrime.F1.high : pointsPrime.F1.low };
      if (pointsPrime.G1) variables.value.primes.G = { x: pointsPrime.G1.time, y: isUp ? pointsPrime.G1.low : pointsPrime.G1.high };

      // Ratios Prime
      variables.value.ratiosPrime = {
        ratioBCOverAB: pct(segmentsPrime.BC, segmentsPrime.A1B1),
        ratioDEOverCD: pct(segmentsPrime.DE, segmentsPrime.C1D1),
        ratioFGOverEF: pct(segmentsPrime.FG, segmentsPrime.E1F1),
        ratioEFOverDE: pct(segmentsPrime.E1F1, segmentsPrime.DE),
        ratioCDOverBC: pct(segmentsPrime.C1D1, segmentsPrime.BC),
        ratioDEOverBC: pct(segmentsPrime.DE, segmentsPrime.BC),
        ratioFGOverDE: pct(segmentsPrime.FG, segmentsPrime.DE),
        ratioFGOverBC: pct(segmentsPrime.FG, segmentsPrime.BC)
      };

      // Delta T Prime (có trừ nghỉ trưa)
      variables.value.deltasTPrime = {
        BCtime: calcEffectiveDeltaT(pointsPrime.B1?.time ?? null, pointsPrime.C1?.time ?? null),
        CDtime: calcEffectiveDeltaT(pointsPrime.C1?.time ?? null, pointsPrime.D1?.time ?? null),
        DEtime: calcEffectiveDeltaT(pointsPrime.D1?.time ?? null, pointsPrime.E1?.time ?? null),
        EFtime: calcEffectiveDeltaT(pointsPrime.E1?.time ?? null, pointsPrime.F1?.time ?? null),
        FGtime: calcEffectiveDeltaT(pointsPrime.F1?.time ?? null, pointsPrime.G1?.time ?? null),
        BGtime: calcEffectiveDeltaT(pointsPrime.B1?.time ?? null, pointsPrime.G1?.time ?? null),
        BDtime: calcEffectiveDeltaT(pointsPrime.B1?.time ?? null, pointsPrime.D1?.time ?? null),
        DFtime: calcEffectiveDeltaT(pointsPrime.D1?.time ?? null, pointsPrime.F1?.time ?? null)
      };
    }
  }

  function reset() {
    variables.value = {
      mains: { A: { x: null, y: null }, B: { x: null, y: null }, C: { x: null, y: null }, D: { x: null, y: null }, E: { x: null, y: null }, F: { x: null, y: null }, G: { x: null, y: null }, H: { x: null, y: null }, I: { x: null, y: null } },
      primes: { A: { x: null, y: null }, B: { x: null, y: null }, C: { x: null, y: null }, D: { x: null, y: null }, E: { x: null, y: null }, F: { x: null, y: null }, G: { x: null, y: null }, H: { x: null, y: null }, I: { x: null, y: null } },
      segmentsMain: {},
      segmentsPrime: {},
      ratiosMain: {},
      ratiosPrime: {},
      deltasTMain: {},
      deltasTPrime: {}
    };
  }

  return {
    variables,
    buildFromResult,
    reset
  };
}
