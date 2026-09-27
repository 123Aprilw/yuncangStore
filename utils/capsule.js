/**
 * 微信小程序胶囊按钮对齐布局。
 * 标题/返回键应与胶囊同一行并垂直居中。
 */
const FALLBACK = {
	statusBarHeight: 20,
	navBarHeight: 64,
	capsuleTop: 26,
	capsuleHeight: 32,
	capsuleWidth: 87,
	capsuleRight: 10
}

let cached = null

export function getCapsuleLayout(force = false) {
	if (cached && !force) return { ...cached }

	const layout = { ...FALLBACK }
	try {
		const sys = uni.getSystemInfoSync() || {}
		const statusBarHeight = Number(sys.statusBarHeight) || FALLBACK.statusBarHeight
		layout.statusBarHeight = statusBarHeight

		// #ifdef MP-WEIXIN
		const capsule = uni.getMenuButtonBoundingClientRect && uni.getMenuButtonBoundingClientRect()
		if (capsule && capsule.height) {
			const gap = Math.max(0, capsule.top - statusBarHeight)
			layout.capsuleTop = capsule.top
			layout.capsuleHeight = capsule.height
			layout.capsuleWidth = capsule.width
			layout.capsuleRight = Math.max(0, (sys.windowWidth || 375) - capsule.right)
			// 标准公式：状态栏 + 胶囊上下间距对称
			layout.navBarHeight = statusBarHeight + gap * 2 + capsule.height
			cached = { ...layout }
			return layout
		}
		// #endif

		layout.navBarHeight = statusBarHeight + 44
		layout.capsuleTop = statusBarHeight + 6
		layout.capsuleHeight = 32
	} catch (e) {}

	cached = { ...layout }
	return layout
}

/** px → rpx（750 设计宽） */
export function pxToRpx(px) {
	const sys = uni.getSystemInfoSync() || {}
	const width = Number(sys.windowWidth) || 375
	return (Number(px) || 0) * 750 / width
}

/** 供 style 绑定的 px 字符串 */
export function capsuleStyleVars(layout) {
	const L = layout || getCapsuleLayout()
	return {
		navHeight: L.navBarHeight + 'px',
		capsuleTop: L.capsuleTop + 'px',
		capsuleSize: L.capsuleHeight + 'px',
		contentTop: L.navBarHeight + 'px'
	}
}
