<template>
	<view class="page">
		<image class="header-bg" src="/static/common/header-bg.png" mode="aspectFill" />
		<page-nav class="page-nav-abs" title="订单" :show-back="false" transparent />
		<view class="type-tabs" :style="{ top: typeTabsTop }"><view v-for="(item,i) in types" :key="item.label" class="type-tab" :class="{active:typeIndex===i}" @tap="selectType(i)">{{item.label}}</view></view>
		<scroll-view class="state-tabs" :class="{ even: stateTabsEven }" scroll-x :scroll-into-view="stateScrollInto" scroll-with-animation :show-scrollbar="false" :style="{ top: stateTabsTop }"><view class="state-tabs-inner" :class="{ even: stateTabsEven }"><view v-for="(item,i) in currentStates" :id="'state-tab-' + i" :key="item.label" class="state-tab" :class="{active:stateIndex===i}" @tap="selectState(i)">{{item.label}}</view></view></scroll-view>
		<view class="order-search" :style="{ top: searchTop }">
			<view class="search-input"><image src="/static/product/search.svg"/><input v-model="keyword" placeholder="搜索商品名称" placeholder-class="search-placeholder" confirm-type="search" @confirm="refreshOrders"/></view>
			<view class="filter-button" :class="{active: filterActive}" @tap="openFilter"><image src="/static/product/filter.svg"/></view>
		</view>
		<view v-if="filterActive" class="filter-tags" :style="{ top: filterTagsTop }">
			<view class="filter-tag" @tap="openFilter">
				<text class="filter-tag-label">下单时间</text>
				<text class="filter-tag-text">{{ dateFilterText }}</text>
			</view>
			<text class="filter-tag-clear" @tap.stop="clearDateFilter">清除</text>
		</view>

		<order-list-loader :top="listTop" :loading="loading" :has-more="hasMore" :show-footer="orders.length > 0" @refresh="refreshOrders" @loadmore="loadMore">
			<view class="order-list">
			<view v-for="order in orders" :key="order.id" class="card" hover-class="card-pressed" @tap="detail(order)">
				<view class="head"><text class="order-no">订单编号:{{order.order_no}}</text><text class="badge" :class="statusClass(order.status)">{{order.status_text}}</text></view>
				<view class="divider"/>
				<view v-for="(goods,index) in visibleGoods(order)" :key="goods.sku_id + '-' + index" class="goods">
					<image :src="goods.image || '/static/common/product-placeholder.png'" mode="aspectFill"/>
					<view class="goods-main"><text class="name">{{goods.name}}</text><text v-if="goods.sku_name" class="spec">规格: {{goods.sku_name}}</text><view class="price"><text>商品金额</text><b>￥{{goods.amount || goods.price}}</b></view></view>
					<text class="count">x{{goods.qty}}</text>
				</view>
				<view v-if="order.goods && order.goods.length>2" class="more">共{{order.goods.length}}盒商品</view>
				<view class="info" :class="{'delivery-info': typeIndex === 1}"><view><text>{{typeIndex === 0 ? '提货方式:' : '收货人:'}}</text><text>{{typeIndex === 0 ? order.pickup_text : order.receiver_name}}</text><text v-if="typeIndex === 1" class="total-count">共{{order.total_qty}}盒</text></view><view><text>下单时间:</text><text>{{order.createtime_text}}</text></view></view>
				<view class="foot"><view class="foot-left"><text v-if="order.voucher_status && order.voucher_status !== 'none'" class="voucher-state" :class="voucherClass(order.voucher_status)">凭证：{{order.voucher_status_text}}</text><view class="order-total"><text>总金额</text><b>￥{{orderTotal(order)}}</b></view></view><view class="actions"><button v-if="order.can_revoke" class="cancel" @click.stop="revokeCancel(order)">撤销申请</button><button v-else-if="order.can_cancel && !order.can_pay" class="cancel" @click.stop="cancelOrder(order)">{{typeIndex === 1 ? '取消代发' : '取消订单'}}</button><button @tap="detail(order)">查看详情</button><button v-if="order.can_pay" class="pay" @tap.stop="payOrder(order)">去支付邮费</button></view></view>
			</view>
			<view v-if="!loading && !orders.length" class="empty">暂无订单</view>
			<view class="spacer"/>
			</view>
		</order-list-loader>
		<bottom-tabbar :items="tabs" />

		<view v-if="filterVisible" class="filter-layer">
			<view class="filter-mask" @tap="closeFilter"/>
			<view class="filter-sheet" @tap.stop>
				<view class="filter-handle"/>
				<text class="filter-title">筛选订单</text>
				<view class="filter-section">
					<text class="filter-label">下单时间</text>
					<view class="filter-presets">
						<text v-for="item in datePresets" :key="item.key" :class="{active: draftPreset === item.key}" @tap="applyPreset(item.key)">{{item.label}}</text>
					</view>
					<view class="filter-date-row">
						<picker mode="date" :value="draftStartDate" @change="changeDraftDate('start', $event)">
							<view class="filter-date-box"><text :class="{placeholder:!draftStartDate}">{{draftStartDate || '开始日期'}}</text></view>
						</picker>
						<text class="filter-date-sep">至</text>
						<picker mode="date" :value="draftEndDate" :start="draftStartDate" @change="changeDraftDate('end', $event)">
							<view class="filter-date-box"><text :class="{placeholder:!draftEndDate}">{{draftEndDate || '结束日期'}}</text></view>
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
import { orderApi, wxpayWithCode, requestWxPayment } from '@/api/index'
import OrderListLoader from '@/components/order-list-loader/order-list-loader.vue'
import BottomTabbar from '@/components/bottom-tabbar/bottom-tabbar.vue'
import PageNav from '@/components/page-nav/page-nav.vue'
import { getCapsuleLayout } from '@/utils/capsule'
export default {
	components: { OrderListLoader, BottomTabbar, PageNav },
	data() {
		return {
			navBarHeight: getCapsuleLayout().navBarHeight,
			typeIndex: 0, stateIndex: 0, stateScrollInto: '', keyword: '', startDate: '', endDate: '', orders: [], loading: false, page: 1, hasMore: true,
			filterVisible: false, draftStartDate: '', draftEndDate: '', draftPreset: '',
			datePresets: [
				{ key: '7d', label: '近7天' },
				{ key: '30d', label: '近30天' },
				{ key: 'month', label: '本月' }
			],
			types: [{ label: '采购订单', value: 'purchase' }, { label: '代发订单', value: 'delivery' }],
			purchaseStates: [
				{ label: '全部', value: '' },
				{ label: '待审核', value: 'pending' },
				{ label: '已发货', value: 'shipped' },
				{ label: '已完成', value: 'completed' },
				{ label: '已拒绝', value: 'rejected' }
			],
			deliveryStates: [
				{ label: '全部', value: '' },
				{ label: '待支付', value: 'unpaid' },
				{ label: '待发货', value: 'waiting' },
				{ label: '已发货', value: 'shipped' },
				{ label: '已完成', value: 'completed' }
			],
			tabs: [
				{ label: '工作台', icon: '/static/order/tab-workbench.svg', route: '/pages/workbench/no-warehouse' },
				{ label: '商品', icon: '/static/order/tab-product.svg', route: '/pages/product/index' },
				{ label: '订单', icon: '/static/order/tab-order-active.svg', active: true },
				{ label: '分销', icon: '/static/order/tab-distribution.svg', route: '/pages/distribution/index' },
				{ label: '我的', icon: '/static/order/tab-profile.svg', route: '/pages/profile/index' }
			]
		}
	},
	computed: {
		currentStates() { return this.typeIndex === 0 ? this.purchaseStates : this.deliveryStates },
		stateTabsEven() { return this.currentStates.length <= 5 },
		filterActive() { return !!(this.startDate || this.endDate) },
		dateFilterText() {
			if (this.startDate && this.endDate) return this.startDate + ' 至 ' + this.endDate
			if (this.startDate) return this.startDate + ' 起'
			if (this.endDate) return '至 ' + this.endDate
			return ''
		},
		typeTabsTop() { return this.navBarHeight + 'px' },
		stateTabsTop() { return (this.navBarHeight + uni.upx2px(124)) + 'px' },
		searchTop() { return (this.navBarHeight + uni.upx2px(248)) + 'px' },
		filterTagsTop() { return (this.navBarHeight + uni.upx2px(336)) + 'px' },
		listTop() {
			const offset = this.filterActive ? 416 : 360
			return (this.navBarHeight + uni.upx2px(offset)) + 'px'
		}
	},
	onLoad(options) {
		this.navBarHeight = getCapsuleLayout(true).navBarHeight
		this.applyRouteFilter(options || {})
	},
	onShow() { this.loadOrders() },
	methods: {
		applyRouteFilter(options) {
			const type = options.type || ''
			const status = options.status || ''
			if (type === 'delivery') this.typeIndex = 1
			else if (type === 'purchase') this.typeIndex = 0
			if (!status) return
			const states = this.currentStates
			const index = states.findIndex(item => item.value === status)
			if (index >= 0) {
				this.stateIndex = index
				this.$nextTick(() => this.scrollStateTab(index))
			}
		},
		selectType(index) {
			if (this.typeIndex === index) return
			this.typeIndex = index
			this.stateIndex = 0
			this.stateScrollInto = ''
			this.keyword = ''
			this.startDate = ''
			this.endDate = ''
			this.$nextTick(() => { this.stateScrollInto = 'state-tab-0' })
			this.loadOrders()
		},
		scrollStateTab(index) {
			if (this.stateTabsEven) return
			this.stateScrollInto = ''
			this.$nextTick(() => { this.stateScrollInto = 'state-tab-' + index })
		},
		selectState(index) {
			this.stateIndex = index
			this.scrollStateTab(index)
			this.loadOrders()
		},
		async loadOrders(more = false) {
			// 仅允许布尔 true；避免 @confirm 传入 event 被当成 more
			more = more === true
			if (this.loading || (more && !this.hasMore)) return
			this.loading = true
			const nextPage = more ? this.page + 1 : 1
			try {
				const data = await orderApi.lists({ type: this.types[this.typeIndex].value, status: this.currentStates[this.stateIndex].value, keyword: this.keyword.trim(), start_time: this.startDate, end_time: this.endDate, page: nextPage, limit: 10 })
				const list = data && data.list ? data.list : []
				this.orders = more ? this.orders.concat(list) : list
				this.page = nextPage
				this.hasMore = this.orders.length < Number(data && data.total || 0)
			} catch (e) { if (!more) this.orders = [] }
			finally { this.loading = false }
		},
		loadMore() { this.loadOrders(true) },
		refreshOrders() { return this.loadOrders(false) },
		formatDate(date) {
			const y = date.getFullYear()
			const m = String(date.getMonth() + 1).padStart(2, '0')
			const d = String(date.getDate()).padStart(2, '0')
			return y + '-' + m + '-' + d
		},
		matchPreset(start, end) {
			if (!start || !end) return ''
			for (const item of this.datePresets) {
				const range = this.presetRange(item.key)
				if (range.start === start && range.end === end) return item.key
			}
			return ''
		},
		presetRange(key) {
			const end = new Date()
			const start = new Date()
			if (key === '7d') start.setDate(end.getDate() - 6)
			else if (key === '30d') start.setDate(end.getDate() - 29)
			else if (key === 'month') start.setDate(1)
			return { start: this.formatDate(start), end: this.formatDate(end) }
		},
		openFilter() {
			this.draftStartDate = this.startDate
			this.draftEndDate = this.endDate
			this.draftPreset = this.matchPreset(this.startDate, this.endDate)
			this.filterVisible = true
		},
		closeFilter() { this.filterVisible = false },
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
			this.loadOrders()
		},
		clearDateFilter() {
			this.startDate = ''
			this.endDate = ''
			this.draftStartDate = ''
			this.draftEndDate = ''
			this.draftPreset = ''
			this.loadOrders()
		},
		visibleGoods(order) { return (order.goods || []).slice(0, 2) },
		orderTotal(order) {
			return (Number(order.goods_amount || 0) + Number(order.postage || 0)).toFixed(2)
		},
		statusClass(status) { return ({ unpaid: 'unpaid', pending: 'pending', approved: 'approved', rejected: 'rejected', waiting: 'waiting', shipped: 'shipped', completed: 'completed', canceling: 'pending', refund_approved: 'waiting', refunded: 'completed', cancelled: 'completed' })[status] || 'pending' },
		voucherClass(status) { return ({ uploaded: 'uploaded', approved: 'uploaded', rejected: 'rejected', none: 'none' })[status] || 'none' },
		detail(order) { uni.navigateTo({ url: '/pages/order/detail?id=' + order.id }) },
		cancelOrder(order) { const isDelivery = this.typeIndex === 1; uni.showModal({ title: isDelivery ? '取消代发' : '取消订单', content: isDelivery ? '确认取消该代发订单吗？' : '确认取消该订单吗？', success: async r => { if (r.confirm) { try { await orderApi.cancel(order.id); uni.showToast({ title: isDelivery ? '已提交取消代发申请' : '已提交取消申请', icon: 'success' }); this.loadOrders() } catch (e) {} } } }) },
		revokeCancel(order) { uni.showModal({ title: '撤销申请', content: '确认撤销取消申请吗？撤销后订单将恢复为待发货。', success: async r => { if (r.confirm) { try { await orderApi.revokeCancel(order.id); uni.showToast({ title: '已撤销申请', icon: 'success' }); this.loadOrders() } catch (e) {} } } }) },
		async payOrder(order) { try { const data = await wxpayWithCode(order.id); if (data.paid) { uni.showToast({ title: data.test_payment ? '测试支付成功' : '支付成功', icon: 'success' }); this.loadOrders(); return } await requestWxPayment(data.payment); uni.showToast({ title: '支付成功', icon: 'success' }); this.loadOrders() } catch (e) {} }
	}
}
</script>

