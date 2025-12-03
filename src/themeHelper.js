import tinycolor from "tinycolor2";
export const DEFAULT_THEME = { appBg: '#bfdbfe', sidebarBg: '#ffffff', componentBg: '#ffffff', accentColor: '#3b82f6', textColor: '#000000', borderColor: '#000000', shadowColor: '#000000' };
const COLOR_MAP = {
    'hường': '#fb7185', 'hồng': '#fb7185', 'hồng cánh sen': '#ec4899', 'hồng phấn': '#fce7f3',
    'đỏ': '#ef4444', 'đỏ tươi': '#f87171', 'đỏ đô': '#991b1b', 'đỏ gạch': '#b91c1c',
    'xanh': '#3b82f6', 'xanh dương': '#3b82f6', 'xanh biển': '#0ea5e9', 'xanh trời': '#0ea5e9',
    'xanh lá': '#22c55e', 'xanh lục': '#22c55e', 'xanh ngọc': '#14b8a6', 'xanh rêu': '#3f6212',
    'cam': '#f97316', 'cam đất': '#c2410c',
    'vàng': '#eab308', 'vàng chanh': '#fef08a', 'vàng đồng': '#854d0e',
    'tím': '#a855f7', 'tím than': '#4c1d95', 'tím mộng mơ': '#d8b4fe', 'mộng mơ': '#d8b4fe',
    'đen': '#18181b', 'đen tuyền': '#000000', 'ngầu': '#111827',
    'trắng': '#ffffff', 'trắng tinh': '#ffffff', 'kem': '#fff7ed',
    'xám': '#64748b', 'ghi': '#94a3b8', 'bạc': '#cbd5e1',
    'nâu': '#78350f', 'nâu đất': '#451a03',
    'tối': 'dark', 'sáng': 'light', 'matrix': 'matrix'
};
export const generateTheme = (inputColor) => {
    let colorKey = inputColor.toLowerCase().trim();
    if (['default', 'reset', 'mặc định', 'bình thường'].includes(colorKey)) return DEFAULT_THEME;
    if (colorKey === 'matrix') return { appBg: '#000000', sidebarBg: '#001100', componentBg: '#002200', accentColor: '#00ff00', textColor: '#00ff00', borderColor: '#00ff00', shadowColor: '#004400' };
    const vietKeys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
    for (const key of vietKeys) { if (colorKey.includes(key)) { colorKey = COLOR_MAP[key]; break; } }
    const base = tinycolor(colorKey);
    if (!base.isValid()) return DEFAULT_THEME;
    const isDark = base.isDark();
    if (isDark) return { appBg: base.clone().darken(10).toString(), sidebarBg: base.clone().darken(5).toString(), componentBg: base.clone().lighten(5).toString(), accentColor: base.clone().lighten(20).saturate(20).toString(), textColor: '#ffffff', borderColor: '#ffffff', shadowColor: 'rgba(255,255,255,0.2)' };
    else return { appBg: base.clone().lighten(30).toString(), sidebarBg: '#ffffff', componentBg: '#ffffff', accentColor: base.clone().saturate(30).toString(), textColor: '#000000', borderColor: '#000000', shadowColor: '#000000' };
};