// coreRules.ts — Port từ core.js sang TypeScript
// Dùng CHUNG, viết theo xu hướng UP
// 3 tầng validate:
// 1) prerequisites (lọc thô): thời gian & biên độ tối thiểu
// 2) groups + subs (phân nhánh cơ bản)
// 3) steps (ra status): chỉ giữ điều kiện cần

export type ValidationStatus = 'continuation' | 'reversal' | 'indeterminate';
export type PositionRelation = 'above' | 'below' | 'on';

export interface ValidationContext {
  mains: Record<string, { x: number | null; y: number | null }>;
  segmentsMain: Record<string, { dx: number | null; dy: number | null; value: number | null }>;
  ratiosMain: Record<string, number | null>;
  deltasTMain: Record<string, number | null>;
  positionsMain: {
    E_vs_CG: PositionRelation | null;
    D_vs_BF: PositionRelation | null;
  };
  rangesMain: {
    Tmin: number | null;
    Tmax: number | null;
    Pmin: number | null;
    Pmax: number | null;
  };
  // Window settings
  deltaT: number; // Thời gian B→G tối thiểu (giây)
  deltaB: number; // Biên độ BC tối thiểu
}

export interface RuleStep {
  validate: (string | string[])[];
  status: ValidationStatus;
}

export interface RuleSub {
  code: string;
  validate: string[];
  steps: RuleStep[];
}

export interface RuleGroup {
  key: 'sideways' | 'up' | 'down';
  validate: string[];
  subs: RuleSub[];
}

export interface CoreRulesConfig {
  prerequisites: string[];
  groups: RuleGroup[];
}