<style scoped>
.foot-left{display:flex;flex-direction:column;gap:8rpx}.voucher-state{font-size:22rpx}.voucher-state.uploaded{color:#62c10e}.voucher-state.rejected{color:#fb3b19}.voucher-state.none{color:#a3a3a3}.foot .order-total{font-size:23rpx}.foot .order-total b{font-size:30rpx}
.page{position:relative;width:100%;height:100vh;overflow:hidden;color:#1f2937;background:linear-gradient(180deg,#fffaf2 7%,#f8f8f8 34%);font-family:"PingFang SC","Microsoft YaHei",sans-serif}.header-bg{position:absolute;top:0;left:0;width:750rpx;height:418rpx;opacity:.13;transform:scaleY(-1)}.page-nav-abs{position:absolute;top:0;left:0;z-index:10;width:100%}.type-tabs{position:absolute;left:30rpx;display:flex;box-sizing:border-box;width:690rpx;height:108rpx;padding:10rpx;background:#fafafa;border:2rpx solid #fff;border-radius:16rpx}.type-tabs view{display:flex;flex:1;align-items:center;justify-content:center;font-size:32rpx;border-radius:16rpx}.type-tabs .active{color:#f97316;font-weight:500;background:linear-gradient(#fff9ed,#fff);border:2rpx solid #fff}.state-tabs{position:absolute;left:30rpx;width:690rpx;height:80rpx;white-space:nowrap}.state-tabs-inner{display:inline-flex;align-items:center;box-sizing:border-box;min-width:100%;height:80rpx;padding:0 4rpx}.state-tabs-inner.even{display:flex;width:100%;padding:0}.state-tab{position:relative;display:inline-flex;flex:none;align-items:center;justify-content:center;height:80rpx;padding:0 28rpx;color:rgba(0,0,0,.45);font-size:28rpx;line-height:40rpx;transition:color .15s ease}.state-tabs-inner.even .state-tab{flex:1;padding:0 8rpx}.state-tab.active{color:#f97316;font-weight:600}.state-tab.active::after{position:absolute;bottom:8rpx;left:50%;width:36rpx;height:6rpx;background:#f97316;border-radius:6rpx;content:'';transform:translateX(-50%)}.order-search{position:absolute;left:30rpx;display:flex;align-items:center;justify-content:space-between;width:690rpx;height:88rpx}.search-input{display:flex;align-items:center;box-sizing:border-box;width:600rpx;height:76rpx;padding:0 30rpx;background:#fff;border-radius:76rpx}.search-input image{width:38rpx;height:38rpx;margin-right:20rpx}.search-input input{flex:1;height:76rpx;font-size:30rpx}.search-placeholder{color:#999}.filter-button{display:flex;align-items:center;justify-content:center;width:74rpx;height:74rpx;background:rgba(255,255,255,.5);border-radius:50%}.filter-button image{width:42rpx;height:42rpx}.list{position:absolute;bottom:196rpx;width:100%}.order-list{padding-top:8rpx}.card{box-sizing:border-box;width:690rpx;margin:0 30rpx 28rpx;padding:28rpx 32rpx 32rpx;background:#fff;border-radius:20rpx;box-shadow:0 8rpx 24rpx rgba(31,41,55,.04)}.card-pressed{opacity:.96}.head{display:flex;align-items:center;justify-content:space-between;gap:16rpx;color:rgba(0,0,0,.45);font-size:26rpx}.order-no{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.badge{flex:none;min-width:92rpx;padding:7rpx 14rpx;font-size:24rpx;line-height:34rpx;text-align:center;border-radius:8rpx}.pending{color:#835ce8;background:#fbf4ff}.approved,.waiting{color:#26bcd9;background:#f1fcff}.shipped{color:#ff7824;background:#fff7ed}.completed{color:#727272;background:#ededed}.unpaid,.rejected{color:#fb3b19;background:#fff2ef}.divider{height:2rpx;margin-top:28rpx;background:rgba(0,0,0,.06)}.goods{position:relative;display:flex;min-height:142rpx;padding:28rpx 0 0}.goods>image{width:122rpx;height:122rpx;flex:none;border-radius:16rpx;background:#f6f6f6}.goods-main{display:flex;flex:1;min-width:0;flex-direction:column;margin-left:20rpx;padding-right:64rpx}.name{display:-webkit-box;overflow:hidden;font-size:28rpx;line-height:40rpx;-webkit-box-orient:vertical;-webkit-line-clamp:2}.spec{margin-top:6rpx;color:#999;font-size:23rpx}.price{margin-top:auto;color:#999;font-size:24rpx}.price b{margin-left:8rpx;color:#202020;font-size:28rpx}.count{position:absolute;right:0;top:32rpx;color:#555;font-size:26rpx}.more{text-align:right;color:#999;font-size:24rpx}.info{margin-top:16rpx;padding:14rpx 20rpx;background:#f9f9f9;border-radius:18rpx;color:#818181;font-size:24rpx;line-height:42rpx}.info view{position:relative;display:flex}.info view text:first-child{width:128rpx}.info view text:nth-child(2){color:#333}.total-count{position:absolute;right:0;color:#333!important}.foot{display:flex;align-items:center;justify-content:space-between;margin-top:24rpx;padding-top:4rpx}.order-total{font-size:25rpx;color:#777}.order-total b{margin-left:8rpx;color:#f97316;font-size:32rpx}.actions{display:flex;gap:12rpx;margin-left:auto}.actions button{display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:142rpx;height:60rpx;margin:0;padding:0;color:#f97316;font-size:24rpx;line-height:60rpx;background:#fff;border:2rpx solid #fb3b19;border-radius:100rpx}.actions button::after{border:0}.actions .cancel{color:#777;border-color:#ddd}.actions .pay{color:#fff;background:linear-gradient(90deg,#ff8a37,#fa3b19);border:0}.empty,.loading{padding:100rpx 0;color:#999;font-size:28rpx;text-align:center}.spacer{height:24rpx}
/* Figma node 38:10607: order-card content proportions. */
.goods{min-height:180rpx;padding-top:28rpx}
.goods>image{width:162rpx;height:162rpx;border-radius:20rpx}
.goods-main{margin-left:24rpx;padding-right:0}
.goods-main .name{max-width:400rpx;padding-right:72rpx;line-height:42rpx}
.goods-main .spec{max-width:400rpx;padding-right:72rpx}
.goods-main .price{position:absolute;right:0;bottom:0;display:flex;align-items:baseline;justify-content:flex-end;gap:8rpx;margin:0;font-size:24rpx;color:#999;white-space:nowrap}
.goods-main .price text,.goods-main .price b{flex:none;white-space:nowrap}
.goods-main .price b{margin-left:0;color:#202020;font-size:32rpx}
.count{top:28rpx;color:#666;font-size:24rpx}
.info{box-sizing:border-box;height:128rpx;margin-top:16rpx;padding:16rpx 24rpx;border-radius:24rpx;font-size:26rpx;line-height:48rpx}
.info view{position:relative;display:flex;min-width:0}
.info view text:first-child{width:128rpx;flex:none;margin:0}
.info view text:nth-child(2){overflow:hidden;color:rgba(0,0,0,.85);text-overflow:ellipsis;white-space:nowrap}
.total-count{position:absolute;right:0;color:rgba(0,0,0,.85)!important}
.foot{margin-top:24rpx}
.foot-left{min-width:0}
.order-total{display:flex;align-items:baseline}
.order-total text,.order-total b{white-space:nowrap}
.actions{gap:16rpx;margin-left:auto}
.actions button{width:172rpx;min-width:172rpx;height:72rpx;font-size:26rpx;line-height:72rpx}
.delivery-info view:first-child text:first-child{width:96rpx}

/* Tab widths stay stable when the selected state changes. */
.type-tabs view{box-sizing:border-box;border:2rpx solid transparent}
.type-tabs .active{border-color:#fff}
.type-tabs .type-tab{position:static;flex:1;width:auto;box-sizing:border-box}
.type-tabs .active{font-weight:500}
.filter-button.active{background:rgba(249,115,22,.12);box-shadow:0 0 0 2rpx rgba(249,115,22,.35)}
.filter-tags{position:absolute;left:30rpx;display:flex;align-items:center;justify-content:flex-start;width:690rpx;height:56rpx}
.filter-tag{display:flex;align-items:center;box-sizing:border-box;max-width:580rpx;height:56rpx;padding:0 20rpx;background:#fff7ed;border-radius:28rpx;box-shadow:inset 0 0 0 2rpx rgba(249,115,22,.25)}
.filter-tag-label{flex:none;margin-right:12rpx;color:#f97316;font-size:24rpx;font-weight:500}
.filter-tag-text{overflow:hidden;color:#666;font-size:24rpx;text-overflow:ellipsis;white-space:nowrap}
.filter-tag-clear{flex:none;margin-left:20rpx;color:#999;font-size:24rpx;line-height:56rpx}
.filter-layer{position:fixed;z-index:2000;top:0;right:0;bottom:0;left:0}
.filter-mask{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.filter-sheet{position:absolute;bottom:0;left:0;box-sizing:border-box;width:100%;padding:28rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#fffaf2 0%,#fff 28%);border-radius:36rpx 36rpx 0 0;box-shadow:0 -16rpx 40rpx rgba(0,0,0,.1)}
.filter-handle{width:72rpx;height:8rpx;margin:0 auto 28rpx;background:#e5e7eb;border-radius:8rpx}
.filter-title{display:block;margin-bottom:36rpx;color:#1f2937;font-size:34rpx;font-weight:600;line-height:48rpx;text-align:center}
.filter-section{margin-bottom:40rpx}
.filter-label{display:block;margin-bottom:20rpx;color:#6b7280;font-size:26rpx;line-height:36rpx}
.filter-presets{display:flex;gap:16rpx;margin-bottom:24rpx}
.filter-presets text{flex:1;height:64rpx;color:#666;font-size:26rpx;line-height:64rpx;text-align:center;background:#f5f5f5;border-radius:32rpx}
.filter-presets text.active{color:#f97316;font-weight:500;background:#fff7ed;box-shadow:inset 0 0 0 2rpx #fdba74}
.filter-date-row{display:flex;align-items:center;gap:16rpx}
.filter-date-row picker{flex:1}
.filter-date-box{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:80rpx;padding:0 20rpx;color:#1f2937;font-size:28rpx;background:#fff;border:2rpx solid #eee;border-radius:16rpx}
.filter-date-box .placeholder{color:#999}
.filter-date-sep{flex:none;color:#999;font-size:26rpx}
.filter-actions{display:flex;gap:20rpx}
.filter-actions button{flex:1;height:88rpx;margin:0;padding:0;font-size:30rpx;line-height:88rpx;border-radius:44rpx}
.filter-actions button::after{border:0}
.filter-reset{color:#666;background:#f3f4f6}
.filter-confirm{color:#fff;background:linear-gradient(90deg,#ff8a37,#fa3b19)}
</style>
