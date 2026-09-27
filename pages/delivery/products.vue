<template>
	<view class="products-page">
		<page-nav title="云仓发货" back-icon="/static/delivery-products/back.svg" fallback="/pages/delivery/create">
			<template #right>
				<text class="step">2/3</text>
			</template>
		</page-nav>

		<view class="recipient-card" @tap="chooseRecipient">
			<text class="section-title">收货人</text>
			<view class="person-line">
				<text class="name">{{ recipient.name || '请选择收货人' }}</text>
				<text v-if="recipient.mobile" class="phone">{{ maskMobile(recipient.mobile) }}</text>
			</view>
			<text class="address">{{ recipientAddress || '请选择收货地址' }}</text>
			<image class="chevron" src="/static/delivery-products/chevron.svg" mode="aspectFit" />
		</view>

		<view class="search-box">
			<image src="/static/delivery-products/search.svg" mode="aspectFit" />
			<input v-model="keyword" placeholder="搜索已选商品" placeholder-class="search-placeholder" confirm-type="search" />
		</view>

		<scroll-view class="content-scroll" scroll-y :show-scrollbar="false">
			<view class="product-list">
				<view v-if="!filteredProducts.length" class="empty-tip">
					<text>{{ products.length ? '未找到相关商品' : '暂未添加商品，点击下方添加' }}</text>
				</view>
				<view v-for="item in filteredProducts" :key="item.id" class="product-card">
					<view class="check-wrap"><image src="/static/delivery-products/check.svg" mode="aspectFit" /></view>
					<view class="product-image"><image :src="item.image || '/static/delivery-products/product.png'" mode="aspectFill" /></view>
					<view class="product-info">
						<text class="product-name">{{ item.name }}</text>
						<text class="stock">库存:{{ item.stock }}盒</text>
						<text class="price">¥{{ item.price }}</text>
						<view class="quantity">
							<image
								class="qty-btn"
								:class="{ disabled: Number(item.quantity) <= 1 }"
								:src="Number(item.quantity) <= 1 ? '/static/delivery-products/minus-disabled.svg' : '/static/delivery-products/minus.svg'"
								mode="aspectFit"
								@tap="decrease(item)"
							/>
							<text>{{ item.quantity }}</text>
							<image
								class="qty-btn"
								:class="{ disabled: Number(item.quantity) >= Number(item.stock) }"
								src="/static/delivery-products/plus.svg"
								mode="aspectFit"
								@tap="increase(item)"
							/>
						</view>
					</view>
				</view>
			</view>

			<view class="add-more" @tap="openSheet">
				<image src="/static/delivery-products/add.svg" mode="aspectFit" />
				<text>添加更多商品</text>
			</view>
		</scroll-view>

		<view class="bottom-bar">
			<view class="summary">
				<view class="summary-left">
					<text>购买清单合计：{{ totalQty }}盒</text>
					<text class="postage">{{ postageSummaryText }}</text>
				</view>
				<view class="summary-right">
					<text>商品总额：</text>
					<text class="total">¥{{ totalPrice }}</text>
				</view>
			</view>
			<button class="submit-button" @tap="submit">确认提交</button>
		</view>

		<view v-if="sheetVisible" class="picker-overlay" @tap="closeSheet">
			<view class="picker-sheet" @tap.stop>
				<view class="drag-handle" />
				<text class="sheet-title">添加商品</text>
				<view class="sheet-search">
					<image src="/static/delivery-products/search.svg" mode="aspectFit" />
					<input
						v-model="sheetKeyword"
						placeholder="搜索仓库商品"
						placeholder-class="search-placeholder"
						confirm-type="search"
						@confirm="loadSheetProducts"
					/>
				</view>
				<scroll-view class="sheet-list" scroll-y :show-scrollbar="false">
					<view v-if="!sheetProducts.length" class="sheet-empty">
						<text>{{ sheetLoading ? '加载中...' : '暂无仓库商品' }}</text>
					</view>
					<view
						v-for="item in sheetProducts"
						:key="item.id"
						class="sheet-card"
						@tap="toggleSheetItem(item)"
					>
						<image
							class="sheet-check"
							:src="item.selected ? '/static/delivery-create/selected.svg' : '/static/delivery-create/unselected.svg'"
							mode="aspectFit"
						/>
						<view class="sheet-image">
							<image :src="item.image || '/static/delivery-products/product.png'" mode="aspectFill" />
						</view>
						<view class="sheet-info">
							<text class="sheet-name">{{ item.name }}</text>
							<text class="sheet-stock">库存:{{ item.stock }}盒</text>
							<view class="sheet-bottom">
								<text class="sheet-price">¥{{ item.price }}</text>
								<view class="quantity" @tap.stop>
									<image
										class="qty-btn"
										:class="{ disabled: !item.selected || Number(item.quantity) <= 1 }"
										:src="(!item.selected || Number(item.quantity) <= 1) ? '/static/delivery-products/minus-disabled.svg' : '/static/delivery-products/minus.svg'"
										mode="aspectFit"
										@tap="decreaseSheet(item)"
									/>
									<text>{{ item.quantity }}</text>
									<image
										class="qty-btn"
										:class="{ disabled: !item.selected || Number(item.quantity) >= Number(item.stock) }"
										src="/static/delivery-products/plus.svg"
										mode="aspectFit"
										@tap="increaseSheet(item)"
									/>
								</view>
							</view>
						</view>
					</view>
				</scroll-view>
				<view class="sheet-footer">
					<text class="sheet-count">已选 {{ sheetSelectedQty }} 盒</text>
					<button class="sheet-confirm" @tap="confirmSheet">确认添加</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { warehouseApi, goodsApi } from '@/api/index'
	import { navigateBack } from '@/utils/nav'
	import { applyPostagePreview, formatMoney, previewOrderPostage, resetPostageState } from '@/utils/postage'
	export default {
		data() {
			return {
				keyword: '',
				recipient: {},
				products: [],
				sheetVisible: false,
				sheetLoading: false,
				sheetKeyword: '',
				sheetProducts: [],
				postage: '0.00',
				goodsAmount: '0.00',
				postageMode: '',
				freeThreshold: '0.00',
				postageLoading: false
			}
		},
		onShow() {
			this.recipient = uni.getStorageSync('delivery_recipient') || {}
			this.schedulePostagePreview()
		},
		watch: {
			products: {
				deep: true,
				handler() {
					this.schedulePostagePreview()
				}
			},
			recipient: {
				deep: true,
				handler() {
					this.schedulePostagePreview()
				}
			}
		},
		computed: {
			recipientAddress() {
				if (this.recipient.full_address) return this.recipient.full_address
				const parts = []
				;[this.recipient.province, this.recipient.city, this.recipient.district].forEach((name) => {
					if (!name || (parts.length && parts[parts.length - 1] === name)) return
					parts.push(name)
				})
				return parts.join('') + (this.recipient.address || '')
			},
			totalQty() {
				return this.products.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
			},
			totalPrice() {
				return this.products.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0).toFixed(2)
			},
			filteredProducts() {
				const keyword = this.keyword.trim()
				if (!keyword) return this.products
				return this.products.filter(item => String(item.name || '').includes(keyword))
			},
			sheetSelectedQty() {
				return this.sheetProducts.reduce((sum, item) => {
					if (!item.selected) return sum
					return sum + Number(item.quantity || 0)
				}, 0)
			},
			postageSummaryText() {
				if (!this.products.length) {
					return '(请先添加商品)'
				}
				if (!this.recipient.id) {
					return '(请先选择收货人)'
				}
				if (this.postageLoading) {
					return '邮费计算中…'
				}
				const postage = Number(this.postage)
				const freeThreshold = Number(this.freeThreshold)
				const goodsAmount = Number(this.goodsAmount)
				if (postage === 0 && freeThreshold > 0 && goodsAmount >= freeThreshold) {
					return `(已满 ¥${formatMoney(freeThreshold)} 包邮)`
				}
				return `(邮费 ¥${formatMoney(this.postage)})`
			}
		},
		methods: {
			schedulePostagePreview() {
				clearTimeout(this._postageTimer)
				this._postageTimer = setTimeout(() => {
					this.loadPostagePreview()
				}, 200)
			},
			buildPreviewItems() {
				return this.products
					.filter(item => Number(item.quantity) > 0)
					.map(item => ({
						goods_id: item.goods_id || item.id,
						sku_id: item.sku_id || 0,
						qty: item.quantity
					}))
			},
			async loadPostagePreview() {
				const items = this.buildPreviewItems()
				if (!items.length || !this.recipient.id) {
					resetPostageState(this)
					return
				}
				this.postageLoading = true
				try {
					const data = await previewOrderPostage({
						fromWarehouseDelivery: true,
						pickup: 'delivery',
						items,
						addressId: this.recipient.id,
						address: this.recipient
					})
					if (data) {
						applyPostagePreview(this, data, true)
					}
				} catch (e) {
					resetPostageState(this)
				} finally {
					this.postageLoading = false
				}
			},
			async mapStockRows(rows) {
				return Promise.all(rows.map(async item => {
					let detail = {}
					try { detail = await goodsApi.detail(item.goods_id) } catch (e) {}
					const sku = (detail.skus || []).find(row => Number(row.id) === Number(item.sku_id)) || {}
					const existed = this.products.find(row => Number(row.id) === Number(item.id))
					const quantity = existed ? Number(existed.quantity || 0) : 0
					return {
						...item,
						price: sku.price || detail.price || '0.00',
						image: item.image || sku.image || detail.icon || '',
						quantity,
						selected: quantity > 0
					}
				}))
			},
			async openSheet() {
				this.sheetVisible = true
				this.sheetKeyword = ''
				await this.loadSheetProducts()
			},
			closeSheet() {
				this.sheetVisible = false
			},
			async loadSheetProducts() {
				this.sheetLoading = true
				try {
					const data = await warehouseApi.stocks({ keyword: this.sheetKeyword.trim() })
					this.sheetProducts = await this.mapStockRows(data.list || [])
				} catch (e) {
					this.sheetProducts = []
				} finally {
					this.sheetLoading = false
				}
			},
			setSheetQuantity(item, quantity, selected = true) {
				const index = this.sheetProducts.findIndex(row => Number(row.id) === Number(item.id))
				if (index < 0) return
				const max = Math.max(0, Number(item.stock) || 0)
				if (!selected || max < 1) {
					this.$set(this.sheetProducts, index, { ...item, quantity: 0, selected: false })
					return
				}
				const next = Math.max(1, Math.min(max, Number(quantity) || 1))
				this.$set(this.sheetProducts, index, { ...item, quantity: next, selected: true })
			},
			toggleSheetItem(item) {
				if (item.selected) {
					this.setSheetQuantity(item, 0, false)
					return
				}
				this.setSheetQuantity(item, 1, true)
			},
			decreaseSheet(item) {
				if (!item.selected) return
				if (Number(item.quantity) <= 1) return
				this.setSheetQuantity(item, Number(item.quantity) - 1, true)
			},
			increaseSheet(item) {
				if (item.quantity < item.stock) this.setSheetQuantity(item, Number(item.quantity) + 1, true)
			},
			confirmSheet() {
				const picked = this.sheetProducts.filter(item => item.selected && Number(item.quantity) >= 1)
				if (!picked.length) {
					uni.showToast({ title: '请选择商品并设置数量', icon: 'none' })
					return
				}
				picked.forEach(item => {
					const index = this.products.findIndex(row => Number(row.id) === Number(item.id))
					const next = {
						id: item.id,
						goods_id: item.goods_id,
						sku_id: item.sku_id,
						name: item.name,
						image: item.image,
						stock: item.stock,
						price: item.price,
						quantity: Math.max(1, Number(item.quantity) || 1)
					}
					if (index >= 0) this.$set(this.products, index, next)
					else this.products.push(next)
				})
				this.sheetVisible = false
				this.schedulePostagePreview()
				uni.showToast({ title: '已添加', icon: 'success' })
			},
			goBack() { navigateBack('/pages/delivery/create') },
			chooseRecipient() { navigateBack('/pages/delivery/create') },
			maskMobile(mobile) { return String(mobile || '').replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2') },
			setQuantity(item, quantity) {
				const index = this.products.findIndex(row => Number(row.id) === Number(item.id))
				if (index < 0) return
				const max = Math.max(1, Number(item.stock) || 0)
				const next = Math.max(1, Math.min(max, Number(quantity) || 1))
				this.$set(this.products, index, { ...item, quantity: next })
			},
			decrease(item) { if (Number(item.quantity) > 1) this.setQuantity(item, Number(item.quantity) - 1) },
			increase(item) { if (item.quantity < item.stock) this.setQuantity(item, Number(item.quantity) + 1) },
			submit() {
				const selected = this.products.filter(item => item.quantity > 0)
				if (!selected.length) { uni.showToast({ title: '请选择商品', icon: 'none' }); return }
				const items = selected.map(item => ({
					goods_id: item.goods_id || item.id,
					sku_id: item.sku_id || 0,
					qty: item.quantity
				}))
				if (!this.recipient.id) { uni.showToast({ title: '请选择收货人', icon: 'none' }); return }
				uni.setStorageSync('delivery_confirm', { items, address_id: this.recipient.id, address: this.recipient, from_warehouse_delivery: true })
				uni.navigateTo({ url: '/pages/delivery/confirm' })
			}
		}
	}
