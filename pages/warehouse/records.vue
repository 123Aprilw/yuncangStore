<template>
	<view class="records-page">
		<view class="sticky-header">
			<page-nav title="库存记录" back-icon="/static/warehouse-records/back.svg" :auto-back="false" fallback="/pages/warehouse/manage" @back="goBack" @layout="onNavLayout" />
			<view class="control-area" :class="{ 'has-filter': filterActive }">
				<view class="search-box">
					<image src="/static/warehouse-records/search.svg" mode="aspectFit" />
					<input
						v-model="keyword"
						placeholder="搜索商品名称"
						placeholder-class="search-placeholder"
						confirm-type="search"
						@confirm="refresh"
					/>
				</view>
				<view class="filter-button" :class="{ active: filterActive }" @tap="openFilter">
					<image src="/static/warehouse-records/filter.svg" mode="aspectFit" />
				</view>
				<view class="tabs">
					<view
						v-for="item in tabs"
						:key="item.value"
						class="tab"
						:class="{ active: activeTab === item.value }"
						@tap="changeTab(item.value)"
					>{{ item.label }}</view>
				</view>
				<view v-if="filterActive" class="filter-tags">
					<view class="filter-tag" @tap="openFilter">
						<text class="filter-tag-label">变动时间</text>
						<text class="filter-tag-text">{{ dateFilterText }}</text>
					</view>
					<text class="filter-tag-clear" @tap.stop="clearDateFilter">清除</text>
				</view>
			</view>
		</view>

		<scroll-view class="record-list" scroll-y :show-scrollbar="false" :lower-threshold="80" :style="{ paddingTop: listPaddingTop }" @scrolltolower="loadMore">
			<view v-for="item in records" :key="item.id" class="record-card" :class="item.direction">
				<view class="product-header">
					<image class="product-image" :src="item.image || '/static/common/product-placeholder.png'" mode="aspectFill" />
					<view class="product-info">
						<text class="product-name">{{ item.goods_name }}</text>
						<text class="price">{{ item.unit_price_text }}</text>
					</view>
					<text class="change" :class="item.direction">{{ item.change_text }}</text>
				</view>
				<view class="record-details">
					<view class="detail-line">
						<text>{{ isInbound(item) ? '来源:' : '去向:' }}</text>
						<text>{{ item.source_text }}</text>
					</view>
					<text v-if="item.show_delivery && item.receiver_name" class="recipient">
						收货人: {{ item.receiver_name }} {{ item.receiver_mobile }}
					</text>
					<view v-if="item.show_delivery" class="shipping-status">
						<view :class="statusDotClass(item)" />
						<text>{{ item.shipped_text }}</text>
					</view>
				</view>
				<view class="record-footer">
					<text>{{ item.createtime_text }}</text>
					<text class="separator">|</text>
					<text>变动后: {{ item.after_qty }}盒</text>
					<view v-if="item.order_id" class="order-link" @tap="viewOrder(item)">
						<text>查看订单</text>
						<image src="/static/warehouse-records/link-arrow.svg" mode="aspectFit" />
					</view>
				</view>
			</view>
			<view v-if="loading && !records.length" class="empty">加载中...</view>
			<view v-else-if="!records.length" class="empty">{{ emptyText }}</view>
			<view v-else-if="loading" class="load-more">加载中...</view>
			<view v-else-if="!hasMore" class="load-more">没有更多了</view>
		</scroll-view>

		<view v-if="filterVisible" class="filter-layer">
			<view class="filter-mask" @tap="closeFilter" />
			<view class="filter-sheet" @tap.stop>
				<view class="filter-handle" />
				<text class="filter-title">筛选库存记录</text>
				<view class="filter-section">
					<text class="filter-label">变动时间</text>
					<view class="filter-presets">
						<text
							v-for="item in datePresets"
							:key="item.key"
							:class="{ active: draftPreset === item.key }"
							@tap="applyPreset(item.key)"
						>{{ item.label }}</text>
					</view>
					<view class="filter-date-row">
						<picker mode="date" :value="draftStartDate" @change="changeDraftDate('start', $event)">
							<view class="filter-date-box">
								<text :class="{ placeholder: !draftStartDate }">{{ draftStartDate || '开始日期' }}</text>
							</view>
						</picker>
						<text class="filter-date-sep">至</text>
						<picker mode="date" :value="draftEndDate" :start="draftStartDate" @change="changeDraftDate('end', $event)">
							<view class="filter-date-box">
								<text :class="{ placeholder: !draftEndDate }">{{ draftEndDate || '结束日期' }}</text>
							</view>
						</picker>
					</view>
				</view>
				<view class="filter-actions">
					<button class="filter-reset" @tap="resetFilter">重置</button>
					<button class="filter-confirm" @tap="confirmFilter">确定</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { warehouseApi } from '@/api/index'
	import PageNav from '@/components/page-nav/page-nav.vue'
	import { getCapsuleLayout, pxToRpx } from '@/utils/capsule'
	import { navigateBack } from '@/utils/nav'

	export default {
		components: { PageNav },
		data() {
			return {
				navBarHeight: getCapsuleLayout().navBarHeight,
				keyword: '',
				activeTab: 'all',
				tabs: [
					{ label: '全部', value: 'all' },
					{ label: '入库', value: 'in' },
					{ label: '出库', value: 'out' }
				],
				records: [],
				page: 1,
				hasMore: true,
				loading: false,
				requestSeq: 0,
				searchTimer: null,
				startDate: '',
				endDate: '',
				filterVisible: false,
				draftStartDate: '',
				draftEndDate: '',
				draftPreset: '',
				datePresets: [
					{ key: '7d', label: '近7天' },
					{ key: '30d', label: '近30天' },
					{ key: 'month', label: '本月' }
				]
			}
		},
		computed: {
			filterActive() {
				return !!(this.startDate || this.endDate)
			},
			dateFilterText() {
				if (this.startDate && this.endDate) return this.startDate + ' 至 ' + this.endDate
				if (this.startDate) return this.startDate + ' 起'
				if (this.endDate) return '至 ' + this.endDate
				return ''
			},
			listPaddingTop() {
				const extra = this.filterActive ? 76 : 0
				return (pxToRpx(this.navBarHeight) + 166 + extra + 20) + 'rpx'
			},
			emptyText() {
				if (this.filterActive || this.keyword.trim()) return '未找到符合条件的库存记录'
				return '暂无库存记录'
			}
		},
		onLoad() {
			this.navBarHeight = getCapsuleLayout(true).navBarHeight
			this.refresh()
		},
		watch: {
			keyword() {
				clearTimeout(this.searchTimer)
				this.searchTimer = setTimeout(() => this.refresh(), 400)
			}
		},
		methods: {
			onNavLayout(layout) {
				if (layout && layout.navBarHeight) this.navBarHeight = layout.navBarHeight
			},
			goBack() {
				navigateBack('/pages/warehouse/manage')
			},
			isInbound(item) {
				return Number(item && item.change_qty) > 0
			},
			statusDotClass(item) {
				const tone = (item && item.status_tone) || (item && item.shipped ? 'done' : 'pending')
				if (tone === 'done') return 'blue'
				if (tone === 'closed') return 'gray'
				return 'orange'
			},
			formatPrice(value) {
				const price = Number(value)
				if (!Number.isFinite(price) || price <= 0) return '单价: 暂无'
				const text = String(price).replace(/\.00$/, '')
				return '单价: ¥' + text + '/盒'
			},
			formatDate(date) {
				const y = date.getFullYear()
				const m = String(date.getMonth() + 1).padStart(2, '0')
				const d = String(date.getDate()).padStart(2, '0')
				return y + '-' + m + '-' + d
			},
			presetRange(key) {
				const end = new Date()
				const start = new Date()
				if (key === '7d') start.setDate(end.getDate() - 6)
				else if (key === '30d') start.setDate(end.getDate() - 29)
				else if (key === 'month') start.setDate(1)
				return { start: this.formatDate(start), end: this.formatDate(end) }
			},
			matchPreset(start, end) {
				if (!start || !end) return ''
				for (const item of this.datePresets) {
					const range = this.presetRange(item.key)
					if (range.start === start && range.end === end) return item.key
				}
				return ''
			},
			openFilter() {
				this.draftStartDate = this.startDate
				this.draftEndDate = this.endDate
				this.draftPreset = this.matchPreset(this.startDate, this.endDate)
				this.filterVisible = true
			},
			closeFilter() {
				this.filterVisible = false
			},
			applyPreset(key) {
				const range = this.presetRange(key)
				this.draftPreset = key
				this.draftStartDate = range.start
				this.draftEndDate = range.end
			},
			changeDraftDate(type, event) {
				const value = event.detail.value
				if (type === 'start') this.draftStartDate = value
				else this.draftEndDate = value
				this.draftPreset = this.matchPreset(this.draftStartDate, this.draftEndDate)
			},
			resetFilter() {
				this.draftStartDate = ''
				this.draftEndDate = ''
				this.draftPreset = ''
			},
			confirmFilter() {
				if (this.draftStartDate && this.draftEndDate && this.draftStartDate > this.draftEndDate) {
					uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
					return
				}
				this.startDate = this.draftStartDate
				this.endDate = this.draftEndDate
				this.filterVisible = false
				this.refresh()
			},
			clearDateFilter() {
				this.startDate = ''
				this.endDate = ''
				this.draftStartDate = ''
				this.draftEndDate = ''
				this.draftPreset = ''
				this.refresh()
			},
			buildSourceText(raw, inbound) {
				const orderNo = raw.order_no && raw.order_no !== '暂无' ? raw.order_no : ''
				const remark = raw.remark && raw.remark !== '暂无' ? raw.remark : ''
				const orderTypeText = raw.order_type_text || ''
				if (raw.source_text && raw.source_text !== '暂无') return raw.source_text
				if (orderTypeText && orderNo) return orderTypeText + ' ' + orderNo
				if (orderNo) return (inbound ? '采购订单' : '代发订单') + ' ' + orderNo
				if (remark) return remark
				const typeMap = {
					in: '采购入库',
					out: '代发出库',
					unlock: '代发取消回滚',
					adjust: '后台调整库存'
				}
				if (typeMap[raw.type]) return typeMap[raw.type]
				return inbound ? '仓库入库' : '仓库出库'
			},
			normalizeRecord(raw) {
				const changeQty = Number(raw.change_qty) || 0
				const absQty = Math.abs(changeQty)
				const inbound = changeQty > 0
				const direction = inbound ? 'inbound' : 'outbound'
				const sign = inbound ? '+' : '-'
				const orderType = raw.order_type || (raw.type === 'out' ? 'delivery' : 'purchase')
				const shippedText = raw.shipped_text && raw.shipped_text !== '暂无'
					? raw.shipped_text
					: (raw.shipped ? '已发货' : '待发货')
				return Object.assign({}, raw, {
					change_qty: changeQty,
					change_text: raw.change_text || (sign + absQty + '盒'),
					direction: direction,
					unit_price_text: raw.unit_price_text || this.formatPrice(raw.unit_price),
					source_text: this.buildSourceText(raw, inbound),
					order_type: orderType,
					show_delivery: typeof raw.show_delivery === 'boolean'
						? raw.show_delivery
						: (!inbound && orderType === 'delivery'),
					shipped: !!raw.shipped,
					shipped_text: shippedText,
					status_tone: raw.status_tone || (raw.shipped ? 'done' : 'pending'),
					createtime_text: raw.createtime_text || '暂无'
				})
			},
			changeTab(value) {
				if (this.activeTab === value) return
				this.activeTab = value
				this.refresh()
			},
			async load(reset = false) {
				if (!reset && (this.loading || !this.hasMore)) return
				const requestId = ++this.requestSeq
				const tab = this.activeTab
				this.loading = true
				const page = reset ? 1 : this.page + 1
				try {
					const data = await warehouseApi.records({
						page,
						limit: 20,
						type: tab === 'all' ? '' : tab,
						keyword: this.keyword.trim(),
						start_time: this.startDate,
						end_time: this.endDate
					})
					if (requestId !== this.requestSeq) return
					let list = ((data && data.list) || []).map(item => this.normalizeRecord(item))
					if (tab === 'in') {
						list = list.filter(item => item.change_qty > 0)
					} else if (tab === 'out') {
						list = list.filter(item => item.change_qty < 0)
					}
					this.records = reset ? list : this.records.concat(list)
					this.page = page
					this.hasMore = this.records.length < Number((data && data.total) || 0)
				} catch (e) {
					if (requestId !== this.requestSeq) return
					if (reset) this.records = []
				} finally {
					if (requestId === this.requestSeq) this.loading = false
				}
			},
			refresh() {
				this.hasMore = true
				this.load(true)
			},
			loadMore() {
				this.load(false)
			},
			viewOrder(item) {
				if (!item || !item.order_id) return
				uni.navigateTo({ url: '/pages/order/detail?id=' + item.order_id })
			}
		}
	}
