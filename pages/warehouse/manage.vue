<template>
	<view class="warehouse-page">
		<image class="header-bg" src="/static/common/header-bg.png" mode="aspectFill" />
		<page-nav class="page-nav-abs" :title="warnOnly ? '库存预警' : '仓库管理'" back-icon="/static/warehouse/back.svg" transparent :auto-back="false" fallback="/pages/workbench/warehouse-opened" @back="goBack" />

		<view class="summary-card">
			<text class="summary-label">总库存</text>
			<view class="summary-value"><text>{{ warehouseInfo.stock_total }}</text><text>盒</text></view>
			<image class="summary-art" src="/static/warehouse/summary-art.png" mode="aspectFit" />
			<view
				class="warning-row"
				:class="{ active: warnOnly, safe: !warnOnly && !warnCount, danger: !warnOnly && warnCount > 0 }"
				@tap="showWarnings"
			>
				<image class="warning-icon" src="/static/warehouse/warning.png" mode="aspectFit" />
				<text>{{ warnBannerText }}</text>
				<image class="warning-arrow" :class="{ flipped: warnOnly }" src="/static/warehouse/warning-arrow.svg" mode="aspectFit" />
			</view>
		</view>

		<view class="search-box">
			<image src="/static/warehouse/search.svg" mode="aspectFit" />
					<input v-model="keyword" placeholder="搜索商品名称" placeholder-class="search-placeholder" />
		</view>

		<scroll-view v-if="!warnOnly" class="categories" scroll-x :show-scrollbar="false" :enhanced="true">
			<view class="category-inner">
				<view v-for="item in categories" :key="item" class="category" :class="{ active: category === item }" @tap="category = item">{{ item }}</view>
			</view>
		</scroll-view>
		<view v-else class="warn-tip">仅展示库存低于或等于下限的商品</view>

		<view class="product-list" :class="{ 'warn-mode': warnOnly }">
			<view v-for="item in filteredProducts" :key="item.id" class="product-card" @tap="openProduct(item)">
				<image class="product-image" :src="item.image || '/static/common/product-placeholder.png'" mode="aspectFill" />
				<text class="product-name">{{ item.name }}</text>
				<text class="limit">下限：{{ item.limit }}盒</text>
				<text class="stock" :class="{ warning: isLowStock(item) }">库存：{{ item.stock }}盒</text>
				<text class="status" :class="item.statusClass">{{ item.status_text }}</text>
				<view class="set-limit" @tap.stop="setLimit(item)">
					<text>设置下限</text><image src="/static/warehouse/row-arrow.svg" mode="aspectFit" />
				</view>
			</view>
			<view v-if="!filteredProducts.length" class="list-empty">{{ warnOnly ? '暂无需要补货的商品' : '暂无库存商品' }}</view>
		</view>

		<view class="record-float" @tap="openRecords">
			<view class="record-circle">
				<image class="record-bg" src="/static/warehouse/record-bg.svg" mode="aspectFit" />
				<image class="record-icon-a" src="/static/warehouse/record-icon-a.svg" mode="aspectFit" />
				<image class="record-icon-b" src="/static/warehouse/record-icon-b.svg" mode="aspectFit" />
			</view>
			<text>库存记录</text>
		</view>

		<stock-limit-sheet
			v-if="showLimitSheet"
			:product-name="activeProduct && activeProduct.name"
			:stock="activeProduct && Number(activeProduct.stock)"
			:limit="activeProduct && Number(activeProduct.stock_limit)"
			@close="showLimitSheet = false"
			@save="saveLimit"
		/>
	</view>
</template>

