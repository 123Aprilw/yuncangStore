<template>
	<view class="confirm-page">
		<page-nav class="page-nav-fixed" title="确认订单" back-icon="/static/delivery-confirm/back-figma.svg" :auto-back="false" :fallback="fromWarehouseDelivery ? '/pages/delivery/products' : '/pages/product/index'" @back="goBack" @layout="onNavLayout" />

		<scroll-view class="body" scroll-y>
			<view class="goods-card card" :style="{marginTop: contentTop}">
				<text class="section-title goods-title">商品清单</text>
				<view class="divider" />
				<view v-for="item in displayItems" :key="item.goods_id + '-' + item.sku_id" class="goods-row">
					<image class="goods-image" :src="item.icon || '/static/common/product-placeholder.png'" mode="aspectFill" />
					<text class="goods-name">{{ item.name }}</text>
					<text class="attribute">属性：{{ item.sku_name || '默认规格' }}</text>
					<view class="goods-price"><text class="currency">¥</text><text>{{ formatMoney(item.price) }}</text></view>
					<view class="quantity"><image src="/static/delivery-confirm/close.svg" mode="aspectFit" /><text>{{ item.qty }}</text></view>
				</view>
			</view>

			<view v-if="!fromWarehouseDelivery" class="pickup-card card">
				<view class="pickup-heading"><text>提货方式</text><text class="required">必选</text></view>
				<view class="option" :class="{ selected: pickup === 'delivery' }" @tap="pickup = 'delivery'">
					<view><text class="option-title">云仓发货</text><text class="option-desc">转账付货款，微信付邮费，平台库存直发</text></view>
					<view class="radio" :class="{ checked: pickup === 'delivery' }"><image v-if="pickup === 'delivery'" src="/static/delivery-confirm/selected.svg" mode="aspectFit" /></view>
				</view>
				<view class="option" :class="{ selected: pickup === 'warehouse' }" @tap="pickup = 'warehouse'">
					<view><text class="option-title">入我的仓库</text><text class="option-desc">转账采购入库（首次使用自动开通）</text></view>
					<view class="radio" :class="{ checked: pickup === 'warehouse' }"><image v-if="pickup === 'warehouse'" src="/static/delivery-confirm/selected.svg" mode="aspectFit" /></view>
				</view>
			</view>

			<view v-if="pickup === 'delivery'" class="address-card card" @tap="chooseAddress">
				<text class="address-title">收货地址</text>
				<template v-if="address">
					<view class="address-person"><text class="recipient-name">{{ address.name }}</text><text class="recipient-phone">{{ address.mobile }}</text><text v-if="address.is_default" class="default-tag">默认</text></view>
					<text class="address-text">{{ address.full_address || ((address.province || '') + (address.city && address.city !== address.province ? address.city : '') + (address.district || '') + (address.address || '')) }}</text>
				</template>
				<template v-else>
					<view class="address-person"><text class="recipient-name">请选择收货地址</text></view>
					<text class="address-text">点击选择收货人信息</text>
				</template>
				<image class="address-arrow" src="/static/delivery-confirm/address-arrow.svg" mode="aspectFit" />
			</view>

			<!-- <view v-if="pickup === 'delivery'" class="postage-card card">
				<view class="postage-copy">
					<text>邮费</text>
					<text v-if="postageHint" class="postage-hint">{{ postageHint }}</text>
				</view>
				<text>{{ postageLoading ? '计算中…' : ('¥' + postageDisplay) }}</text>
			</view> -->

			<view v-if="needVoucher" class="bank-card card" @tap="showAccount">
				<view class="bank-icon"><image src="/static/delivery-confirm/bank.svg" mode="aspectFit" /></view>
				<view class="bank-copy"><text class="bank-title">公对公银行转账</text><view class="bank-link"><text>查看官方收款账户信息</text><image src="/static/delivery-confirm/arrow-orange.svg" mode="aspectFit" /></view></view>
			</view>

			<view v-if="needVoucher" class="upload-card card" :class="{ 'upload-card--delivery': pickup === 'delivery' }">
				<view class="upload-heading"><text class="upload-title">上传转账凭证</text><text class="required">必选</text></view>
				<view class="notice"><image src="/static/delivery-confirm/notice-figma.svg" mode="aspectFit" /><text>仅支持图片，不超过30M</text></view>
				<view v-if="!voucherVisible" class="uploader" :class="{ error: voucherError }" @tap="uploadVoucher">
					<view class="plus"><image src="/static/delivery-confirm/plus.svg" mode="aspectFit" /></view>
					<text>{{ voucherUploading ? '上传中…' : '点击上传' }}</text>
				</view>
				<view v-else class="voucher-list">
					<view class="voucher-thumb">
						<image class="voucher-image" :src="voucherUrl" mode="aspectFill" @tap="previewVoucher" />
						<view class="voucher-cover"><text @tap.stop="deleteVoucher">删除</text></view>
					</view>
					<view class="voucher-add" @tap="uploadVoucher"><view class="plus"><image src="/static/delivery-confirm/plus.svg" mode="aspectFit" /></view></view>
				</view>
			</view>

			<view v-if="pickup === 'delivery'" class="pay-card card">
				<view class="pay-icon"><image src="/static/common/wechat-pay.svg" mode="aspectFit" /></view>
				<view class="pay-copy">
					<text class="pay-title">微信支付物流费用</text>
					<text class="pay-desc">{{ fromWarehouseDelivery ? '提交后调起微信支付邮费，支付成功后等待发货' : '货款请转账并上传凭证，微信仅支付邮费' }}</text>
				</view>
			</view>
			<view class="scroll-space" />
		</scroll-view>

		<view class="bottom-bar">
			<view class="total"><text>{{ bottomLabel }}</text><view class="total-price"><text class="currency">¥</text><text>{{ totalDisplay }}</text></view></view>
			<button class="submit" :disabled="submitting" @tap="submitOrder">{{ submitting ? '提交中...' : (pickup === 'delivery' ? '提交订单' : '提交订单') }}</button>
		</view>

		<view v-if="showAccountDialog" class="account-layer">
			<view class="account-mask" @tap="closeAccount" />
			<view class="account-sheet">
				<view class="drag-handle" />
				<text class="account-heading">官方收款账户信息</text>
				<view class="account-card">
					<view class="account-icon"><image src="/static/delivery-confirm/account-card.svg" mode="aspectFit" /></view>
					<view class="account-details">
						<view class="detail-item"><text class="detail-label">企业全称</text><text class="detail-value">{{ (bank && bank.company_name) || '暂无' }}</text></view>
						<view class="detail-item"><text class="detail-label">银行账号</text><text class="detail-value mono">{{ (bank && bank.bank_account) || '暂无' }}</text></view>
						<view class="detail-item"><text class="detail-label">开户行</text><text class="detail-value mono">{{ (bank && (bank.bank_name || bank.bank_code)) || '暂无' }}</text></view>
					</view>
				</view>
				<view class="account-actions">
					<button class="copy-button" @tap="copyAccount">复制账户信息</button>
					<button class="know-button" @tap="closeAccount">我知道了</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { addressApi, goodsApi, orderApi, profileApi, wxpayWithCode, requestWxPayment } from '@/api/index'
	import { getUploadUrl, getCurrentRoute, isActiveRoute } from '@/utils/request'
	import { navigateBack } from '@/utils/nav'
	import PageNav from '@/components/page-nav/page-nav.vue'
	import { getCapsuleLayout, capsuleStyleVars } from '@/utils/capsule'
	import { applyPostagePreview, formatMoney, postageHintText, previewOrderPostage, resetPostageState } from '@/utils/postage'

	export default {
		components: { PageNav },
		data() {
			const vars = capsuleStyleVars()
			return {
				pickup: 'delivery',
				contentTop: vars.contentTop,
				fromWarehouseDelivery: false,
				showAccountDialog: false,
				voucherVisible: false,
				voucherUrl: '',
				voucherUploading: false,
				voucherError: false,
				submitting: false,
				postage: '0.00',
				goodsAmount: '0.00',
				payAmount: '0.00',
				totalAmount: '0.00',
				postageMode: '',
				freeThreshold: '0.00',
				postageLoading: false,
				addressId: 0,
				address: null,
				bank: null,
				items: [],
				displayItems: []
			}
		},
		computed: {
			// 商品页两种提货都要凭证；仓库代发页只付邮费
			needVoucher() {
				return !this.fromWarehouseDelivery
			},
			bottomLabel() {
				return (this.fromWarehouseDelivery || this.pickup === 'delivery') ? '合计：' : '合计：'
			},
			postageDisplay() {
				return this.formatMoney(this.postage)
			},
			totalDisplay() {
				return this.formatMoney(this.totalAmount)
			},
			postageHint() {
				return postageHintText(this)
			}
		},
		onLoad(options) {
			this.onNavLayout(getCapsuleLayout(true))
			// 可从上一页传入 items JSON / address_id
			if (options.address_id) {
				this.addressId = parseInt(options.address_id, 10) || 0
			}
			if (options.items) {
				try {
					this.items = JSON.parse(decodeURIComponent(options.items))
				} catch (e) {
					this.items = []
				}
			}
			// 兼容本地缓存
			try {
				const cached = uni.getStorageSync('delivery_confirm')
				if (cached && !options.items) {
					if (cached.items && cached.items.length) this.items = cached.items
					if (cached.address_id) this.addressId = cached.address_id
					if (cached.address) this.address = cached.address
					this.fromWarehouseDelivery = !!cached.from_warehouse_delivery
				}
			} catch (e) {}
			this.loadGoods()
			this.loadDefaultAddress()
			this.loadPostage()
			this.loadBank()
		},
		watch: {
			pickup() {
				this.loadPostage()
			},
			address: {
				deep: true,
				handler() {
					this.loadPostage()
				}
			}
		},
		methods: {
			onNavLayout(layout) {
				const height = (layout && layout.navBarHeight) || getCapsuleLayout().navBarHeight
				this.contentTop = (height + 15) + 'px'
			},
			formatMoney(v) {
				return formatMoney(v)
			},
			goBack() { navigateBack(this.fromWarehouseDelivery ? '/pages/delivery/products' : '/pages/product/index') },
			showAccount() { this.showAccountDialog = true },
			closeAccount() { this.showAccountDialog = false },
			async loadBank() {
				try {
					const data = await profileApi.bank()
					this.bank = data || null
				} catch (e) {}
			},
			async loadDefaultAddress() {
				if (this.address || this.addressId) return
				try {
					const data = await addressApi.lists()
					const address = (data.list || []).find(item => Number(item.is_default) === 1)
					if (address) {
						this.address = address
						this.addressId = address.id
						this.loadPostage()
					}
				} catch (e) {}
			},
			async loadGoods() {
				if (!this.items.length) return
				const rows = await Promise.all(this.items.map(async (item) => {
					try {
						const goods = await goodsApi.detail(item.goods_id)
						const sku = (goods.skus || []).find(row => Number(row.id) === Number(item.sku_id)) || {}
						const minBuy = Math.max(1, Number(goods.min_buy) || 1)
						// 平台采购/直发按起订量兜底；仓库代发可单件
						const qty = this.fromWarehouseDelivery
							? Math.max(1, Number(item.qty) || 1)
							: Math.max(minBuy, Number(item.qty) || 1)
						return {
							...item,
							qty,
							min_buy: minBuy,
							name: goods.name || '商品',
							icon: ((goods.images || []).find(image => typeof image === 'object' && Number(image.sku_id) === Number(item.sku_id)) || {}).url || sku.image || goods.icon || goods.image || '',
							sku_name: sku.sku_name || '',
							price: sku.price || goods.price || '0.00'
						}
					} catch (e) {
						return { ...item, name: '商品', icon: '', sku_name: '', price: '0.00' }
					}
				}))
				this.displayItems = rows
				this.items = rows.map(row => ({
					goods_id: row.goods_id,
					sku_id: row.sku_id,
					qty: row.qty
				}))
				this.loadPostage()
			},
			async loadPostage() {
				if (!this.items.length) {
					resetPostageState(this)
					return
				}
				this.postageLoading = true
				try {
					const data = await previewOrderPostage({
						fromWarehouseDelivery: this.fromWarehouseDelivery,
						pickup: this.pickup,
						items: this.items,
						addressId: this.addressId,
						address: this.address
					})
					if (data) {
						applyPostagePreview(this, data, this.fromWarehouseDelivery)
					}
				} catch (e) {
					resetPostageState(this)
				} finally {
					this.postageLoading = false
				}
			},
			copyAccount() {
				const b = this.bank || {}
				const data = `企业全称：${b.company_name || ''}\n银行账号：${b.bank_account || ''}\n开户行：${b.bank_name || ''}`
				uni.setClipboardData({ data, success: () => uni.showToast({ title: '复制成功', icon: 'success' }) })
			},
			chooseAddress() {
				uni.navigateTo({
					url: '/pages/recipient/list?from=confirm',
					events: {
						selectAddress: (addr) => {
							this.address = addr
							this.addressId = addr.id
							this.loadPostage()
						}
					}
				})
			},
			uploadVoucher() {
				if (this.voucherUploading) return
				const startRoute = getCurrentRoute()
				const maxSize = 30 * 1024 * 1024
				uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					success: result => {
						const file = (result.tempFiles && result.tempFiles[0]) || {}
						if (file.size > maxSize) {
							uni.showToast({ title: '文件不能超过30M', icon: 'none' })
							return
						}
						this.voucherUploading = true
						uni.uploadFile({
							url: getUploadUrl(),
							filePath: result.tempFilePaths[0],
							name: 'file',
							header: { token: uni.getStorageSync('token') || '' },
							success: response => {
								if (!isActiveRoute(startRoute)) return
								try {
									const body = JSON.parse(response.data)
									if (body.code === 1) {
										this.voucherUrl = body.data.fullurl || body.data.url || ''
										this.voucherVisible = !!this.voucherUrl
										if (this.voucherVisible) this.voucherError = false
										uni.showToast({ title: '上传成功', icon: 'success' })
									} else uni.showToast({ title: body.msg || '上传失败', icon: 'none' })
								} catch (e) { uni.showToast({ title: '上传失败', icon: 'none' }) }
							},
							fail: () => {
								if (isActiveRoute(startRoute)) uni.showToast({ title: '上传失败', icon: 'none' })
							},
							complete: () => { this.voucherUploading = false }
						})
					}
				})
			},
			previewVoucher() { uni.previewImage({ urls: [this.voucherUrl], current: this.voucherUrl }) },
			deleteVoucher() { this.voucherVisible = false; this.voucherUrl = '' },
			async payOrder(orderId) {
				const data = await wxpayWithCode(orderId)
				if (data.paid) {
					return true
				}
				await requestWxPayment(data.payment)
				return true
			},
			async submitOrder() {
				if (this.submitting) return
				if (this.pickup === 'delivery' && !this.addressId && !(this.address && this.address.name)) {
					uni.showToast({ title: '请选择收货地址', icon: 'none' })
					return
				}
				if (this.needVoucher) {
					if (this.voucherUploading) {
						uni.showToast({ title: '凭证上传中，请稍候', icon: 'none' })
						return
					}
					if (!this.voucherUrl) {
						this.voucherError = true
						uni.showToast({ title: '请先上传转账凭证', icon: 'none' })
						return
					}
				}
				if (!this.items.length) {
					uni.showToast({ title: '请先选择商品', icon: 'none' })
					return
				}
				this.submitting = true
				try {
					if (this.pickup === 'delivery') {
						await this.loadPostage()
					}
					const body = {
						// 商品页：入仓库=采购；云仓发货=平台代发（凭证付货款 + 微信付邮费）
						// 仓库代发页：用户仓出库代发
						type: this.fromWarehouseDelivery?'delivery':'purchase',
						source: this.fromWarehouseDelivery ? '' : (this.pickup === 'delivery' ? 'platform' : ''),
						pickup: this.pickup,
						address_id: this.addressId || 0,
						items: this.items
					}
					if (this.voucherUrl) body.voucher_images = this.voucherUrl
					if (!this.addressId && this.address) {
						body.receiver_name = this.address.name
						body.receiver_mobile = this.address.mobile
						body.receiver_province = this.address.province
						body.receiver_city = this.address.city
						body.receiver_district = this.address.district
						body.receiver_address = this.address.address
					}
					const order = await orderApi.create(body)
					if (this.pickup === 'delivery' && order.can_pay) {
						try {
							await this.payOrder(order.id)
							uni.showToast({ title: '邮费支付成功', icon: 'success' })
							setTimeout(() => {
								uni.redirectTo({ url: '/pages/order/detail?id=' + order.id })
							}, 500)
						} catch (e) {
							uni.showToast({ title: '已下单，可稍后支付邮费', icon: 'none' })
							setTimeout(() => {
								uni.redirectTo({ url: '/pages/order/detail?id=' + order.id })
							}, 800)
						}
					} else {
						uni.showToast({ title: '订单提交成功', icon: 'success' })
						setTimeout(() => {
							uni.redirectTo({ url: '/pages/order/detail?id=' + order.id })
						}, 500)
					}
				} catch (e) {
					// request 已 toast
				} finally {
					this.submitting = false
				}
			}
		}
	}
