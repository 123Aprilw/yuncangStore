/**
 * 等级标签颜色：优先接口 color，否则按星级回退
 */
const LEVEL_COLOR_FALLBACK = {
  1: '#27c7eb',
  2: '#ff6b3b',
  3: '#9545e7',
  4: '#e11d48'
}

function normalizeHex(color) {
  const value = String(color || '').trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
    if (value.length === 4) {
      return ('#' + value[1] + value[1] + value[2] + value[2] + value[3] + value[3]).toLowerCase()
    }
    return value.toLowerCase()
  }
  return ''
}

function hexToRgba(hex, alpha) {
  const color = normalizeHex(hex)
  if (!color) {
    return 'rgba(0,0,0,' + alpha + ')'
  }
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
}

export function resolveLevelColor(color, level) {
  return normalizeHex(color) || LEVEL_COLOR_FALLBACK[Number(level)] || '#999999'
}

export function levelTagStyle(color, level) {
  const hex = resolveLevelColor(color, level)
  return {
    color: hex,
    background: hexToRgba(hex, 0.12)
  }
}