</script>

<style scoped>
	.records-page { box-sizing: border-box; width: 100%; height: 100vh; overflow: hidden; color: #1a1c1c; background: #f9f9f9; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.sticky-header { position: fixed; top: 0; left: 0; z-index: 10; width: 100%; background: #fff; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.04); }
	.control-area { position: relative; box-sizing: border-box; width: 100%; height: 166rpx; background: #fff; }
	.control-area.has-filter { height: 242rpx; }
	.search-box { position: absolute; top: 8rpx; left: 30rpx; display: flex; align-items: center; box-sizing: border-box; width: 598rpx; height: 76rpx; padding: 0 20rpx; background: #f9f9f9; border-radius: 200rpx; }
	.search-box image { width: 36rpx; height: 36rpx; }
	.search-box input { flex: 1; height: 76rpx; margin-left: 16rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 76rpx; }
	.search-placeholder { color: rgba(0,0,0,.45); }
	.filter-button { position: absolute; top: 12rpx; right: 30rpx; display: flex; align-items: center; justify-content: center; width: 68rpx; height: 68rpx; background: rgba(0,0,0,.02); border-radius: 50%; }
	.filter-button image { width: 36rpx; height: 36rpx; }
	.filter-button.active { background: rgba(249,115,22,.12); box-shadow: 0 0 0 2rpx rgba(249,115,22,.35); }
	.tabs { position: absolute; bottom: 0; left: 60rpx; display: flex; width: 630rpx; height: 58rpx; }
	.control-area.has-filter .tabs { bottom: 76rpx; }
	.tab { position: relative; flex: 1; color: rgba(0,0,0,.65); font-size: 24rpx; line-height: 50rpx; text-align: center; }
	.tab.active { color: #f97316; font-size: 28rpx; font-weight: 500; }
	.tab.active::after { position: absolute; bottom: 0; left: 50%; width: 36rpx; height: 6rpx; background: #f97316; border-radius: 16rpx; content: ''; transform: translateX(-50%); }
	.filter-tags { position: absolute; right: 30rpx; bottom: 12rpx; left: 30rpx; display: flex; align-items: center; height: 56rpx; }
	.filter-tag { display: flex; align-items: center; box-sizing: border-box; max-width: 580rpx; height: 56rpx; padding: 0 20rpx; background: #fff7ed; border-radius: 28rpx; box-shadow: inset 0 0 0 2rpx rgba(249,115,22,.25); }
	.filter-tag-label { flex: none; margin-right: 12rpx; color: #f97316; font-size: 24rpx; font-weight: 500; }
	.filter-tag-text { overflow: hidden; color: #666; font-size: 24rpx; text-overflow: ellipsis; white-space: nowrap; }
	.filter-tag-clear { flex: none; margin-left: 20rpx; color: #999; font-size: 24rpx; line-height: 56rpx; }
	.record-list { box-sizing: border-box; width: 100%; height: 100vh; padding: 0 30rpx 40rpx; }
	.record-card { position: relative; box-sizing: border-box; width: 690rpx; margin-bottom: 20rpx; padding: 30rpx; background: #fff; border-radius: 24rpx; }
	.record-card.outbound { min-height: 398rpx; }
	.record-card.inbound { min-height: 304rpx; }
	.product-header { position: relative; height: 84rpx; }
	.product-image { position: absolute; top: 4rpx; left: 0; width: 68rpx; height: 68rpx; border-radius: 16rpx; }
	.product-info { position: absolute; top: 0; left: 86rpx; display: flex; flex-direction: column; width: 430rpx; }
	.product-name { overflow: hidden; color: #000; font-size: 28rpx; font-weight: 500; line-height: 42rpx; white-space: nowrap; text-overflow: ellipsis; }
	.price { margin-top: 12rpx; color: rgba(0,0,0,.45); font-size: 24rpx; line-height: 32rpx; }
	.change { position: absolute; top: 0; right: 0; box-sizing: border-box; height: 42rpx; padding: 4rpx 12rpx; font-family: "Courier New", monospace; font-size: 28rpx; font-weight: 700; line-height: 34rpx; border-radius: 12rpx; }
	.change.outbound { color: #f97316; background: rgba(255,221,176,.3); }
	.change.inbound { color: #62c10e; background: rgba(98,193,14,.1); }
	.record-details { position: absolute; top: 132rpx; left: 30rpx; box-sizing: border-box; width: 630rpx; padding: 16rpx; background: #f9f9f9; border-radius: 24rpx; }
	.outbound .record-details { min-height: 172rpx; }
	.inbound .record-details { min-height: 94rpx; }
	.detail-line { display: flex; gap: 12rpx; color: #414755; font-size: 24rpx; line-height: 44rpx; }
	.detail-line text:last-child { flex: 1; color: #1a1c1c; word-break: break-all; }
	.recipient { display: block; color: #414755; font-size: 24rpx; line-height: 44rpx; }
	.shipping-status { display: flex; align-items: center; height: 44rpx; color: #414755; font-size: 28rpx; line-height: 44rpx; }
	.shipping-status view { width: 16rpx; height: 16rpx; margin-right: 16rpx; border-radius: 50%; }
	.shipping-status .blue { background: #0057c2; }
	.shipping-status .orange { background: #f97316; }
	.shipping-status .gray { background: #9ca3af; }
	.record-footer { position: absolute; right: 30rpx; bottom: 30rpx; left: 30rpx; display: flex; align-items: center; box-sizing: border-box; height: 34rpx; padding-top: 18rpx; color: #414755; font-family: Arial, sans-serif; font-size: 24rpx; line-height: 32rpx; border-top: 2rpx solid #c1c6d7; }
	.separator { margin: 0 16rpx; }
	.order-link { display: flex; align-items: center; margin-left: auto; color: #f97316; font-family: "PingFang SC", sans-serif; }
	.order-link image { width: 9rpx; height: 14rpx; margin-left: 8rpx; }
	.empty { padding-top: 100rpx; color: rgba(0,0,0,.35); font-size: 28rpx; text-align: center; }
	.load-more { padding: 24rpx 0 8rpx; color: rgba(0,0,0,.35); font-size: 24rpx; text-align: center; }
	.filter-layer { position: fixed; z-index: 2000; top: 0; right: 0; bottom: 0; left: 0; }
	.filter-mask { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
	.filter-sheet { position: absolute; bottom: 0; left: 0; box-sizing: border-box; width: 100%; padding: 28rpx 36rpx calc(40rpx + env(safe-area-inset-bottom)); background: linear-gradient(180deg,#fffaf2 0%,#fff 28%); border-radius: 36rpx 36rpx 0 0; box-shadow: 0 -16rpx 40rpx rgba(0,0,0,.1); }
	.filter-handle { width: 72rpx; height: 8rpx; margin: 0 auto 28rpx; background: #e5e7eb; border-radius: 8rpx; }
	.filter-title { display: block; margin-bottom: 36rpx; color: #1f2937; font-size: 34rpx; font-weight: 600; line-height: 48rpx; text-align: center; }
	.filter-section { margin-bottom: 40rpx; }
	.filter-label { display: block; margin-bottom: 20rpx; color: #6b7280; font-size: 26rpx; line-height: 36rpx; }
	.filter-presets { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
	.filter-presets text { flex: 1; height: 64rpx; color: #666; font-size: 26rpx; line-height: 64rpx; text-align: center; background: #f5f5f5; border-radius: 32rpx; }
	.filter-presets text.active { color: #f97316; font-weight: 500; background: #fff7ed; box-shadow: inset 0 0 0 2rpx #fdba74; }
	.filter-date-row { display: flex; align-items: center; gap: 16rpx; }
	.filter-date-row picker { flex: 1; }
	.filter-date-box { display: flex; align-items: center; justify-content: center; box-sizing: border-box; height: 80rpx; padding: 0 20rpx; color: #1f2937; font-size: 28rpx; background: #fff; border: 2rpx solid #eee; border-radius: 16rpx; }
	.filter-date-box .placeholder { color: #999; }
	.filter-date-sep { flex: none; color: #999; font-size: 26rpx; }
	.filter-actions { display: flex; gap: 20rpx; }
	.filter-actions button { flex: 1; height: 88rpx; margin: 0; padding: 0; font-size: 30rpx; line-height: 88rpx; border-radius: 44rpx; }
	.filter-actions button::after { border: 0; }
	.filter-reset { color: #666; background: #f3f4f6; }
	.filter-confirm { color: #fff; background: linear-gradient(90deg,#ff8a37,#fa3b19); }
</style>
