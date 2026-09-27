/**
 * 有历史栈则返回上一页；否则跳转到兜底页，避免返回键失效。
 * @param {string} [fallback='/pages/workbench/warehouse-opened']
 */
export function navigateBack(fallback = '/pages/workbench/warehouse-opened') {
	const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
	if (pages && pages.length > 1) {
		uni.navigateBack({
			delta: 1,
			fail: () => uni.reLaunch({ url: fallback })
		})
		return
	}
	uni.reLaunch({ url: fallback })
}
