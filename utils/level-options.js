/**
 * 从后端 levels 构建筛选项（名称与 yc_level.title 一致）
 * @param {Array<{level?:number,title?:string,value?:number,label?:string}>} levels
 * @returns {Array<{value:number,label:string}>}
 */
export function buildLevelFilterOptions(levels) {
  const options = [{ value: 0, label: '全部' }]
  const list = Array.isArray(levels) ? levels : []
  list.forEach((item) => {
    if (!item) return
    const value = Number(item.level != null ? item.level : item.value)
    const label = String(item.title || item.label || '').trim()
    if (!Number.isFinite(value) || value <= 0 || !label) return
    options.push({ value, label })
  })
  return options
}

export function applyLevelsToOptions(target, levels) {
  const next = buildLevelFilterOptions(levels)
  if (next.length > 1) {
    target.splice(0, target.length, ...next)
  }
  return target
}
