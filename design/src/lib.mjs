// NURU design generator: shared tokens, icons and UI building blocks.
// Each screen is plain HTML/CSS so it can be pushed to Figma and reused as a
// reference when building the React and React Native apps.

export const tokens = {
  light: {
    bg: '#FFFFFF', surface: '#F7F7F8', surface2: '#EFEFF2', border: '#E6E6EA',
    text: '#141416', text2: '#55555F', muted: '#8C8C97',
    red: '#E30613', red600: '#B8000F', red50: '#FFF1F2', red100: '#FFE1E3',
    green: '#15803D', green50: '#ECFDF3', amber: '#B45309', amber50: '#FFF7E6',
    blue: '#1D4ED8', blue50: '#EEF4FF', ink: '#141416', onRed: '#FFFFFF',
    shadow: '0 1px 2px rgba(20,20,22,.06), 0 8px 24px rgba(20,20,22,.06)',
  },
  dark: {
    bg: '#0D0D0F', surface: '#17171A', surface2: '#202024', border: '#2B2B31',
    text: '#F5F5F7', text2: '#B3B3BD', muted: '#7B7B87',
    red: '#FF2E3E', red600: '#E30613', red50: '#2A1013', red100: '#3D1418',
    green: '#4ADE80', green50: '#0F2A1A', amber: '#FBBF24', amber50: '#2B220C',
    blue: '#7AA2FF', blue50: '#121C33', ink: '#F5F5F7', onRed: '#FFFFFF',
    shadow: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35)',
  },
};

// Category palette for charts: red-led, with neutral companions so the brand
// stays red and white while categories remain distinguishable.
export const cat = ['#E30613', '#3F3F46', '#FB7185', '#F59E0B', '#94A3B8', '#14B8A6', '#7C3AED'];

const P = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16V7"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  wallet: '<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  landmark: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 8 5H4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  shieldcheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M6.5 17A2.5 2.5 0 0 0 4 19.5 2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M7 17 17 7M7 7h10v10"/>',
  down: '<path d="M17 7 7 17M17 17H7V7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><path d="m3 3 18 18"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  fingerprint: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .13-5.35 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  scanface: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
  chevr: '<path d="m9 18 6-6-6-6"/>',
  chevl: '<path d="m15 18-6-6 6-6"/>',
  chevd: '<path d="m6 9 6 6 6-6"/>',
  panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  trendup: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  trenddown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  sparkles: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 3v4M17 5h4"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  exchange: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  package: '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  car: '<path d="M19 17h2v-4l-2-5H5L3 13v4h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  wifi: '<path d="M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0M12 20h.01"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  grad: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><path d="m17 2-5 5-5-5"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  umbrella: '<path d="M22 12a10.06 10.06 1 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0M12 2v1"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  play: '<path d="m6 3 14 9-14 9V3z"/>',
  pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
  thumbup: '<path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
  laptop: '<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
};

export const icon = (name, size = 20, color = 'currentColor', sw = 2) =>
  `<svg data-i="${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${P[name] || P.info}</svg>`;

export const iconNames = Object.keys(P);
export const iconPaths = P;

// ---------- money helpers ----------
export const naira = (n, dp = 0) =>
  '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: dp, maximumFractionDigits: dp });

// ---------- base CSS ----------
const themeVars = (t) => Object.entries(t).map(([k, v]) => `--${k}:${v};`).join('');

