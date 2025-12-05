export interface WavePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type WaveDirection = 'UP' | 'DOWN' | 'FLAT';

export interface WavePoints {
  A: WavePoint | null;
  B: WavePoint | null;
  C: WavePoint | null;
  D: WavePoint | null;
  E: WavePoint | null;
  F: WavePoint | null;
  G: WavePoint | null;
  H: WavePoint | null;
  I: WavePoint | null;
}

export interface WaveSegments {
  AB?: number;
  BC?: number;
  CD?: number;
  DE?: number;
  EF?: number;
  FG?: number;
  GH?: number;
  HI?: number;
}

export interface WaveResult {
  directionMain: WaveDirection;
  A: WavePoint;
  End: WavePoint;
  points: WavePoints;
  segments: WaveSegments;
}

export interface PrimeWaveResult {
  directionPrime: WaveDirection;
  Aprime: WavePoint;
  pointsPrime: {
    A1: WavePoint | null;
    B1: WavePoint | null;
    C1: WavePoint | null;
    D1: WavePoint | null;
    E1: WavePoint | null;
    F1: WavePoint | null;
    G1: WavePoint | null;
    H1: WavePoint | null;
    I1: WavePoint | null;
  };
  segmentsPrime: {
    A1B1?: number;
    BC?: number;
    C1D1?: number;
    DE?: number;
    E1F1?: number;
    FG?: number;
    G1H1?: number;
    HI?: number;
  };
}

export interface WaveAnalysisResult {
  main: WaveResult | null;
  prime: PrimeWaveResult | null;
}

export type WaveRule = 'rule_10' | 'rule_11' | 'rule_11_3nen';

export interface RuleValidationResult {
  rule: WaveRule;
  passed: boolean;
  steps: RuleStep[];
}

export interface RuleStep {
  name: string;
  passed: boolean;
  details?: string[];
}
