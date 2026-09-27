import { orderApi } from '@/api/index'

export function buildPostagePayload(options = {}) {
	const {
		fromWarehouseDelivery = false,
		pickup = 'delivery',
		items = [],
		addressId = 0,
		address = null
	} = options
	return {
		type: fromWarehouseDelivery ? 'delivery' : (pickup === 'warehouse' ? 'purchase' : 'purchase'),
		source: fromWarehouseDelivery ? '' : (pickup === 'delivery' ? 'platform' : ''),
		pickup,
		items,
		address_id: addressId || 0,
		receiver_province: (address && address.province) || ''
	}
}

export function resetPostageState(vm) {
	vm.postage = '0.00'
	vm.goodsAmount = '0.00'
	vm.payAmount = '0.00'
	vm.totalAmount = '0.00'
	vm.postageMode = ''
	vm.freeThreshold = '0.00'
}

export function applyPostagePreview(vm, data, fromWarehouseDelivery) {
	vm.postage = data.postage || '0.00'
	vm.goodsAmount = data.goods_amount || '0.00'
	vm.payAmount = data.pay_amount || '0.00'
	// 仓库代发 / 平台云仓发货：底部应付为微信邮费；入仓库：合计为货款
	const payPostageOnly = fromWarehouseDelivery || vm.pickup === 'delivery'
	vm.totalAmount = payPostageOnly ? (data.pay_amount || '0.00') : (data.total_amount || '0.00')
	vm.postageMode = data.mode || 'fixed'
	vm.freeThreshold = data.free_threshold || '0.00'
}

export async function previewOrderPostage(options = {}) {
	const items = options.items || []
	if (!items.length) {
		return null
	}
	return orderApi.previewPostage(buildPostagePayload(options))
}

export function postageHintText(vm) {
	if (vm.pickup === 'warehouse') {
		return ''
	}
	const postage = Number(vm.postage)
	const goodsAmount = Number(vm.goodsAmount)
	const freeThreshold = Number(vm.freeThreshold)
	if (postage === 0 && freeThreshold > 0 && goodsAmount >= freeThreshold) {
		return `已满 ¥${formatMoney(freeThreshold)} 包邮`
	}
	if (vm.postageMode === 'goods') {
		return '按商品邮费计'
	}
	if (vm.postageMode === 'weight') {
		return '按重量计重'
	}
	return ''
}

export function formatMoney(value) {
	const n = parseFloat(value)
	if (isNaN(n)) {
		return '0.00'
	}
	return n.toFixed(2)
}