<script>
	import StockLimitSheet from '@/components/stock-limit-sheet/stock-limit-sheet.vue'
	import PageNav from '@/components/page-nav/page-nav.vue'
	import { warehouseApi } from '@/api/index'
	import { navigateBack } from '@/utils/nav'

	export default {
		components: { StockLimitSheet, PageNav },
		data() {
			return {
				keyword: '',
				warnOnly: false,
				warnFromRoute: false,
				warehouseInfo: { stock_total: 0, warn_count: 0, opened: false },
				categoryMap: { '全部': 0 },
				category: '全部',
				showLimitSheet: false,
				activeProduct: null,
				categories: ['全部', '食品', '饮料', '运动', '日用品', '电器', '服装'],
				products: []
			}
		},
		onLoad(options) {
			this.warnFromRoute = !!(options && (options.warn === '1' || options.warn === 1))
			this.warnOnly = this.warnFromRoute
			this.loadWarehouse()
		},
		onShow() {
			if (this.warehouseInfo.opened) this.loadWarehouse()
		},
		computed: {
			warnCount() {
				return this.products.filter(item => this.isLowStock(item)).length
			},
			warnBannerText() {
				if (this.warnOnly) return '正在查看需补货商品，点击返回全部'
				const count = this.warnCount
				if (count > 0) return '库存预警：' + count + '项商品需要补货'
				return '库存充足，暂无需要补货的商品'
			},
			filteredProducts() {
				let list = this.products
				if (this.warnOnly) {
					list = list.filter(item => this.isLowStock(item))
				} else if (this.category !== '全部') {
					const categoryId = Number(this.categoryMap[this.category]) || 0
					if (categoryId) {
						list = list.filter(item => Number(item.category_id) === categoryId)
					}
				}
				const keyword = this.keyword.trim()
				if (!keyword) return list
				return list.filter(item => String(item.name || '').includes(keyword))
			}
		},
		methods: {
			isLowStock(item) {
				const limit = Number(item && item.limit)
				const stock = Number(item && item.stock)
				return limit > 0 && stock <= limit
			},
			normalizeStockItem(item) {
				const limit = Number(item.stock_limit) || 0
				const stock = Number(item.stock) || 0
				let status = item.status || 'normal'
				let statusText = item.status_text || '正常'
				if (stock <= 0) {
					status = 'empty'
					statusText = '已缺货'
				} else if (limit > 0 && stock <= limit) {
					status = 'low'
					statusText = '库存偏低'
				} else if (status === 'low') {
					status = 'normal'
					statusText = '正常'
				}
				return Object.assign({}, item, {
					limit,
					stock,
					status,
					status_text: statusText,
					statusClass: status
				})
			},
			async loadWarehouse() {
				try {
					const info = await warehouseApi.info()
					this.warehouseInfo = Object.assign(this.warehouseInfo, info || {})
					if (this.warehouseInfo.opened) await this.loadStocks()
				} catch (e) {}
			},
			async loadStocks() {
				if (!this.warehouseInfo.opened) return
				try {
					const result = await warehouseApi.stocks({
						keyword: '',
						category_id: 0
					})
					const categories = (result && result.categories) || []
					const normalCategories = categories.filter(item => item.name !== '全部')
					this.categoryMap = normalCategories.reduce((map, item) => {
						map[item.name] = item.id
						return map
					}, { '全部': 0 })
					this.categories = ['全部'].concat(normalCategories.map(item => item.name))
					this.products = ((result && result.list) || []).map(item => this.normalizeStockItem(item))
					this.warehouseInfo.warn_count = this.warnCount
				} catch (e) {}
			},
			goBack() {
				if (this.warnOnly && !this.warnFromRoute) {
					this.exitWarnMode()
					return
				}
				navigateBack('/pages/workbench/warehouse-opened')
			},
			enterWarnMode() {
				this.warnOnly = true
				this.warnFromRoute = false
				this.category = '全部'
				this.keyword = ''
				this.loadStocks()
			},
			exitWarnMode() {
				this.warnOnly = false
				this.warnFromRoute = false
				this.loadStocks()
			},
			showWarnings() {
				if (this.warnOnly) {
					this.exitWarnMode()
					uni.showToast({ title: '已显示全部库存', icon: 'none' })
					return
				}
				if (!this.warnCount) {
					uni.showToast({ title: '暂无需要补货的商品', icon: 'none' })
					return
				}
				this.enterWarnMode()
			},
			openProduct(item) {
				const goodsId = item && item.goods_id
				if (!goodsId) {
					uni.showToast({ title: '商品信息异常', icon: 'none' })
					return
				}
				uni.navigateTo({ url: '/pages/product/detail?id=' + goodsId })
			},
			setLimit(item) {
				this.activeProduct = item
				this.showLimitSheet = true
			},
			async persistLimit(value) {
				if (!this.activeProduct) return
				try {
					await warehouseApi.setLimit(this.activeProduct.id, value)
					this.showLimitSheet = false
					await this.loadWarehouse()
					uni.showToast({ title: '保存成功', icon: 'success' })
				} catch (e) {}
			},
			saveLimit(value) {
				this.persistLimit(value)
			},
			openRecords() { uni.navigateTo({ url: '/pages/warehouse/records' }) }
		}
	}
