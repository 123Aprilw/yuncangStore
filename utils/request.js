/**
 * 云仓商城请求封装
 * 对接 FastAdmin /api 模块，Token 放在 header: token
 */
// The HBuilderX preview server runs on localhost:5173 and has no PHP API.
// Always use the FastAdmin site served by phpStudy for API requests.
const DEFAULT_BASE = 'https://yuncang.xunhexi.com'

export function getBaseUrl() {
	return DEFAULT_BASE
}

export function getUploadUrl() {
	return getBaseUrl() + '/api/common/upload'
}

function getToken() {
	try {
		return uni.getStorageSync('token') || ''
	} catch (e) {
		return ''
	}
}

export function setToken(token) {
	uni.setStorageSync('token', token || '')
}

export function setApiBase(url) {
	uni.setStorageSync('API_BASE', url || '')
}

function currentRoute() {
	try {
		const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
		const page = pages.length ? pages[pages.length - 1] : null
		return page ? String(page.route || '') : ''
	} catch (e) {
		return ''
	}
}

/** 仅在发起请求的页面仍前台时提示，避免返回后错误 toast 落到上一页 */
export function isActiveRoute(startRoute) {
	if (!startRoute) return true
	return currentRoute() === startRoute
}

export function getCurrentRoute() {
	return currentRoute()
}

export function request(options = {}) {
	const { url, method = 'GET', data = {}, header = {}, loading = false, auth = true, silent = false } = options
	const startRoute = currentRoute()
	if (loading) {
		uni.showLoading({ title: '加载中', mask: true })
	}
	return new Promise((resolve, reject) => {
		uni.request({
			url: getBaseUrl() + url,
			method,
			data,
			header: {
				'Content-Type': 'application/json',
				token: auth ? getToken() : '',
				...header
			},
			success: (res) => {
				const httpOk = res.statusCode >= 200 && res.statusCode < 300
				const body = (res.data && typeof res.data === 'object') ? res.data : {}
				// FastAdmin: code=1 成功
				if (httpOk && body.code === 1) {
					resolve(body.data)
					return
				}
				const msg = String(body.msg || (httpOk ? '请求失败' : '服务暂不可用'))
				const needLogin = body.code === 401 || res.statusCode === 401 || /请先登录|登录失效|token\s*无效|token\s*过期/i.test(msg)
				const canToast = !silent && (needLogin || isActiveRoute(startRoute))
				const toastDone = canToast
					? Promise.resolve(uni.showToast({ title: msg, icon: 'none', duration: 2500 }))
					: Promise.resolve()
				// 已在登录页时不要 reLaunch；提示关闭后再跳转，避免弹窗画到别的页
				const route = currentRoute()
				const onLoginPage = /pages\/index\/index$/.test(route)
				if (needLogin && !onLoginPage) {
					toastDone.finally(() => {
						uni.reLaunch({ url: '/pages/index/index' })
					})
				}
				reject(body.code != null ? body : { code: res.statusCode || 0, msg })
			},
			fail: (err) => {
				if (!silent && isActiveRoute(startRoute)) {
					uni.showToast({ title: '网络异常', icon: 'none' })
				}
				reject(err)
			},
			complete: () => {
				if (loading) uni.hideLoading()
			}
		})
	})
}

export const get = (url, data, opts = {}) => request({ url, method: 'GET', data, ...opts })
export const post = (url, data, opts = {}) => request({ url, method: 'POST', data, ...opts })