export const CORE_RULES: CoreRulesConfig = {
  // ===== Lần 1: prerequisites (lọc thô) =====
  prerequisites: [
    "deltasTMain.BGtime >= deltaT",
    "segmentsMain.BC.value >= deltaB",
    "ratiosMain.ratioFGOverBC > 33.3",
    "ratiosMain.ratioFGOverBC < 67",
    "(deltasTMain.FGtime / deltasTMain.BGtime) * 100 > 1.2"
  ],

  // ===== Lần 2 + 3 =====
  groups: [
    // ---------- SIDEWAYS ----------
    {
      key: "sideways",
      validate: [
        "segmentsMain.DE.value <= segmentsMain.BC.value",
        "mains.D.y <= mains.B.y"
      ],
      subs: [
        // 000: F ≤ D
        {
          code: "000",
          validate: ["mains.F.y <= mains.D.y"],
          steps: [
            {
              validate: [
                ["positionsMain.E_vs_CG === 'below'", "positionsMain.E_vs_CG === 'above'"],
                "positionsMain.D_vs_BF === 'below'",
                "Math.abs(mains.E.y - mains.G.y) !== 0",
                "Math.abs(mains.C.y - mains.E.y) !== 0",
                "mains.H.y > mains.F.y",
                "ratiosMain.ratioFHOverFG < 50",
                "ratiosMain.ratioFIOverFG > 32"
              ],
              status: "continuation"
            },
            {
              validate: [
                "positionsMain.E_vs_CG === 'above'",
                "positionsMain.D_vs_BF === 'above'",
                "mains.D.x > rangesMain.Tmin",
                "ratiosMain.ratioBEOverBC < 38"
              ],
              status: "reversal"
            }
          ]
        },
        // 001: F > D
        {
          code: "001",
          validate: ["mains.F.y > mains.D.y"],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below' || positionsMain.E_vs_CG === 'on' || positionsMain.E_vs_CG === 'above'",
                "positionsMain.D_vs_BF === 'below' || positionsMain.D_vs_BF === 'on'",
                "mains.E.x > rangesMain.Tmin",
                "mains.E.y > rangesMain.Pmin",
                "ratiosMain.ratioFGOverDE < 80",
                "mains.F.y <= mains.B.y",
                "Math.abs(mains.E.y - mains.G.y) !== 0",
                "Math.abs(mains.C.y - mains.E.y) !== 0",
                "(deltasTMain.FGtime / deltasTMain.BGtime) * 100 > 1.2"
              ],
              status: "continuation"
            },
            {
              validate: [
                "positionsMain.E_vs_CG === 'below' || positionsMain.E_vs_CG === 'on' || positionsMain.E_vs_CG === 'above'",
                "positionsMain.D_vs_BF === 'below' || positionsMain.D_vs_BF === 'on'",
                "mains.E.x > rangesMain.Tmin",
                "mains.E.y > rangesMain.Pmin",
                "ratiosMain.ratioHIOverDE < 80",
                "mains.H.y > mains.F.y",
                "mains.F.y <= mains.B.y",
                "Math.abs(mains.E.y - mains.G.y) !== 0",
                "Math.abs(mains.C.y - mains.E.y) !== 0",
                "(deltasTMain.FGtime / deltasTMain.BGtime) * 100 > 1.2"
              ],
              status: "continuation"
            },
            {
              validate: [
                [
                  "(positionsMain.E_vs_CG === 'above' && positionsMain.D_vs_BF === 'above')",
                  "(positionsMain.E_vs_CG === 'below' && positionsMain.D_vs_BF === 'below' && mains.E.y < rangesMain.Pmin && ratiosMain.ratioFGOverBC > 75)"
                ]
              ],
              status: "reversal"
            }
          ]
        }
      ]
    },

    // ---------- UP ----------
    {
      key: "up",
      validate: ["mains.D.y > mains.B.y"],
      subs: [
        // 010: DE ≤ BC, F ≤ D
        {
          code: "010",
          validate: [
            "segmentsMain.DE.value <= segmentsMain.BC.value",
            "mains.F.y <= mains.D.y"
          ],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below'",
                ["positionsMain.D_vs_BF === 'below'", "positionsMain.D_vs_BF === 'on'"]
              ],
              status: "continuation"
            },
            {
              validate: [
                "positionsMain.E_vs_CG === 'above'",
                "positionsMain.D_vs_BF === 'above'",
                "ratiosMain.ratioBEOverBC < 10",
                "mains.D.x < rangesMain.Tmin"
              ],
              status: "reversal"
            }
          ]
        },
        // 011: DE ≤ BC, F > D
        {
          code: "011",
          validate: [
            "segmentsMain.DE.value <= segmentsMain.BC.value",
            "mains.F.y > mains.D.y"
          ],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below' || positionsMain.E_vs_CG === 'on'",
                "positionsMain.D_vs_BF === 'below'",
                "ratiosMain.ratioFGOverBC > 33.3",
                "ratiosMain.ratioDGOverDE < 40",
                "mains.E.x > rangesMain.Tmin",
                "mains.E.y > rangesMain.Pmin",
                "(deltasTMain.FGtime / deltasTMain.BGtime) * 100 > 1.9"
              ],
              status: "continuation"
            },
            {
              validate: [
                "positionsMain.E_vs_CG === 'below' || positionsMain.E_vs_CG === 'on'",
                "positionsMain.D_vs_BF === 'below'",
                "ratiosMain.ratioFGOverBC > 33.3",
                "ratiosMain.ratioDIOverDE < 40",
                "mains.E.x > rangesMain.Tmin",
                "mains.E.y > rangesMain.Pmin",
                "mains.H.y > mains.F.y",
                "(deltasTMain.FGtime / deltasTMain.BGtime) * 100 > 1.9"
              ],
              status: "continuation"
            },
            {
              validate: [
                "positionsMain.E_vs_CG === 'above' || positionsMain.E_vs_CG === 'on'",
                "positionsMain.D_vs_BF === 'above'",
                "ratiosMain.ratioFGOverBC > 37",
                "ratiosMain.ratioDIOverDE < 70",
                "mains.H.y > mains.F.y"
              ],
              status: "continuation"
            },
            {
              validate: [
                ["positionsMain.E_vs_CG === 'on'", "positionsMain.E_vs_CG === 'above'"],
                "positionsMain.D_vs_BF === 'above'",
                "mains.D.x < rangesMain.Tmin",
                "mains.H.y < mains.F.y"
              ],
              status: "reversal"
            }
          ]
        },
        // 110: DE > BC, F ≤ D
        {
          code: "110",
          validate: [
            "segmentsMain.DE.value > segmentsMain.BC.value",
            "mains.F.y <= mains.D.y"
          ],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below'",
                ["positionsMain.D_vs_BF === 'below'", "positionsMain.D_vs_BF === 'on'"]
              ],
              status: "continuation"
            },
            {
              validate: [
                ["positionsMain.E_vs_CG === 'on'", "positionsMain.E_vs_CG === 'above'"],
                "positionsMain.D_vs_BF === 'above'"
              ],
              status: "reversal"
            }
          ]
        },
        // 111: DE > BC, F > D
        {
          code: "111",
          validate: [
            "segmentsMain.DE.value > segmentsMain.BC.value",
            "mains.F.y > mains.D.y"
          ],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below'",
                ["positionsMain.D_vs_BF === 'below'", "positionsMain.D_vs_BF === 'on'"]
              ],
              status: "continuation"
            },
            {
              validate: [
                ["positionsMain.E_vs_CG === 'on'", "positionsMain.E_vs_CG === 'above'"],
                "positionsMain.D_vs_BF === 'above'"
              ],
              status: "reversal"
            }
          ]
        }
      ]
    },

    // ---------- DOWN ----------
    {
      key: "down",
      validate: [
        "segmentsMain.DE.value <= segmentsMain.BC.value",
        "mains.E.y <= mains.C.y"
      ],
      subs: [
        // 100: F ≤ D
        {
          code: "100",
          validate: ["mains.F.y <= mains.D.y"],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below'",
                ["positionsMain.D_vs_BF === 'below'", "positionsMain.D_vs_BF === 'on'"]
              ],
              status: "continuation"
            },
            {
              validate: [
                ["positionsMain.E_vs_CG === 'on'", "positionsMain.E_vs_CG === 'above'"],
                "positionsMain.D_vs_BF === 'above'"
              ],
              status: "reversal"
            }
          ]
        },
        // 101: F > D
        {
          code: "101",
          validate: ["mains.F.y > mains.D.y"],
          steps: [
            {
              validate: [
                "positionsMain.E_vs_CG === 'below'",
                ["positionsMain.D_vs_BF === 'below'", "positionsMain.D_vs_BF === 'on'"]
              ],
              status: "continuation"
            },
            {
              validate: [
                ["positionsMain.E_vs_CG === 'on'", "positionsMain.E_vs_CG === 'above'"],
                "positionsMain.D_vs_BF === 'above'"
              ],
              status: "reversal"
            }
          ]
        }
      ]
    }
  ]
};
