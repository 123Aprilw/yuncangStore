const hosts = []

let nativeToast = null
let nativeHideToast = null
let nativeModal = null
let nativeLoading = null
let nativeHideLoading = null
let confirmBlocking = false
let navGuardInstalled = false
const nativeNav = {}

export function bindNativeDialogApis(apis = {}) {
	nativeToast = apis.showToast || nativeToast
	nativeHideToast = apis.hideToast || nativeHideToast
	nativeModal = apis.showModal || nativeModal
	nativeLoading = apis.showLoading || nativeLoading
	nativeHideLoading = apis.hideLoading || nativeHideLoading
}

function getTopPage() {
	try {
		const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
		return pages.length ? pages[pages.length - 1] : null
	} catch (e) {
		return null
	}
}

/** 只认栈顶页弹窗，禁止回落到上一页 host（否则提示会画到分销中心等底层页） */
function currentHost() {
	const page = getTopPage()
	if (page && page.__appDialogVm && typeof page.__appDialogVm.showConfirm === 'function') {
		return page.__appDialogVm
	}
	return null
}

/** 收起所有自定义提示 + 原生 toast，避免跨页残留 */
export function dismissAllToasts() {
	hosts.forEach((host) => {
		if (host && typeof host.dismissToast === 'function') host.dismissToast()
	})
	const page = getTopPage()
	if (page && page.__appDialogVm && typeof page.__appDialogVm.dismissToast === 'function') {
		page.__appDialogVm.dismissToast()
	}
	if (typeof nativeHideToast === 'function') {
		try { nativeHideToast() } catch (e) {}
	}
}

export function setDialogHost(instance) {
	if (!instance) return
	const page = getTopPage()
	if (page) page.__appDialogVm = instance
	const index = hosts.indexOf(instance)
	if (index >= 0) hosts.splice(index, 1)
	hosts.push(instance)
}

export function clearDialogHost(instance) {
	if (!instance) return
	const index = hosts.indexOf(instance)
	if (index >= 0) hosts.splice(index, 1)
	try {
		const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
		pages.forEach(page => {
			if (page && page.__appDialogVm === instance) page.__appDialogVm = null
		})
	} catch (e) {}
}

export function setConfirmBlocking(blocking) {
	confirmBlocking = !!blocking
}

export function isConfirmBlocking() {
	return confirmBlocking
}

function hintNavBlocked() {
	if (nativeToast) {
		nativeToast({ title: '请先处理当前弹窗', icon: 'none', duration: 1500 })
	}
}

/** 确认弹窗未关闭前，禁止切换页面 */
export function installNavigationGuard() {
	if (navGuardInstalled) return
	navGuardInstalled = true
	;['navigateTo', 'redirectTo', 'reLaunch', 'switchTab', 'navigateBack'].forEach(name => {
		if (typeof uni[name] !== 'function') return
		nativeNav[name] = uni[name].bind(uni)
		uni[name] = (options = {}) => {
			if (confirmBlocking) {
				hintNavBlocked()
				if (typeof options.fail === 'function') {
					options.fail({ errMsg: `${name}:fail confirm dialog open` })
				}
				return
			}
			return nativeNav[name](options)
		}
	})
}

export function toast(message, type = 'error', duration = 2200) {
	const text = String(message || '')
	if (!text) return Promise.resolve()
	const host = currentHost()
	if (host) {
		return new Promise(resolve => {
			host.showToast(text, type, duration, resolve)
		})
	}
	if (nativeToast) {
		nativeToast({ title: text, icon: type === 'success' ? 'success' : 'none', duration })
		return new Promise(resolve => setTimeout(resolve, duration))
	}
	return Promise.resolve()
}

export function loading(message = '加载中') {
	const host = currentHost()
	if (host) {
		host.showLoading(message)
		return
	}
	if (nativeLoading) nativeLoading({ title: message, mask: true })
}

export function hideLoading() {
	const host = currentHost()
	if (host) {
		host.hideLoading()
		return
	}
	if (nativeHideLoading) nativeHideLoading()
}

export function confirm(options = {}) {
	return new Promise(resolve => {
		const host = currentHost()
		if (host) {
			host.showConfirm(options, resolve)
			return
		}
		if (nativeModal) {
			nativeModal({
				title: options.title || '提示',
				content: options.content || '',
				showCancel: options.showCancel !== false,
				cancelText: options.cancelText || '取消',
				confirmText: options.confirmText || '确定',
				success: (res) => resolve(!!res.confirm),
				fail: () => resolve(false)
			})
			return
		}
		resolve(false)
	})
}