export const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;background:#D9D9DE;display:flex;flex-wrap:wrap;gap:80px;padding:80px;align-items:flex-start;-webkit-font-smoothing:antialiased}
.light{${themeVars(tokens.light)}}
.dark{${themeVars(tokens.dark)}}
.screen{background:var(--bg);color:var(--text);position:relative;overflow:hidden;display:flex;flex-direction:column}
.m{width:390px;height:844px;border-radius:0}
.w{width:1440px;min-height:900px}
.row{display:flex;flex-direction:row;align-items:center}
.col{display:flex;flex-direction:column}
.between{justify-content:space-between}
.center{justify-content:center;align-items:center}
.wrap{flex-wrap:wrap}
.grow{flex:1}
.g4{gap:4px}.g6{gap:6px}.g8{gap:8px}.g10{gap:10px}.g12{gap:12px}.g16{gap:16px}.g20{gap:20px}.g24{gap:24px}.g32{gap:32px}.g40{gap:40px}.g48{gap:48px}
.p16{padding:16px}.p20{padding:20px}.p24{padding:24px}.px20{padding-left:20px;padding-right:20px}
.h1{font-size:28px;line-height:34px;font-weight:700;letter-spacing:-.5px}
.h2{font-size:22px;line-height:28px;font-weight:700;letter-spacing:-.3px}
.h3{font-size:17px;line-height:22px;font-weight:600}
.h4{font-size:15px;line-height:20px;font-weight:600}
.b{font-size:15px;line-height:22px}
.s{font-size:13px;line-height:18px}
.xs{font-size:11px;line-height:14px}
.num{font-variant-numeric:tabular-nums;letter-spacing:-.3px}
.t2{color:var(--text2)}.mu{color:var(--muted)}.rd{color:var(--red)}.gr{color:var(--green)}.am{color:var(--amber)}
.w6{font-weight:600}.w7{font-weight:700}.w5{font-weight:500}
.card{background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:16px;box-shadow:var(--shadow)}
.dark .card{background:var(--surface)}
.soft{background:var(--surface);border-radius:16px;padding:14px}
.btn{height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:16px;padding:0 20px}
.btn.pri{background:var(--red);color:var(--onRed)}
.btn.sec{background:var(--surface2);color:var(--text)}
.btn.out{border:1.5px solid var(--border);color:var(--text)}
.btn.ghost{color:var(--red)}
.btn.sm{height:36px;font-size:13px;border-radius:10px;padding:0 14px}
.chip{white-space:nowrap;height:32px;padding:0 12px;border-radius:999px;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;background:var(--surface);color:var(--text2);border:1px solid var(--border)}
.chip.on{background:var(--red);color:#fff;border-color:var(--red)}
.chip.ink{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.field{display:flex;flex-direction:column;gap:6px}
.label{font-size:13px;font-weight:500;color:var(--text2)}
.input{height:52px;border-radius:14px;border:1.5px solid var(--border);background:var(--bg);display:flex;align-items:center;gap:10px;padding:0 14px;font-size:15px;color:var(--text)}
.dark .input{background:var(--surface)}
.input.focus{border-color:var(--red);box-shadow:0 0 0 4px var(--red50)}
.input .ph{color:var(--muted)}
.ib{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--text)}
.ic{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex:none}
.ic.red{background:var(--red50);color:var(--red)}
.ic.gray{background:var(--surface2);color:var(--text)}
.ic.green{background:var(--green50);color:var(--green)}
.ic.amber{background:var(--amber50);color:var(--amber)}
.ic.blue{background:var(--blue50);color:var(--blue)}
.badge{height:22px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:4px}
.badge.red{background:var(--red50);color:var(--red)}
.badge.green{background:var(--green50);color:var(--green)}
.badge.amber{background:var(--amber50);color:var(--amber)}
.badge.gray{background:var(--surface2);color:var(--text2)}
.badge.blue{background:var(--blue50);color:var(--blue)}
.div{height:1px;background:var(--border);width:100%}
.av{width:40px;height:40px;border-radius:999px;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex:none}
.hero{background:linear-gradient(135deg,#E30613 0%,#A3000D 100%);color:#fff;border-radius:24px;padding:20px;position:relative;overflow:hidden}
.dark .hero{background:linear-gradient(135deg,#C2000F 0%,#5C0008 100%)}
.status{height:47px;display:flex;align-items:center;justify-content:space-between;padding:0 28px 0 32px;font-size:16px;font-weight:600;flex:none}
.homeind{position:absolute;bottom:8px;left:50%;margin-left:-67px;width:134px;height:5px;border-radius:3px;background:var(--text)}
.tabbar{position:absolute;left:0;right:0;bottom:0;height:86px;background:var(--bg);border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:10px 8px 0}
.dark .tabbar{background:var(--surface)}
.tab{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-weight:500;color:var(--muted);width:64px}
.tab.on{color:var(--red)}
.fab{width:56px;height:56px;border-radius:18px;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;margin-top:-22px;box-shadow:0 8px 20px rgba(227,6,19,.35)}
.body{flex:1;display:flex;flex-direction:column;padding:8px 20px 0;gap:16px;overflow:hidden}
.toggle{width:44px;height:26px;border-radius:999px;background:var(--surface2);padding:3px;display:flex;flex:none}
.toggle.on{background:var(--red);justify-content:flex-end}
.toggle i{width:20px;height:20px;border-radius:999px;background:#fff;display:block;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.bar{height:8px;border-radius:999px;background:var(--surface2);overflow:hidden;display:flex}
.bar i{display:block;height:100%;background:var(--red);border-radius:999px}
.sheet{position:absolute;left:0;right:0;bottom:0;background:var(--bg);border-radius:28px 28px 0 0;padding:12px 20px 34px;display:flex;flex-direction:column;gap:16px;box-shadow:0 -10px 40px rgba(0,0,0,.18)}
.dark .sheet{background:var(--surface)}
.grab{width:40px;height:5px;border-radius:3px;background:var(--border);align-self:center}
.scrim{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.pinbox{width:52px;height:60px;border-radius:14px;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700}
.pinbox.on{border-color:var(--red);box-shadow:0 0 0 4px var(--red50)}
.dot{width:14px;height:14px;border-radius:999px;background:var(--surface2)}
.dot.on{background:var(--red)}
.key{height:58px;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:500;border-radius:16px;flex:1}
.bubble{max-width:290px;padding:12px 14px;border-radius:18px;font-size:14px;line-height:20px}
.bubble.me{background:var(--red);color:#fff;border-bottom-right-radius:6px;align-self:flex-end}
.bubble.ai{background:var(--surface);color:var(--text);border-bottom-left-radius:6px;align-self:flex-start}
.dark .bubble.ai{background:var(--surface2)}
.logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:20px;letter-spacing:-.5px}
.mark{width:32px;height:32px;border-radius:10px;background:var(--red);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px}
.tbl{width:100%;border-collapse:collapse;font-size:13px}
.tbl th{text-align:left;color:var(--muted);font-weight:500;padding:10px 12px;border-bottom:1px solid var(--border)}
.tbl td{padding:12px;border-bottom:1px solid var(--border)}
.seg{display:flex;background:var(--surface);border-radius:12px;padding:4px;gap:4px}
.seg span{flex:1;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:var(--text2)}
.seg span.on{background:var(--bg);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.1);font-weight:600}
.dark .seg span.on{background:var(--surface2)}
.sec-title{display:flex;justify-content:space-between;align-items:center}
.sec-title a{font-size:13px;color:var(--red);font-weight:600;text-decoration:none}
.note{position:absolute;top:0;left:0;background:#141416;color:#fff;font-size:11px;padding:3px 8px;border-bottom-right-radius:8px;display:none}
`;

// ---------- chrome ----------
export const status = (light = false) => `<div class="status" ${light ? 'style="color:#fff"' : ''}><span>9:41</span><span class="row g6">${icon('wifi', 16)}<svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor"/><rect x="22.5" y="4" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4"/></svg></span></div>`;

export const home = () => `<div class="homeind"></div>`;

export const tabbar = (active = 'home') => {
  const t = (k, ic, label) => `<div class="tab ${active === k ? 'on' : ''}">${icon(ic, 22)}<span>${label}</span></div>`;
  return `<div class="tabbar">${t('home', 'home', 'Home')}${t('insights', 'chart', 'Insights')}<div class="tab"><div class="fab">${icon('sparkles', 26, '#fff')}</div><span style="color:var(--red);font-weight:600">Ask NURU</span></div>${t('pay', 'send', 'Pay')}${t('more', 'grid', 'More')}</div>`;
};

export const topbar = (title, { back = true, right = '' } = {}) =>
  `<div class="row between px20" style="height:52px;flex:none">${back ? `<div class="ib">${icon('chevl')}</div>` : '<div style="width:40px"></div>'}<div class="h4">${title}</div>${right || '<div style="width:40px"></div>'}</div>`;

export const logo = (size = 32, text = true, color) => `<div class="logo" ${color ? `style="color:${color}"` : ''}><div class="mark" style="width:${size}px;height:${size}px;font-size:${size * 0.56}px;border-radius:${size * 0.3}px">N</div>${text ? '<span>NURU</span>' : ''}</div>`;

export const mobile = (name, theme, inner, { tab = null, statusLight = false, bg = '' } = {}) =>
  `<div class="screen m ${theme}" data-name="${name} / ${theme}" aria-label="${name} / ${theme}" ${bg ? `style="background:${bg}"` : ''}>${status(statusLight)}${inner}${tab ? tabbar(tab) : ''}${home()}</div>`;

export const web = (name, theme, inner, style = '') =>
  `<div class="screen w ${theme}" data-name="${name} / ${theme}" aria-label="${name} / ${theme}" style="${style}">${inner}</div>`;

// SVG presentation attributes can't read CSS variables, so move any var() into a style attribute.
const fixSvg = (html) => html.replace(/<(rect|circle|path|text|line|ellipse)\b([^>]*?)(\/?)>/g, (m, tag, attrs, close) => {
  const styles = [];
  attrs = attrs.replace(/\s(fill|stroke)="(var\([^"]+\))"/g, (_, k, v) => { styles.push(`${k}:${v}`); return ''; });
  return styles.length ? `<${tag}${attrs} style="${styles.join(';')}"${close}>` : m;
});

export const doc = (title, screens) => fixSvg(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${screens.join('\n')}</body></html>`);

// ---------- charts (pure SVG) ----------
export function bars(values, { w = 320, h = 140, labels = [], hi = -1, color = 'var(--red)', base = 'var(--surface2)', rx = 6, gap = 0.38 } = {}) {
  const max = Math.max(...values) * 1.1;
  const n = values.length, bw = (w / n) * (1 - gap);
  let s = `<svg width="${w}" height="${h + 20}" viewBox="0 0 ${w} ${h + 20}">`;
  values.forEach((v, i) => {
    const x = i * (w / n) + (w / n - bw) / 2, bh = Math.max(4, (v / max) * h);
    s += `<rect x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="${rx}" fill="${i === hi || hi === -2 ? color : base}"/>`;
    if (labels[i]) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${h + 15}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Inter">${labels[i]}</text>`;
  });
  return s + '</svg>';
}

export function stacked(series, { w = 320, h = 140, labels = [], colors = cat } = {}) {
  const totals = series[0].map((_, i) => series.reduce((a, s) => a + s[i], 0));
  const max = Math.max(...totals) * 1.1, n = totals.length, bw = (w / n) * 0.55;
  let s = `<svg width="${w}" height="${h + 20}" viewBox="0 0 ${w} ${h + 20}">`;
  totals.forEach((_, i) => {
    const x = i * (w / n) + (w / n - bw) / 2; let y = h;
    series.forEach((ser, k) => { const bh = (ser[i] / max) * h; y -= bh; s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, bh - 2).toFixed(1)}" rx="3" fill="${colors[k]}"/>`; });
    if (labels[i]) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${h + 15}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="Inter">${labels[i]}</text>`;
  });
  return s + '</svg>';
}

export function line(values, { w = 320, h = 120, color = 'var(--red)', fill = true, labels = [], compare = null, dots = false, sw = 2.5 } = {}) {
  const all = compare ? values.concat(compare) : values;
  const max = Math.max(...all) * 1.1, min = Math.min(...all) * 0.85;
  const pt = (v, i, arr) => [(i / (arr.length - 1)) * w, h - ((v - min) / (max - min)) * h];
  const path = (arr) => arr.map((v, i) => { const [x, y] = pt(v, i, arr); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join(' ');
  const id = 'g' + Math.random().toString(36).slice(2, 8);
  const gc = color.startsWith('#') ? color : { 'var(--green)': '#15803D', 'var(--blue)': '#1D4ED8', 'var(--amber)': '#B45309' }[color] || '#E30613';
  let s = `<svg width="${w}" height="${h + (labels.length ? 20 : 4)}" viewBox="0 0 ${w} ${h + (labels.length ? 20 : 4)}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gc}" stop-opacity=".22"/><stop offset="1" stop-color="${gc}" stop-opacity="0"/></linearGradient></defs>`;
  for (let k = 1; k < 4; k++) s += `<line x1="0" x2="${w}" y1="${(h / 4) * k}" y2="${(h / 4) * k}" stroke="var(--border)" stroke-dasharray="3 4"/>`;
  if (compare) s += `<path d="${path(compare)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 5"/>`;
  if (fill) s += `<path d="${path(values)} L${w} ${h} L0 ${h} Z" fill="url(#${id})"/>`;
  s += `<path d="${path(values)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
  if (dots) values.forEach((v, i) => { const [x, y] = pt(v, i, values); s += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--bg)" stroke="${color}" stroke-width="2"/>`; });
  const [lx, ly] = pt(values[values.length - 1], values.length - 1, values);
  s += `<circle cx="${lx}" cy="${ly}" r="5" fill="${color}" stroke="var(--bg)" stroke-width="2.5"/>`;
  labels.forEach((l, i) => { s += `<text x="${((i / (labels.length - 1)) * w).toFixed(1)}" y="${h + 16}" text-anchor="${i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}" font-size="10" fill="var(--muted)" font-family="Inter">${l}</text>`; });
  return s + '</svg>';
}

// Arcs are drawn as paths: Figma's SVG import drops stroke-dashoffset, so dashed circles break.
const arc = (cx, r, a0, a1) => {
  const pt = (a) => [(cx + r * Math.sin(a)).toFixed(2), (cx - r * Math.cos(a)).toFixed(2)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
};

export function donut(values, { size = 150, sw = 20, colors = cat, center = '', sub = '' } = {}) {
  const tot = values.reduce((a, b) => a + b, 0), r = (size - sw) / 2, cx = size / 2, gap = 3 / r;
  let a = 0, s = `<svg class="arc" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="${sw}"/>`;
  values.forEach((v, i) => {
    const sweep = (v / tot) * 2 * Math.PI;
    s += `<path d="${arc(cx, r, a, a + Math.max(0.01, sweep - gap))}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="${sw}"/>`;
    a += sweep;
  });
  if (center) s += `<text x="${cx}" y="${cx + (sub ? 0 : 6)}" text-anchor="middle" font-size="${size > 130 ? 20 : 15}" font-weight="700" fill="var(--text)" font-family="Inter">${center}</text>`;
  if (sub) s += `<text x="${cx}" y="${cx + 18}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Inter">${sub}</text>`;
  return s + '</svg>';
}

export function ring(pct, { size = 64, sw = 7, color = 'var(--red)', label = '' } = {}) {
  const r = (size - sw) / 2, cx = size / 2, end = Math.min(0.9999, pct / 100) * 2 * Math.PI;
  return `<svg class="arc" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="${sw}"/><path d="${arc(cx, r, 0, end)}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/><text x="${cx}" y="${cx + 5}" text-anchor="middle" font-size="${size / 4.4}" font-weight="700" fill="var(--text)" font-family="Inter">${label || pct + '%'}</text></svg>`;
}

export function heat(rows, cols, { cell = 18, gap = 4 } = {}) {
  let s = `<svg width="${cols * (cell + gap)}" height="${rows * (cell + gap)}">`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = (Math.sin(r * 3.1 + c * 1.7) + 1) / 2;
    s += `<rect x="${c * (cell + gap)}" y="${r * (cell + gap)}" width="${cell}" height="${cell}" rx="4" fill="#E30613" fill-opacity="${(0.08 + v * 0.85).toFixed(2)}"/>`;
  }
  return s + '</svg>';
}

// ---------- reusable rows ----------
export const txn = (ic, name, sub, amt, { credit = false, tone = 'gray', badge = '' } = {}) =>
  `<div class="row g12"><div class="ic ${tone}">${icon(ic, 20)}</div><div class="col grow g4"><div class="h4" style="font-size:14px">${name}</div><div class="xs mu">${sub}</div></div><div class="col g4" style="align-items:flex-end"><div class="h4 num ${credit ? 'gr' : ''}" style="font-size:14px">${credit ? '+' : '−'}${amt}</div>${badge}</div></div>`;

export const listRow = (ic, title, sub = '', right = icon('chevr', 18, 'var(--muted)'), tone = 'gray') =>
  `<div class="row g12" style="padding:12px 0"><div class="ic ${tone}" style="width:40px;height:40px;border-radius:12px">${icon(ic, 19)}</div><div class="col grow g4"><div class="h4" style="font-size:15px">${title}</div>${sub ? `<div class="xs mu">${sub}</div>` : ''}</div>${right}</div>`;

export const legend = (items, colors = cat) =>
  `<div class="col g10">${items.map(([l, v, p], i) => `<div class="row g8"><i style="width:10px;height:10px;border-radius:3px;background:${colors[i % colors.length]};display:block;flex:none"></i><span class="s grow">${l}</span><span class="s w6 num">${v}</span>${p ? `<span class="xs mu" style="width:34px;text-align:right">${p}</span>` : ''}</div>`).join('')}</div>`;

export const both = (fn) => [fn('light'), fn('dark')];
