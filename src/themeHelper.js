import tinycolor from "tinycolor2";
export const DEFAULT_THEME = { appBg: '#bfdbfe', sidebarBg: '#ffffff', componentBg: '#ffffff', accentColor: '#3b82f6', textColor: '#000000', borderColor: '#000000', shadowColor: '#000000' };
const COLOR_MAP = {
    'hường': '#fb7185', 'hồng': '#fb7185', 'đỏ': '#ef4444', 'xanh': '#3b82f6', 'xanh lá': '#22c55e', 'xanh dương': '#3b82f6', 'xanh biển': '#0ea5e9', 'cam': '#f97316', 'vàng': '#facc15', 'tím': '#a855f7', 'đen': '#18181b', 'trắng': '#ffffff', 'xám': '#94a3b8', 'mộng mơ': '#d8b4fe', 'ngầu': '#111827', 'tối': 'dark', 'sáng': 'light', 'matrix': 'matrix'
};
export const generateTheme = (inputColor) => {
    if (!inputColor) return DEFAULT_THEME;
    let colorKey = String(inputColor).toLowerCase().trim();
    if (['default', 'reset', 'mặc định'].includes(colorKey)) return DEFAULT_THEME;
    if (colorKey === 'matrix') return { appBg: '#000000', sidebarBg: '#001100', componentBg: '#002200', accentColor: '#00ff00', textColor: '#00ff00', borderColor: '#00ff00', shadowColor: '#004400' };
    const vietKeys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
    for (const key of vietKeys) { if (colorKey.includes(key)) { colorKey = COLOR_MAP[key]; break; } }
    const base = tinycolor(colorKey);
    if (!base.isValid()) return DEFAULT_THEME;
    const isDark = base.isDark();
    if (isDark) return { appBg: base.clone().darken(10).toString(), sidebarBg: base.clone().darken(5).toString(), componentBg: base.clone().lighten(5).toString(), accentColor: base.clone().lighten(20).saturate(20).toString(), textColor: '#ffffff', borderColor: '#ffffff', shadowColor: 'rgba(255,255,255,0.2)' };
    else return { appBg: base.clone().lighten(30).toString(), sidebarBg: '#ffffff', componentBg: '#ffffff', accentColor: base.clone().saturate(30).toString(), textColor: '#000000', borderColor: '#000000', shadowColor: '#000000' };
};