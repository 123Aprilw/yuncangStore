import { get, post, setToken } from '@/utils/request'

/** 登录：手机号验证码 -> /api/user/mobilelogin */
export function mobileLogin(mobile, captcha) {
	return post('/api/user/mobilelogin', { mobile, captcha }, { auth: false }).then((data) => {
		if (data && data.userinfo && data.userinfo.token) {
			setToken(data.userinfo.token)
		}
		return data
	})
}

/** 发送短信：event=mobilelogin|changemobile|bindconsumer */
export function sendSms(mobile, event = 'mobilelogin', opts = {}) {
	// bindconsumer 需登录，服务端会校验是否可绑（已绑定/已有上级等）
	return post('/api/sms/send', { mobile, event }, { auth: event === 'bindconsumer', ...opts })
}

export { get, post }

export const workbenchApi = {
	index: () => get('/api/workbench/index')
}

function normalizeGoods(goods = {}) {
	const images = Array.isArray(goods.images)
		? goods.images
		: String(goods.images || '').split(',').filter(Boolean)
	const icon = goods.icon || goods.image || images[0] || ''
	return { ...goods, icon, image: goods.image || icon }
}

export const goodsApi = {
	categories: () => get('/api/goods/categories', {}, { auth: false }),
	lists: (params) => get('/api/goods/lists', params).then((data = {}) => ({
		...data,
		list: (data.list || []).map(normalizeGoods)
	})),
	detail: (id) => get('/api/goods/detail', { id }).then(normalizeGoods)
}

/** 待处理状态 → 可查的订单类型（线上可能尚未部署 /order/pending） */
const PENDING_STATUS_TYPES = {
	pending: ['purchase'],
	unpaid: ['delivery'],
	waiting: ['delivery'],
	canceling: ['purchase', 'delivery']
}

async function pendingViaLists(params = {}) {
	const status = params.status || ''
	const page = Math.max(1, Number(params.page) || 1)
	const limit = Math.min(50, Math.max(1, Number(params.limit) || 10))
	const statusKeys = status && PENDING_STATUS_TYPES[status]
		? [status]
		: Object.keys(PENDING_STATUS_TYPES)

	const jobs = []
	statusKeys.forEach((s) => {
		;(PENDING_STATUS_TYPES[s] || []).forEach((type) => {
			jobs.push(get('/api/order/lists', { type, status: s, page: 1, limit: 50 }, { silent: true }))
		})
	})

	const chunks = await Promise.all(jobs)
	const map = new Map()
	chunks.forEach((data) => {
		;((data && data.list) || []).forEach((item) => {
			if (item && item.id != null) map.set(item.id, item)
		})
	})

	const merged = Array.from(map.values()).sort((a, b) => Number(b.id) - Number(a.id))
	const start = (page - 1) * limit
	return {
		total: merged.length,
		list: merged.slice(start, start + limit),
		page
	}
}

export const orderApi = {
	lists: (params) => get('/api/order/lists', params),
	// 优先专用接口；未上线时静默回退到 lists 聚合，避免「请求失败」
	pending: async (params) => {
		try {
			return await get('/api/order/pending', params, { silent: true })
		} catch (e) {
			return pendingViaLists(params)
		}
	},
	detail: (id) => get('/api/order/detail', { id }),
	sfroute: (id) => get('/api/order/sfroute', { id }, { silent: true }),
	create: (data) => post('/api/order/create', data, { loading: true }),
	previewPostage: (data) => post('/api/order/previewPostage', data),
	postageConfig: () => get('/api/order/postageConfig'),
	bindOpenid: (code) => post('/api/order/bindOpenid', { code }, { silent: true }),
	wxpay: (id, code = '') => post('/api/order/wxpay', { id, code }, { loading: true }),
	voucher: (id, images) => post('/api/order/voucher', { id, images }),
	confirm: (id) => post('/api/order/confirm', { id }),
	cancel: (id) => post('/api/order/cancel', { id }),
	revokeCancel: (id) => post('/api/order/revokeCancel', { id })
}