</script>

<style scoped>
	.products-page { position: relative; box-sizing: border-box; width: 100%; min-height: 100vh; padding-bottom: 294rpx; color: #1a1c1c; background: #f9f9f9; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.step { color: rgba(0,0,0,.45); font-size: 28rpx; line-height: 44rpx; }
	.recipient-card { position: relative; box-sizing: border-box; width: 690rpx; height: 236rpx; margin: 24rpx 30rpx 0; background: #fff; border-radius: 24rpx; }
	.section-title { position: absolute; top: 30rpx; left: 30rpx; color: #000; font-size: 32rpx; font-weight: 500; line-height: 40rpx; }
	.person-line { position: absolute; top: 94rpx; left: 30rpx; display: flex; align-items: center; height: 40rpx; }
	.name { color: rgba(0,0,0,.85); font-size: 34rpx; font-weight: 500; line-height: 40rpx; }
	.phone { margin-left: 14rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 40rpx; }
	.address { position: absolute; top: 166rpx; left: 30rpx; width: 486rpx; overflow: hidden; color: rgba(0,0,0,.85); font-size: 28rpx; line-height: 40rpx; white-space: nowrap; text-overflow: ellipsis; }
	.chevron { position: absolute; top: 126rpx; right: 30rpx; width: 48rpx; height: 48rpx; transform: rotate(90deg) scaleY(-1); }
	.search-box { display: flex; align-items: center; box-sizing: border-box; width: 690rpx; height: 76rpx; margin: 24rpx 30rpx 0; padding: 0 20rpx; background: #fff; border-radius: 200rpx; }
	.search-box image { flex: 0 0 auto; width: 36rpx; height: 36rpx; }
	.search-box input { flex: 1; height: 76rpx; margin-left: 16rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 76rpx; }
	.search-placeholder { color: rgba(0,0,0,.45); }
	.content-scroll { box-sizing: border-box; width: 100%; height: calc(100vh - 556rpx); margin-top: 24rpx; }
	.product-list { width: 690rpx; margin: 0 30rpx; }
	.empty-tip { display: flex; align-items: center; justify-content: center; height: 160rpx; color: rgba(0,0,0,.35); font-size: 28rpx; }
	.product-card { position: relative; box-sizing: border-box; width: 690rpx; height: 230rpx; margin-bottom: 20rpx; background: #fff; border-radius: 24rpx; }
	.check-wrap { position: absolute; top: 95rpx; left: 30rpx; display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 44rpx; height: 44rpx; padding: 2rpx; overflow: hidden; background: linear-gradient(90deg,#fb3b19,#f97316); border-radius: 50%; }
	.check-wrap image { width: 40rpx; height: 40rpx; }
	.product-image { position: absolute; top: 34rpx; left: 104rpx; width: 160rpx; height: 160rpx; overflow: hidden; background: #e5e2e1; border-radius: 16rpx; }
	.product-image image { width: 100%; height: 100%; }
	.product-info { position: absolute; top: 24rpx; left: 296rpx; width: 332rpx; height: 182rpx; }
	.product-name { display: block; color: #1c1b1b; font-size: 32rpx; font-weight: 500; line-height: 42rpx; }
	.stock { display: flex; align-items: center; box-sizing: border-box; width: 200rpx; height: 42rpx; margin-top: 8rpx; padding: 4rpx 16rpx; color: #3f4a36; font-size: 24rpx; line-height: 36rpx; letter-spacing: .2rpx; background: #f6f6f6; border-radius: 200rpx; }
	.price { position: absolute; bottom: 0; left: 0; color: #f97316; font-family: Arial, sans-serif; font-size: 40rpx; font-weight: 700; line-height: 50rpx; }
	.quantity { position: absolute; right: 0; bottom: 2rpx; display: grid; grid-template-columns: 40rpx 60rpx 40rpx; align-items: center; width: 140rpx; height: 44rpx; }
	.quantity image,
	.quantity .qty-btn { width: 40rpx; height: 40rpx; }
	.quantity .qty-btn.disabled { opacity: .45; pointer-events: none; }
	.quantity text { color: #000; font-size: 32rpx; font-weight: 500; line-height: 44rpx; text-align: center; }
	.add-more { display: flex; align-items: center; justify-content: center; box-sizing: border-box; width: 690rpx; height: 88rpx; margin: 10rpx 30rpx 40rpx; color: #f97316; border: 2rpx dashed #f97316; border-radius: 24rpx; }
	.add-more image { width: 21rpx; height: 21rpx; margin-right: 16rpx; }
	.add-more text { font-size: 32rpx; line-height: 48rpx; }
	.bottom-bar { position: fixed; z-index: 20; bottom: 0; left: 0; box-sizing: border-box; width: 100%; height: 294rpx; background: #fff; border-top: 2rpx solid rgba(0,0,0,.06); }
	.summary { position: absolute; top: 30rpx; left: 30rpx; display: flex; align-items: flex-end; justify-content: space-between; width: 690rpx; }
	.summary-left { display: flex; flex-direction: column; color: #414755; font-size: 24rpx; line-height: 32rpx; }
	.postage { margin-top: 8rpx; color: #c1c6d7; }
	.summary-right { display: flex; align-items: center; padding-bottom: 8rpx; color: #414755; font-size: 32rpx; line-height: 48rpx; }
	.total { margin-left: 9rpx; color: #f97316; font-family: "Courier New", monospace; font-size: 36rpx; font-weight: 700; line-height: 36rpx; letter-spacing: -.72rpx; }
	.submit-button { position: absolute; top: 132rpx; left: 30rpx; display: flex; align-items: center; justify-content: center; width: 690rpx; height: 96rpx; margin: 0; padding: 0; color: #fff; font-size: 32rpx; font-weight: 500; line-height: 48rpx; background: linear-gradient(90deg,#fb3b19,#f97316); border: 0; border-radius: 200rpx; }
	.submit-button::after { border: 0; }
	.submit-button:active { opacity: .9; }

	.picker-overlay { position: fixed; z-index: 1000; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,.55); }
	.picker-sheet { position: absolute; bottom: 0; left: 0; box-sizing: border-box; width: 100%; height: 1120rpx; overflow: hidden; background: linear-gradient(180deg,#fffaeb 0%,#fff 18%); border-radius: 48rpx 48rpx 0 0; box-shadow: 0 -20rpx 40rpx rgba(0,0,0,.12); }
	.drag-handle { position: absolute; top: 24rpx; left: 50%; width: 96rpx; height: 8rpx; background: #d1d5db; border-radius: 20rpx; opacity: .5; transform: translateX(-50%); }
	.sheet-title { position: absolute; top: 56rpx; left: 0; width: 100%; color: #1f2937; font-size: 36rpx; font-weight: 500; line-height: 52rpx; text-align: center; }
	.sheet-search { position: absolute; top: 128rpx; left: 30rpx; display: flex; align-items: center; box-sizing: border-box; width: 690rpx; height: 76rpx; padding: 0 20rpx; background: #fff; border: 2rpx solid rgba(0,0,0,.06); border-radius: 200rpx; }
	.sheet-search image { width: 36rpx; height: 36rpx; }
	.sheet-search input { flex: 1; height: 72rpx; margin-left: 16rpx; color: rgba(0,0,0,.65); font-size: 28rpx; }
	.sheet-list { position: absolute; top: 228rpx; left: 0; box-sizing: border-box; width: 100%; height: 700rpx; padding: 0 30rpx 20rpx; }
	.sheet-empty { display: flex; align-items: center; justify-content: center; height: 240rpx; color: rgba(0,0,0,.35); font-size: 28rpx; }
	.sheet-card { position: relative; box-sizing: border-box; width: 690rpx; height: 200rpx; margin-bottom: 16rpx; background: #fff; border-radius: 24rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.03); }
	.sheet-check { position: absolute; top: 78rpx; left: 24rpx; width: 44rpx; height: 44rpx; }
	.sheet-image { position: absolute; top: 28rpx; left: 88rpx; width: 144rpx; height: 144rpx; overflow: hidden; background: #e5e2e1; border-radius: 16rpx; }
	.sheet-image image { width: 100%; height: 100%; }
	.sheet-info { position: absolute; top: 24rpx; left: 256rpx; width: 400rpx; height: 152rpx; }
	.sheet-name { display: block; overflow: hidden; color: #1c1b1b; font-size: 30rpx; font-weight: 500; line-height: 40rpx; white-space: nowrap; text-overflow: ellipsis; }
	.sheet-stock { display: inline-flex; margin-top: 8rpx; padding: 2rpx 14rpx; color: #3f4a36; font-size: 22rpx; line-height: 34rpx; background: #f6f6f6; border-radius: 200rpx; }
	.sheet-bottom { position: absolute; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; }
	.sheet-price { color: #f97316; font-family: Arial, sans-serif; font-size: 36rpx; font-weight: 700; line-height: 44rpx; }
	.sheet-bottom .quantity { position: static; }
	.sheet-footer { position: absolute; bottom: 0; left: 0; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; width: 100%; height: 180rpx; padding: 0 30rpx 40rpx; background: #fff; border-top: 2rpx solid rgba(0,0,0,.06); }
	.sheet-count { color: #414755; font-size: 28rpx; line-height: 40rpx; }
	.sheet-confirm { display: flex; align-items: center; justify-content: center; width: 280rpx; height: 88rpx; margin: 0; padding: 0; color: #fff; font-size: 30rpx; font-weight: 500; line-height: 44rpx; background: linear-gradient(90deg,#fb3b19,#f97316); border: 0; border-radius: 200rpx; }
	.sheet-confirm::after { border: 0; }
</style>