</script>

<style scoped>
	.confirm-page { width: 100%; height: 100vh; overflow: hidden; color: #181c1c; background: #f9f9f9; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.page-nav-fixed { position: fixed; top: 0; left: 0; z-index: 5; width: 100%; }
	.body { width: 100%; height: 100vh; }
	.card { box-sizing: border-box; width: 690rpx; margin-left: 30rpx; background: #fff; border-radius: 24rpx; }
	.goods-card { min-height: 318rpx; padding: 30rpx; }
	.section-title { display: block; color: #000; font-size: 32rpx; font-weight: 500; line-height: 40rpx; }
	.divider { width: 630rpx; height: 2rpx; margin-top: 24rpx; background: rgba(0,0,0,.06); }
	.goods-row { position: relative; height: 200rpx; padding-top: 22rpx; }
	.goods-row + .goods-row { border-top: 2rpx solid rgba(0,0,0,.06); }
	.goods-image { position: absolute; top: 22rpx; left: 0; width: 136rpx; height: 136rpx; border-radius: 24rpx; }
	.goods-name { position: absolute; top: 22rpx; left: 160rpx; width: 470rpx; color: #000; font-size: 28rpx; line-height: 42rpx; }
	.attribute { position: absolute; top: 106rpx; left: 160rpx; color: rgba(0,0,0,.45); font-size: 24rpx; }
	.goods-price { position: absolute; top: 146rpx; left: 160rpx; display: flex; align-items: baseline; color: #000; font-family: Arial, sans-serif; font-size: 36rpx; font-weight: 500; }
	.currency { margin-right: 4rpx; font-size: 24rpx; font-weight: 400; }
	.quantity { position: absolute; top: 150rpx; right: 0; display: flex; align-items: center; font-size: 26rpx; font-weight: 500; }
	.quantity image { width: 20rpx; height: 20rpx; margin-right: 4rpx; }
	.pickup-card { height: 496rpx; margin-top: 24rpx; padding: 30rpx; }
	.pickup-heading { display: flex; align-items: center; height: 66rpx; font-size: 36rpx; }
	.required { margin-left: 16rpx; padding: 4rpx 16rpx; color: #f97316; font-size: 24rpx; background: rgba(249,115,22,.08); border-radius: 999rpx; }
	.option { position: relative; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; width: 630rpx; height: 162rpx; margin-top: 22rpx; padding: 32rpx; border: 2rpx solid #e0e3e1; border-radius: 24rpx; }
	.option + .option { margin-top: 20rpx; }
	.option.selected { background: linear-gradient(166deg,rgba(255,255,255,.4),rgba(255,255,255,0)),rgba(249,115,22,.08); border: 4rpx solid #f97316; box-shadow: 0 8rpx 40rpx rgba(168,198,159,.15); }
	.option-title, .option-desc { display: block; }
	.option-title { color: #181c1c; font-size: 32rpx; line-height: 48rpx; }
	.option-desc { margin-top: 12rpx; color: rgba(67,72,64,.65); font-size: 24rpx; }
	.selected .option-title { color: #81461e; }
	.selected .option-desc { color: rgba(129,70,30,.65); }
	.radio { box-sizing: border-box; width: 40rpx; height: 40rpx; border: 4rpx solid #c3c8bd; border-radius: 50%; }
	.radio.checked { display: flex; align-items: center; justify-content: center; background: linear-gradient(90deg,#fb3b19,#f97316); border-color: #fb3b19; }
	.radio image { width: 18rpx; height: 14rpx; }
	.address-card { position: relative; height: 236rpx; margin-top: 24rpx; padding: 30rpx; }
	.address-title { display: block; color: #000; font-size: 32rpx; font-weight: 500; line-height: 40rpx; }
	.address-person { display: flex; align-items: center; margin-top: 24rpx; }
	.recipient-name { color: rgba(0,0,0,.85); font-size: 34rpx; font-weight: 500; line-height: 40rpx; }
	.recipient-phone { margin-left: 12rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 40rpx; }
	.default-tag { margin-left: 18rpx; padding: 4rpx 14rpx; color: #ff0707; font-size: 20rpx; line-height: 28rpx; background: rgba(255,163,163,.2); border-radius: 30rpx; }
	.address-text { display: block; width: 540rpx; margin-top: 16rpx; overflow: hidden; color: rgba(0,0,0,.85); font-size: 28rpx; line-height: 40rpx; white-space: nowrap; text-overflow: ellipsis; }
	.address-arrow { position: absolute; right: 26rpx; bottom: 34rpx; width: 48rpx; height: 48rpx; transform: rotate(90deg) scaleY(-1); }
	.postage-card { display: flex; align-items: center; justify-content: space-between; min-height: 104rpx; margin-top: 24rpx; padding: 32rpx; color: #3f4a36; font-size: 30rpx; line-height: 40rpx; }
	.postage-copy { display: flex; flex-direction: column; gap: 6rpx; }
	.postage-hint { color: rgba(63,74,54,.55); font-size: 22rpx; line-height: 32rpx; }
	.postage-card > text:last-child { color: #1c1b1b; }
	.pay-card { display: flex; align-items: center; height: 140rpx; margin-top: 24rpx; padding: 24rpx; }
	.pay-icon { display: flex; align-items: center; justify-content: center; width: 80rpx; height: 80rpx; flex-shrink: 0; }
	.pay-icon image { width: 80rpx; height: 80rpx; }
	.pay-copy { margin-left: 20rpx; flex: 1; }
	.pay-title { display: block; color: #1a1c1c; font-size: 28rpx; font-weight: 500; line-height: 40rpx; }
	.pay-desc { display: block; margin-top: 4rpx; color: rgba(0,0,0,.45); font-size: 24rpx; line-height: 32rpx; }
	.bank-card { display: flex; align-items: center; height: 140rpx; margin-top: 24rpx; padding: 24rpx; }
	.bank-icon { display: flex; align-items: center; justify-content: center; width: 80rpx; height: 80rpx; background: rgba(249,115,22,.08); border-radius: 24rpx; }
	.bank-icon image { width: 40rpx; height: 40rpx; }
	.bank-copy { margin-left: 20rpx; }
	.bank-title { display: block; color: #1a1c1c; font-size: 28rpx; font-weight: 500; line-height: 40rpx; }
	.bank-link { display: flex; align-items: center; margin-top: 4rpx; color: #f97316; font-size: 24rpx; line-height: 32rpx; }
	.bank-link image { width: 10rpx; height: 16rpx; margin-left: 8rpx; }
	.upload-card { height: 476rpx; margin-top: 24rpx; padding: 30rpx; }
	.upload-card--delivery { height: 444rpx; }
	.upload-heading { display: flex; align-items: center; height: 66rpx; }
	.upload-title { font-size: 36rpx; line-height: 66rpx; }
	.notice { display: flex; align-items: center; box-sizing: border-box; width: 630rpx; height: 66rpx; padding: 16rpx 20rpx; color: #f97316; font-size: 24rpx; background: rgba(249,115,22,.08); border-radius: 16rpx; }
	.notice image { width: 28rpx; height: 32rpx; margin-right: 16rpx; }
	.uploader { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; width: 630rpx; height: 256rpx; margin-top: 24rpx; border: 3rpx dashed rgba(249,115,22,.4); border-radius: 24rpx; font-size: 32rpx; }
	.uploader.error { border-color: #fb3b19; color: #fb3b19; background: rgba(251,59,25,.04); }
	.plus { display: flex; align-items: center; justify-content: center; width: 80rpx; height: 80rpx; margin-bottom: 20rpx; background: rgba(249,115,22,.08); border-radius: 50%; }
	.plus image { width: 28rpx; height: 28rpx; }
	.voucher-list { display: flex; gap: 20rpx; margin-top: 24rpx; }
	.voucher-thumb, .voucher-add { position: relative; box-sizing: border-box; width: 216rpx; height: 216rpx; overflow: hidden; border-radius: 20rpx; }
	.voucher-image { width: 216rpx; height: 216rpx; }
	.voucher-cover { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 18rpx; color: #fff; font-size: 28rpx; background: rgba(0,0,0,.7); }
	.voucher-cover image { width: 40rpx; height: 40rpx; }
	.voucher-add { display: flex; align-items: center; justify-content: center; background: #fff; border: 3rpx dashed #fdd5b9; }
	.voucher-add .plus { margin: 0; }
	.scroll-space { height: 150rpx; }
	.bottom-bar { position: fixed; right: 0; bottom: 0; left: 0; z-index: 5; box-sizing: border-box; height: 128rpx; background: #fff; border-top: 2rpx solid rgba(0,0,0,.06); }
	.total { position: absolute; top: 46rpx; left: 30rpx; display: flex; align-items: baseline; font-size: 28rpx; }
	.total-price { display: flex; align-items: baseline; color: #ff6b01; font-family: Arial, sans-serif; font-size: 36rpx; font-weight: 500; }
	.submit { position: absolute; top: 28rpx; right: 30rpx; display: flex; align-items: center; justify-content: center; width: 206rpx; height: 80rpx; margin: 0; padding: 0; color: #fff; font-size: 28rpx; font-weight: 500; line-height: 80rpx; background: linear-gradient(90deg,#fb3b19,#f97316); border: 0; border-radius: 100rpx; }
	.submit::after { border: 0; }
	.account-layer { position: fixed; inset: 0; z-index: 30; }
	.account-mask { position: absolute; inset: 0; background: rgba(0,0,0,.82); }
	.account-sheet { position: absolute; right: 0; bottom: 0; left: 0; box-sizing: border-box; height: 706rpx; background: linear-gradient(180deg,#fffaeb 0%,#fff 100%); border-radius: 48rpx 48rpx 0 0; box-shadow: 0 -20rpx 40rpx rgba(0,0,0,.15); }
	.drag-handle { position: absolute; top: 24rpx; left: 50%; width: 96rpx; height: 8rpx; opacity: .5; background: #d1d5db; border-radius: 999rpx; transform: translateX(-50%); }
	.account-heading { position: absolute; top: 64rpx; left: 0; width: 100%; color: #1f2937; font-size: 40rpx; line-height: 56rpx; letter-spacing: 1rpx; text-align: center; }
	.account-card { position: absolute; top: 140rpx; left: 46rpx; display: flex; box-sizing: border-box; width: 660rpx; height: 378rpx; padding: 32rpx; background: #fff; border-radius: 16rpx; }
	.account-icon { display: flex; flex: none; align-items: center; justify-content: center; width: 72rpx; height: 72rpx; background: rgba(249,115,22,.08); border-radius: 8rpx; }
	.account-icon image { width: 34rpx; height: 28rpx; }
	.account-details { flex: 1; margin-left: 24rpx; }
	.detail-item { display: flex; flex-direction: column; }
	.detail-item + .detail-item { margin-top: 20rpx; }
	.detail-label { color: #414755; font-size: 24rpx; font-weight: 500; line-height: 32rpx; }
	.detail-value { margin-top: 8rpx; color: #4e4e4e; font-size: 28rpx; font-weight: 700; line-height: 48rpx; letter-spacing: -.72rpx; }
	.detail-value.mono { font-family: "Courier New", monospace; }
	.account-actions { position: absolute; top: 550rpx; left: 30rpx; display: flex; gap: 34rpx; }
	.account-actions button { display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 328rpx; height: 96rpx; margin: 0; padding: 0; font-size: 32rpx; font-weight: 500; line-height: 96rpx; border: 0; border-radius: 60rpx; }
	.account-actions button::after { border: 0; }
	.copy-button { color: #656565; background: #f7f7f7; }
	.know-button { color: #fff; background: linear-gradient(90deg,#fb3b19,#f97316); }
</style>