/**
 * 调起微信小程序支付
 * @param {object} payment wxpay 接口返回的 payment
 */
export function requestWxPayment(payment) {
	return new Promise((resolve, reject) => {
		if (!payment || !payment.timeStamp) {
			reject(new Error('支付参数无效'))
			return
		}
		uni.requestPayment({
			provider: 'wxpay',
			timeStamp: String(payment.timeStamp),
			nonceStr: payment.nonceStr,
			package: payment.package,
			signType: payment.signType || 'MD5',
			paySign: payment.paySign,
			success: resolve,
			fail: reject
		})
	})
}

/**
 * 获取 wx.login code（静默，用于换 openid / JSAPI 支付）
 */
export function getWxLoginCode() {
	return new Promise((resolve, reject) => {
		uni.login({
			provider: 'weixin',
			success: (res) => {
				if (res.code) resolve(res.code)
				else reject(new Error('获取登录凭证失败'))
			},
			fail: reject
		})
	})
}

/**
 * 登录后静默绑定小程序 openid（失败不打断主流程）
 */
export async function ensureWxOpenid() {
	const token = uni.getStorageSync('token') || ''
	if (!token) return false
	try {
		const code = await getWxLoginCode()
		await orderApi.bindOpenid(code)
		return true
	} catch (e) {
		return false
	}
}

/**
 * 发起微信支付：先拿 wx.login code，服务端用其换/刷新 openid
 */
export async function wxpayWithCode(id) {
	let code = ''
	try {
		code = await getWxLoginCode()
	} catch (e) {}
	return orderApi.wxpay(id, code)
}

export const addressApi = {
	lists: (keyword = '') => get('/api/address/lists', keyword ? { keyword } : {}),
	regions: (pid = 0) => get('/api/address/regions', { pid }),
	detail: (id) => get('/api/address/detail', { id }),
	add: (data) => post('/api/address/add', data, { loading: true }),
	edit: (data) => post('/api/address/edit', data, { loading: true }),
	del: (id) => post('/api/address/del', { id }),
	setDefault: (id) => post('/api/address/setDefault', { id })
}

export const warehouseApi = {
	info: () => get('/api/warehouse/info'),
	open: () => post('/api/warehouse/open', {}, { loading: true }),
	stocks: (params) => get('/api/warehouse/stocks', params),
	setLimit: (id, stock_limit) => post('/api/warehouse/setLimit', { id, stock_limit }),
	records: (params) => get('/api/warehouse/records', params)
}

export const distributionApi = {
	index: () => get('/api/distribution/index'),
	upgradeRule: () => get('/api/distribution/upgradeRule'),
	team: (params) => get('/api/distribution/team', params),
	records: (params) => get('/api/distribution/records', params),
	binds: () => get('/api/distribution/binds'),
	checkBind: (mobile) => get('/api/distribution/checkBind', { mobile }),
	bind: (data) => post('/api/distribution/bind', data, { loading: true }),
	unbind: (id) => post('/api/distribution/unbind', { id }, { loading: true }),
	deposit: (data) => post('/api/distribution/deposit', data, { loading: true }),
	signAgreement: (sign_image) => post('/api/distribution/signAgreement', { sign_image }, { loading: true })
}

export const profileApi = {
	index: () => get('/api/profile/index'),
	update: (data) => post('/api/profile/update', data),
	changeMobile: (mobile, captcha) => post('/api/profile/changeMobile', { mobile, captcha }, { loading: true }),
	messages: (params) => get('/api/profile/messages', params),
	messageDetail: (id) => get('/api/profile/messageDetail', { id }),
	readMessage: (id = 0) => post('/api/profile/readMessage', { id }),
	agreement: (type) => get('/api/profile/agreement', { type }),
	agreements: () => get('/api/profile/agreements'),
	myAgreements: () => get('/api/profile/myAgreements'),
	bank: () => get('/api/profile/bank', {}, { auth: false })
}

export const helpApi = {
	info: () => get('/api/help/info', {}, { auth: false })
}
