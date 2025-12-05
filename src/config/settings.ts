// API & Socket settings
export const REFRESH_API_URL = 'https://spwapidatafeed.vps.com.vn/getpschartintraday/VN30F1M';
export const SOCKET_URL = 'https://bgdatafeed.vps.com.vn';
export const SOCKET_PATH = '/socket.io';
export const CHANNEL_NAME = 'stockps';
export const SYMBOL = 'VN30F2512';
export const SYMBOL_ID = 3220;

// Time offset (VN = +7h)
export const CHART_TIME_OFFSET_SEC = 7 * 3600; // 25200

// Wave Profiles for validation
export const waveProfiles = {
  rule_10: {
    ratioBCOverAB: { min: 25, max: 80 },
    ratioDEOverCD: { min: 62, max: 72 },
    ratioFGOverEF: { min: 49, max: 92 },
    ratioEFOverDE: { min: 72, max: 87 },
    ratioCDOverBC: { min: 128, max: 140 },
    ratioDEOverBC: { min: 81, max: 98 },
    ratioFGOverDE: { min: 39, max: 77 },
    ratioFGOverBC: { min: 39, max: 77 }
  },
  rule_11: {
    ratioBCOverAB: { min: 25, max: 80 },
    ratioDEOverCD: { min: 32, max: 68 },
    ratioFGOverEF: { min: 35, max: 46.60 },
    ratioEFOverDE: { min: 127.70, max: 158 },
    ratioCDOverBC: { min: 120, max: 162 },
    ratioDEOverBC: { min: 38, max: 91 },
    ratioFGOverDE: { min: 50, max: 74 }
  },
  rule_11_3nen: {
    ratioBCOverAB: { min: 25, max: 80 },
    ratioDEOverCD: { min: 39, max: 73 },
    ratioFGOverEF: { min: 32, max: 52 },
    ratioEFOverDE: { min: 186, max: 264 },
    ratioCDOverBC: { min: 120, max: 167 },
    ratioDEOverBC: { min: 56, max: 90 },
    ratioFGOverDE: { min: 62, max: 96 }
  }
};

// Chart display settings
export const chartSettings = {
  Tmin: 40,
  Tmax: 98,
  showTmin: false,
  showTmax: false,
  Pmin: 15,
  Pmax: 93,
  showPmin: false,
  showPmax: false,
  showPriceLineAll: true,
  showVerticalLinesAll: false,
  showEndVLine: true
};

// Colors
export const colors = {
  main: '#17e540',
  prime: '#f80505',
  stop: '#f5e72b'
};

// Core Validation settings
export const coreValidationSettings = {
  deltaT: 600,  // Thời gian B→G tối thiểu (giây) = 10 phút
  deltaB: 2,    // Biên độ BC tối thiểu (giá)
  priceEpsilon: 0.05  // Tolerance cho position "on"
};

// Lunch break settings
export const lunchBreakSettings = {
  start: '11:30:00',
  end: '13:00:00'
};
