import { ref } from 'vue';
import { LineStyle, type IChartApi, type ISeriesApi, type Time, type IPriceLine } from 'lightweight-charts';
import type { WaveAnalysisResult, WavePoint, WaveDirection } from '@/types';
import { colors } from '@/config/settings';

// Segment colors
const SEGMENT_COLORS: Record<string, string> = {
  AB: 'rgba(255, 255, 0, 0.9)',
  BC: 'rgba(255, 127, 0, 0.9)',
  CD: 'rgba(255, 0, 0, 0.9)',
  DE: 'rgba(255, 20, 147, 0.9)',
  EF: 'rgba(128, 0, 255, 0.9)',
  FG: 'rgba(0, 127, 255, 0.9)',
  GH: 'rgba(0, 200, 127, 0.9)',
  HI: 'rgba(0, 200, 200, 0.9)',
  CG: '#FFD700',
  BF: '#FFD700'
};

export function useWavesRender() {
  const markers = ref<any[]>([]);

  let chart: IChartApi | null = null;
  let candleSeries: ISeriesApi<'Candlestick'> | null = null;
  let lineSeries: ISeriesApi<'Line'>[] = [];
  let priceLines: IPriceLine[] = [];

  // Settings
  const showPriceLines = ref(true);
  const showSegmentLines = ref(true);
  const showCGLine = ref(true);
  const showBFLine = ref(true);
  const showPminPmax = ref(true);
  const Pmin = ref(30);
  const Pmax = ref(90);

  function init(chartInstance: IChartApi, candleSeriesInstance: ISeriesApi<'Candlestick'>) {
    chart = chartInstance;
    candleSeries = candleSeriesInstance;
  }

  function clear() {
    if (candleSeries) {
      candleSeries.setMarkers([]);
      // Remove price lines
      priceLines.forEach(line => {
        try { candleSeries?.removePriceLine(line); } catch {}
      });
      priceLines = [];
    }
    lineSeries.forEach(series => {
      if (chart) chart.removeSeries(series);
    });
    lineSeries = [];
    markers.value = [];
  }

  function fmt(v: number | undefined | null): string {
    if (v == null || !Number.isFinite(v)) return '';
    const n = Math.abs(v) >= 100 ? 0 : 2;
    return v.toFixed(n);
  }

  function posForPoint(dir: WaveDirection, pointLetter: string): 'aboveBar' | 'belowBar' {
    if (pointLetter === 'A' || pointLetter === "A'") {
      return dir === 'UP' ? 'belowBar' : 'aboveBar';
    }
    const isPeak = ['B', 'D', 'F', 'H', "B'", "D'", "F'", "H'"].includes(pointLetter);
    if (dir === 'UP') return isPeak ? 'aboveBar' : 'belowBar';
    if (dir === 'DOWN') return isPeak ? 'belowBar' : 'aboveBar';
    return 'aboveBar';
  }

  function isPeak(letter: string): boolean {
    return ['B', 'D', 'F', 'H', "B'", "D'", "F'", "H'"].includes(letter);
  }

  function valueForPoint(dir: WaveDirection, letter: string, pt: WavePoint): number | null {
    if (!pt) return null;
    const peak = isPeak(letter);
    if (dir === 'UP') {
      return peak ? pt.high : pt.low;
    }
    if (dir === 'DOWN') {
      return peak ? pt.low : pt.high;
    }
    return pt.close;
  }

  function createMarker(
    point: WavePoint,
    label: string,
    segmentLabel: string,
    segmentValue: number | undefined,
    color: string,
    dir: WaveDirection,
    shape: 'circle' | 'arrowDown' | 'arrowUp' = 'circle'
  ) {
    const text = segmentValue != null 
      ? `${label} (${segmentLabel} = ${fmt(segmentValue)})`
      : label;
    
    return {
      time: point.time,
      position: posForPoint(dir, label),
      color,
      shape,
      text,
      size: 1
    };
  }

  function markersForMain(result: WaveAnalysisResult): any[] {
    if (!result?.main) return [];
    const m: any[] = [];
    const { directionMain: dir, points: P, segments: S } = result.main;
    const color = colors.main;

    if (P.A) {
      const aVal = dir === 'UP' ? P.A.low : P.A.high;
      m.push(createMarker(P.A, 'A', 'A', aVal, color, dir, 'arrowDown'));
    }
    if (P.B) m.push(createMarker(P.B, 'B', 'AB', S.AB, color, dir));
    if (P.C) m.push(createMarker(P.C, 'C', 'BC', S.BC, color, dir));
    if (P.D) m.push(createMarker(P.D, 'D', 'CD', S.CD, color, dir));
    if (P.E) m.push(createMarker(P.E, 'E', 'DE', S.DE, color, dir));
    if (P.F) m.push(createMarker(P.F, 'F', 'EF', S.EF, color, dir));
    if (P.G) m.push(createMarker(P.G, 'G', 'FG', S.FG, color, dir));
    if (P.H) m.push(createMarker(P.H, 'H', 'GH', S.GH, color, dir));
    if (P.I) m.push(createMarker(P.I, 'I', 'HI', S.HI, color, dir));

    return m;
  }

  function markersForPrime(result: WaveAnalysisResult): any[] {
    if (!result?.prime) return [];
    const m: any[] = [];
    const { directionPrime: dir, pointsPrime: P, segmentsPrime: S } = result.prime;
    const color = colors.prime;

    if (P.A1) {
      const aVal = dir === 'UP' ? P.A1.low : P.A1.high;
      m.push(createMarker(P.A1, "A'", 'A', aVal, color, dir, 'arrowUp'));
    }
    if (P.B1) m.push(createMarker(P.B1, "B'", 'AB', S.A1B1, color, dir, 'arrowUp'));
    if (P.C1) m.push(createMarker(P.C1, "C'", 'BC', S.BC, color, dir, 'arrowUp'));
    if (P.D1) m.push(createMarker(P.D1, "D'", 'CD', S.C1D1, color, dir, 'arrowUp'));
    if (P.E1) m.push(createMarker(P.E1, "E'", 'DE', S.DE, color, dir, 'arrowUp'));
    if (P.F1) m.push(createMarker(P.F1, "F'", 'EF', S.E1F1, color, dir, 'arrowUp'));
    if (P.G1) m.push(createMarker(P.G1, "G'", 'FG', S.FG, color, dir, 'arrowUp'));
    if (P.H1) m.push(createMarker(P.H1, "H'", 'GH', S.G1H1, color, dir, 'arrowUp'));
    if (P.I1) m.push(createMarker(P.I1, "I'", 'HI', S.HI, color, dir, 'arrowUp'));

    return m;
  }

  // Create price line
  function createPriceLine(price: number, title: string, color: string) {
    if (!candleSeries || !Number.isFinite(price)) return;
    const line = candleSeries.createPriceLine({
      price,
      title,
      color,
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: true
    });
    priceLines.push(line);
  }

  // Draw price lines for Main points
  function drawPriceLines(result: WaveAnalysisResult, showMain: boolean, showPrime: boolean) {
    if (!showPriceLines.value || !candleSeries) return;

    const dirMain = result?.main?.directionMain;
    const P = result?.main?.points;

    if (showMain && P && dirMain) {
      const lineColor = 'rgba(23, 229, 64, 0.4)';
      if (P.B) createPriceLine(valueForPoint(dirMain, 'B', P.B)!, 'B', lineColor);
      if (P.C) createPriceLine(valueForPoint(dirMain, 'C', P.C)!, 'C', lineColor);
      if (P.D) createPriceLine(valueForPoint(dirMain, 'D', P.D)!, 'D', lineColor);
      if (P.E) createPriceLine(valueForPoint(dirMain, 'E', P.E)!, 'E', lineColor);
      if (P.F) createPriceLine(valueForPoint(dirMain, 'F', P.F)!, 'F', lineColor);
      if (P.G) createPriceLine(valueForPoint(dirMain, 'G', P.G)!, 'G', lineColor);

      // Pmin/Pmax
      if (showPminPmax.value && P.C && P.G) {
        const pc = valueForPoint(dirMain, 'C', P.C);
        const pg = valueForPoint(dirMain, 'G', P.G);
        if (pc != null && pg != null) {
          const delta = pg - pc;
          const pminVal = pc + delta * (Pmin.value / 100);
          const pmaxVal = pc + delta * (Pmax.value / 100);
          createPriceLine(pminVal, 'Pmin', '#FFD700');
          createPriceLine(pmaxVal, 'Pmax', '#FFD700');
        }
      }
    }

    // Prime price lines
    const dirPrime = result?.prime?.directionPrime;
    const PP = result?.prime?.pointsPrime;

    if (showPrime && PP && dirPrime) {
      const lineColor = 'rgba(248, 5, 5, 0.4)';
      if (PP.B1) createPriceLine(valueForPoint(dirPrime, "B'", PP.B1)!, "B'", lineColor);
      if (PP.C1) createPriceLine(valueForPoint(dirPrime, "C'", PP.C1)!, "C'", lineColor);
      if (PP.D1) createPriceLine(valueForPoint(dirPrime, "D'", PP.D1)!, "D'", lineColor);
      if (PP.E1) createPriceLine(valueForPoint(dirPrime, "E'", PP.E1)!, "E'", lineColor);
      if (PP.F1) createPriceLine(valueForPoint(dirPrime, "F'", PP.F1)!, "F'", lineColor);
      if (PP.G1) createPriceLine(valueForPoint(dirPrime, "G'", PP.G1)!, "G'", lineColor);
    }
  }

  // Draw segment lines (colored lines connecting points)
  function drawSegmentLines(result: WaveAnalysisResult, showMain: boolean, showPrime: boolean) {
    if (!showSegmentLines.value || !chart) return;

    const dirMain = result?.main?.directionMain;
    const P = result?.main?.points;

    if (showMain && P && dirMain) {
      const segments: [string, WavePoint | null | undefined, WavePoint | null | undefined][] = [
        ['AB', P.A, P.B],
        ['BC', P.B, P.C],
        ['CD', P.C, P.D],
        ['DE', P.D, P.E],
        ['EF', P.E, P.F],
        ['FG', P.F, P.G],
        ['GH', P.G, P.H],
        ['HI', P.H, P.I]
      ];

      for (const [name, p1, p2] of segments) {
        if (p1 && p2) {
          const v1 = valueForPoint(dirMain, name[0], p1);
          const v2 = valueForPoint(dirMain, name[1], p2);
          if (v1 != null && v2 != null) {
            const series = chart.addLineSeries({
              color: SEGMENT_COLORS[name] || colors.main,
              lineWidth: 3,
              priceLineVisible: false,
              lastValueVisible: false
            });
            series.setData([
              { time: p1.time as Time, value: v1 },
              { time: p2.time as Time, value: v2 }
            ]);
            lineSeries.push(series);
          }
        }
      }

      // CG line
      if (showCGLine.value && P.C && P.G) {
        const vc = valueForPoint(dirMain, 'C', P.C);
        const vg = valueForPoint(dirMain, 'G', P.G);
        if (vc != null && vg != null) {
          const series = chart.addLineSeries({
            color: SEGMENT_COLORS.CG,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false
          });
          series.setData([
            { time: P.C.time as Time, value: vc },
            { time: P.G.time as Time, value: vg }
          ]);
          lineSeries.push(series);
        }
      }

      // BF line
      if (showBFLine.value && P.B && P.F) {
        const vb = valueForPoint(dirMain, 'B', P.B);
        const vf = valueForPoint(dirMain, 'F', P.F);
        if (vb != null && vf != null) {
          const series = chart.addLineSeries({
            color: SEGMENT_COLORS.BF,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false
          });
          series.setData([
            { time: P.B.time as Time, value: vb },
            { time: P.F.time as Time, value: vf }
          ]);
          lineSeries.push(series);
        }
      }
    }

    // Prime segments
    const dirPrime = result?.prime?.directionPrime;
    const PP = result?.prime?.pointsPrime;

    if (showPrime && PP && dirPrime) {
      const segments: [string, WavePoint | null | undefined, WavePoint | null | undefined][] = [
        ['AB', PP.A1, PP.B1],
        ['BC', PP.B1, PP.C1],
        ['CD', PP.C1, PP.D1],
        ['DE', PP.D1, PP.E1],
        ['EF', PP.E1, PP.F1],
        ['FG', PP.F1, PP.G1],
        ['GH', PP.G1, PP.H1],
        ['HI', PP.H1, PP.I1]
      ];

      for (const [name, p1, p2] of segments) {
        if (p1 && p2) {
          const v1 = valueForPoint(dirPrime, name[0] + "'", p1);
          const v2 = valueForPoint(dirPrime, name[1] + "'", p2);
          if (v1 != null && v2 != null) {
            const series = chart.addLineSeries({
              color: SEGMENT_COLORS[name] || colors.prime,
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              priceLineVisible: false,
              lastValueVisible: false
            });
            series.setData([
              { time: p1.time as Time, value: v1 },
              { time: p2.time as Time, value: v2 }
            ]);
            lineSeries.push(series);
          }
        }
      }

      // CG line for Prime
      if (showCGLine.value && PP.C1 && PP.G1) {
        const vc = valueForPoint(dirPrime, "C'", PP.C1);
        const vg = valueForPoint(dirPrime, "G'", PP.G1);
        if (vc != null && vg != null) {
          const series = chart.addLineSeries({
            color: SEGMENT_COLORS.CG,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false
          });
          series.setData([
            { time: PP.C1.time as Time, value: vc },
            { time: PP.G1.time as Time, value: vg }
          ]);
          lineSeries.push(series);
        }
      }

      // BF line for Prime
      if (showBFLine.value && PP.B1 && PP.F1) {
        const vb = valueForPoint(dirPrime, "B'", PP.B1);
        const vf = valueForPoint(dirPrime, "F'", PP.F1);
        if (vb != null && vf != null) {
          const series = chart.addLineSeries({
            color: SEGMENT_COLORS.BF,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false
          });
          series.setData([
            { time: PP.B1.time as Time, value: vb },
            { time: PP.F1.time as Time, value: vf }
          ]);
          lineSeries.push(series);
        }
      }
    }
  }

  function render(result: WaveAnalysisResult | null, showMain: boolean = true, showPrime: boolean = true) {
    clear();
    if (!result || !chart || !candleSeries) return;

    const newMarkers: any[] = [];
    if (showMain) newMarkers.push(...markersForMain(result));
    if (showPrime) newMarkers.push(...markersForPrime(result));

    // Draw segment lines (colored)
    drawSegmentLines(result, showMain, showPrime);

    // Draw price lines
    drawPriceLines(result, showMain, showPrime);

    if (newMarkers.length > 0) {
      candleSeries.setMarkers(newMarkers);
      markers.value = newMarkers;
    }
  }

  return {
    init,
    render,
    clear,
    markers,
    showPriceLines,
    showSegmentLines,
    showCGLine,
    showBFLine,
    showPminPmax,
    Pmin,
    Pmax
  };
}