</script>

<style scoped>
	.warehouse-page { position: relative; box-sizing: border-box; width: 100%; min-height: 1900rpx; overflow: hidden; color: #1a1c1c; background: linear-gradient(180deg,#fffaf2 1.014%,#f9f9f9 18.132%); font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.header-bg { position: absolute; top: 0; left: 0; width: 750rpx; height: 418rpx; opacity: .13; transform: scaleY(-1); }
	.page-nav-abs { position: absolute; top: 0; left: 0; z-index: 10; width: 100%; }
	.summary-card { position: absolute; top: 216rpx; left: 30rpx; box-sizing: border-box; width: 690rpx; height: 266rpx; background: linear-gradient(180deg,rgba(255,255,255,.1),#fff); border: 2rpx solid #fff; border-radius: 24rpx; backdrop-filter: blur(8rpx); }
	.summary-label { position: absolute; top: 28rpx; left: 28rpx; color: rgba(0,0,0,.85); font-size: 28rpx; line-height: 40rpx; }
	.summary-value { position: absolute; top: 78rpx; left: 28rpx; display: flex; align-items: baseline; }
	.summary-value text:first-child { color: #000; font-size: 40rpx; font-weight: 500; line-height: 48rpx; }
	.summary-value text:last-child { margin-left: 12rpx; color: rgba(0,0,0,.45); font-size: 28rpx; line-height: 40rpx; }
	.summary-art { position: absolute; top: 10rpx; right: 32rpx; width: 206rpx; height: 178rpx; opacity: .4; }
	.warning-row { position: absolute; bottom: 30rpx; left: 30rpx; display: flex; align-items: center; box-sizing: border-box; width: 630rpx; height: 82rpx; background: linear-gradient(181deg,#fff 0%,#f3f4f6 137%); border: 2rpx solid #fff; border-radius: 16rpx; }
	.warning-row.danger { background: linear-gradient(181deg,#fff 0%,#ffd0cd 137%); }
	.warning-row.safe { background: linear-gradient(181deg,#fff 0%,#e8f6dc 137%); }
	.warning-row.active { background: linear-gradient(181deg,#fff5f4 0%,#ffc2bc 137%); border-color: #ffd4cf; }
	.warning-icon { width: 64rpx; height: 58rpx; margin-left: 10rpx; }
	.warning-row.safe .warning-icon { opacity: .55; }
	.warning-row text { flex: 1; margin-left: 12rpx; color: #000; font-size: 26rpx; line-height: 36rpx; }
	.warning-row.safe text { color: rgba(0,0,0,.65); }
	.warning-arrow { width: 36rpx; height: 36rpx; margin-right: 18rpx; transform: rotate(90deg) scaleY(-1); transition: transform .2s ease; }
	.warning-arrow.flipped { transform: rotate(-90deg) scaleY(-1); }
	.search-box { position: absolute; top: 502rpx; left: 30rpx; display: flex; align-items: center; box-sizing: border-box; width: 690rpx; height: 76rpx; padding: 0 20rpx; background: #fff; border-radius: 200rpx; }
	.search-box image { flex: 0 0 auto; width: 36rpx; height: 36rpx; }
	.search-box input { flex: 1; height: 76rpx; margin-left: 16rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 76rpx; }
	.search-placeholder { color: rgba(0,0,0,.45); }
	.categories { position: absolute; top: 598rpx; left: 30rpx; width: 720rpx; height: 60rpx; white-space: nowrap; }
	.categories::-webkit-scrollbar { display: none; width: 0; height: 0; background: transparent; }
	.warn-tip { position: absolute; top: 598rpx; left: 30rpx; width: 690rpx; height: 60rpx; color: #fb3b19; font-size: 24rpx; line-height: 60rpx; }
	.category-inner { display: inline-flex; align-items: flex-start; height: 60rpx; padding-right: 30rpx; }
	.category { position: relative; flex: 0 0 auto; min-width: 60rpx; height: 60rpx; margin-right: 48rpx; color: rgba(0,0,0,.65); font-size: 24rpx; line-height: 42rpx; text-align: left; }
	.category:first-child { min-width: 68rpx; font-size: 28rpx; }
	.category.active { color: #f97316; font-weight: 500; }
	.category.active::after { position: absolute; bottom: 0; left: 10rpx; width: 36rpx; height: 6rpx; background: #f97316; border-radius: 16rpx; content: ''; }
	.product-list { position: absolute; top: 676rpx; left: 30rpx; width: 690rpx; padding-bottom: 200rpx; }
	.list-empty { padding: 80rpx 0; color: rgba(0,0,0,.35); font-size: 28rpx; text-align: center; }
	.product-card { position: relative; box-sizing: border-box; width: 690rpx; height: 222rpx; margin-bottom: 20rpx; background: #fff; border-radius: 24rpx; }
	.product-image { position: absolute; top: 16rpx; left: 12rpx; width: 190rpx; height: 190rpx; border-radius: 24rpx; }
	.product-name { position: absolute; top: 24rpx; left: 222rpx; width: 308rpx; color: #000; font-size: 28rpx; line-height: normal; }
	.limit { position: absolute; top: 108rpx; left: 222rpx; color: rgba(0,0,0,.45); font-size: 24rpx; line-height: 34rpx; }
	.stock { position: absolute; top: 160rpx; left: 222rpx; color: #000; font-size: 26rpx; font-weight: 500; line-height: 34rpx; }
	.stock.warning { color: #fb3b19; }
	.status { position: absolute; top: 28rpx; right: 30rpx; box-sizing: border-box; height: 36rpx; padding: 0 8rpx; font-size: 20rpx; line-height: 36rpx; border-radius: 10rpx; }
	.status.low { color: rgba(255,0,0,.65); background: rgba(255,0,0,.08); }
	.status.normal { color: #62c10e; background: rgba(98,193,14,.08); }
	.status.empty { color: #fff; background: rgba(255,79,49,.85); }
	.set-limit { position: absolute; right: 22rpx; bottom: 29rpx; display: flex; align-items: center; color: #f97316; font-size: 24rpx; line-height: 34rpx; }
	.set-limit image { width: 24rpx; height: 24rpx; margin-left: 4rpx; transform: rotate(90deg) scaleY(-1); }
	.record-float { position: fixed; z-index: 10; right: 30rpx; bottom: 120rpx; display: flex; flex-direction: column; align-items: center; width: 124rpx; color: #e33734; font-size: 20rpx; }
	.record-circle { position: relative; z-index: 1; width: 124rpx; height: 112rpx; }
	.record-bg { position: absolute; top: 0; left: 0; width: 124rpx; height: 124rpx; }
	.record-icon-a, .record-icon-b { position: absolute; top: 36rpx; left: 39rpx; width: 46rpx; height: 53rpx; }
	.record-float > text { position: relative; z-index: 2; box-sizing: border-box; width: 110rpx; height: 38rpx; padding-top: 1rpx; text-align: center; background: linear-gradient(180deg,#fddcd8,#ffedaf); border: 2rpx solid #fcd1ab; border-radius: 48rpx; }
</style>
