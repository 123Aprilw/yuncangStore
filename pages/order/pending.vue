<template>
	<view class="page">
		<image class="header-bg" src="/static/common/header-bg.png" mode="aspectFill" />
		<page-nav title="待处理订单" back-icon="/static/order-detail/back.svg" fallback="/pages/workbench/warehouse-opened" @layout="onNavLayout" />

		<view class="state-tabs">
			<view
				v-for="(item, i) in states"
				:key="item.value"
				class="state-tab"
				:class="{ active: stateIndex === i }"
				@tap="selectState(i)"
			>{{ item.label }}</view>
		</view>

		<order-list-loader
			:top="listTop"
			bottom="0"
			:loading="loading"
			:has-more="hasMore"
			:show-footer="orders.length > 0"
			refresh-name="待处理订单"
			@refresh="refreshOrders"
			@loadmore="loadMore"
		>
			<view class="order-list">
				<view v-for="order in orders" :key="order.id" class="card" hover-class="card-pressed" @tap="detail(order)">
					<view class="head">
						<view class="head-left">
							<text class="type-tag" :class="order.type">{{ order.type_text }}</text>
							<text class="order-no">{{ order.order_no }}</text>
						</view>
						<text class="badge" :class="statusClass(order.status)">{{ order.status_text }}</text>
					</view>
					<view class="divider" />
					<view v-for="(goods, index) in visibleGoods(order)" :key="goods.sku_id + '-' + index" class="goods">
						<image :src="goods.image || '/static/common/product-placeholder.png'" mode="aspectFill" />
						<view class="goods-main">
							<text class="name">{{ goods.name }}</text>
							<text v-if="goods.sku_name" class="spec">规格: {{ goods.sku_name }}</text>
							<view class="price"><text>商品金额:</text><b>￥{{ goods.amount || goods.price }}</b></view>
						</view>
						<text class="count">× {{ goods.qty }}</text>
					</view>
					<view v-if="order.goods && order.goods.length > 2" class="more">共{{ order.goods.length }}盒商品</view>
					<view class="info" :class="{ 'delivery-info': order.type === 'delivery' }">
						<view>
							<text>{{ order.type === 'purchase' ? '提货方式:' : '收货人:' }}</text>
							<text>{{ order.type === 'purchase' ? order.pickup_text : order.receiver_name }}</text>
							<text v-if="order.type === 'delivery'" class="total-count">共{{ order.total_qty }}盒</text>
						</view>
						<view><text>下单时间:</text><text>{{ order.createtime_text }}</text></view>
					</view>
					<view class="foot">
						<view class="foot-left">
							<text v-if="order.voucher_status && order.voucher_status !== 'none'" class="voucher-state" :class="voucherClass(order.voucher_status)">凭证：{{ order.voucher_status_text }}</text>
							<view class="order-total"><text>总金额</text><b>￥{{ orderTotal(order) }}</b></view>
						</view>
						<view class="actions">
							<button v-if="order.can_revoke" class="cancel" @click.stop="revokeCancel(order)">撤销申请</button>
							<button v-else-if="order.can_cancel && !order.can_pay" class="cancel" @click.stop="cancelOrder(order)">{{ order.type === 'delivery' ? '取消代发' : '取消订单' }}</button>
							<button @tap.stop="detail(order)">查看详情</button>
<button v-if="order.can_pay" class="pay" @tap.stop="payOrder(order)">去支付邮费</button>
						</view>
					</view>
				</view>
				<view v-if="!loading && !orders.length" class="empty">暂无待处理订单</view>
				<view class="spacer" />
			</view>
		</order-list-loader>
	</view>
</template>

<script>
import { orderApi, wxpayWithCode, requestWxPayment } from '@/api/index'
import OrderListLoader from '@/components/order-list-loader/order-list-loader.vue'
import PageNav from '@/components/page-nav/page-nav.vue'
import { getCapsuleLayout, pxToRpx } from '@/utils/capsule'
import { navigateBack } from '@/utils/nav'

export default {
	components: { OrderListLoader, PageNav },
	data() {
		return {
			navBarHeight: getCapsuleLayout().navBarHeight,
			stateIndex: 0,
			orders: [],
			loading: false,
			page: 1,
			hasMore: true,
			states: [
				{ label: '全部', value: '' },
				{ label: '待审核', value: 'pending' },
				{ label: '待支付', value: 'unpaid' },
				{ label: '待发货', value: 'waiting' },
				{ label: '取消中', value: 'canceling' }
			]
		}
	},
	computed: {
		listTop() {
			return (pxToRpx(this.navBarHeight) + 120) + 'rpx'
		}
	},
	onShow() {
		this.loadOrders()
	},
	methods: {
		onNavLayout(layout) {
			this.navBarHeight = layout.navBarHeight
		},
		goBack() {
			navigateBack('/pages/workbench/warehouse-opened')
		},
		selectState(index) {
			if (this.stateIndex === index) return
			this.stateIndex = index
			this.loadOrders()
		},
		async loadOrders(more = false) {
			if (this.loading || (more && !this.hasMore)) return
			this.loading = true
			const nextPage = more ? this.page + 1 : 1
			try {
				const data = await orderApi.pending({
					status: this.states[this.stateIndex].value,
					page: nextPage,
					limit: 10
				})
				const list = data && data.list ? data.list : []
				this.orders = more ? this.orders.concat(list) : list
				this.page = nextPage
				this.hasMore = this.orders.length < Number(data && data.total || 0)
			} catch (e) {
				if (!more) this.orders = []
			} finally {
				this.loading = false
			}
		},
		loadMore() {
			this.loadOrders(true)
		},
		refreshOrders() {
			return this.loadOrders()
		},
		visibleGoods(order) {
			return (order.goods || []).slice(0, 2)
		},
		orderTotal(order) {
			return (Number(order.goods_amount || 0) + Number(order.postage || 0)).toFixed(2)
		},
		statusClass(status) {
			return ({ unpaid: 'unpaid', pending: 'pending', waiting: 'waiting', canceling: 'pending' })[status] || 'pending'
		},
		voucherClass(status) {
			return ({ uploaded: 'uploaded', approved: 'uploaded', rejected: 'rejected', none: 'none' })[status] || 'none'
		},
		detail(order) {
			uni.navigateTo({ url: '/pages/order/detail?id=' + order.id })
		},
		cancelOrder(order) {
			const isDelivery = order.type === 'delivery'
			uni.showModal({
				title: isDelivery ? '取消代发' : '取消订单',
				content: isDelivery ? '确认取消该代发订单吗？' : '确认取消该订单吗？',
				success: async (r) => {
					if (!r.confirm) return
					try {
						await orderApi.cancel(order.id)
						uni.showToast({ title: isDelivery ? '已提交取消代发申请' : '已提交取消申请', icon: 'success' })
						this.loadOrders()
					} catch (e) {}
				}
			})
		},
		revokeCancel(order) {
			uni.showModal({
				title: '撤销申请',
				content: '确认撤销取消申请吗？撤销后订单将恢复为待发货。',
				success: async (r) => {
					if (!r.confirm) return
					try {
						await orderApi.revokeCancel(order.id)
						uni.showToast({ title: '已撤销申请', icon: 'success' })
						this.loadOrders()
					} catch (e) {}
				}
			})
		},
		async payOrder(order) {
			try {
				const data = await wxpayWithCode(order.id)
				if (data.paid) {
					uni.showToast({ title: data.test_payment ? '测试支付成功' : '支付成功', icon: 'success' })
					this.loadOrders()
					return
				}
				await requestWxPayment(data.payment)
				uni.showToast({ title: '支付成功', icon: 'success' })
				this.loadOrders()
			} catch (e) {}
		}
	}
}
</script>

<style scoped>
.page {
	position: relative;
	width: 100%;
	height: 100vh;
	overflow: hidden;
	color: #1f2937;
	background: linear-gradient(180deg, #fffaf2 7%, #f8f8f8 34%);
	font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}
.header-bg {
	position: absolute;
	top: 0;
	left: 0;
	width: 750rpx;
	height: 418rpx;
	opacity: .13;
	transform: scaleY(-1);
	pointer-events: none;
}
.state-tabs {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	width: 690rpx;
	height: 80rpx;
	margin: 20rpx 30rpx 0;
}
.state-tab {
	position: relative;
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	color: rgba(0, 0, 0, .45);
	font-size: 28rpx;
	line-height: 40rpx;
}
.state-tab.active {
	color: #f97316;
	font-weight: 600;
}
.state-tab.active::after {
	position: absolute;
	bottom: 8rpx;
	left: 50%;
	width: 36rpx;
	height: 6rpx;
	background: #f97316;
	border-radius: 6rpx;
	content: '';
	transform: translateX(-50%);
}
.order-list { padding-top: 8rpx; }
.card {
	box-sizing: border-box;
	width: 690rpx;
	margin: 0 30rpx 32rpx;
	padding: 32rpx;
	background: #fff;
	border-radius: 20rpx;
}
.card-pressed { background: #fff8f1; }
.head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.head-left {
	display: flex;
	align-items: center;
	min-width: 0;
	margin-right: 16rpx;
}
.type-tag {
	flex: none;
	margin-right: 12rpx;
	padding: 4rpx 12rpx;
	color: #f97316;
	font-size: 22rpx;
	line-height: 32rpx;
	background: #fff7ed;
	border-radius: 8rpx;
}
.type-tag.delivery {
	color: #26bcd9;
	background: #f1fcff;
}
.order-no {
	overflow: hidden;
	color: rgba(0, 0, 0, .45);
	font-size: 26rpx;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.badge {
	flex: none;
	min-width: 92rpx;
	padding: 7rpx 14rpx;
	font-size: 24rpx;
	text-align: center;
	border-radius: 8rpx;
}
.pending { color: #835ce8; background: #fbf4ff; }
.waiting { color: #26bcd9; background: #f1fcff; }
.unpaid { color: #fb3b19; background: #fff2ef; }
.divider {
	height: 2rpx;
	margin-top: 28rpx;
	background: rgba(0, 0, 0, .06);
}
.goods {
	position: relative;
	display: flex;
	min-height: 180rpx;
	padding: 28rpx 0 0;
}
.goods > image {
	width: 162rpx;
	height: 162rpx;
	flex: none;
	border-radius: 20rpx;
	background: #f6f6f6;
}
.goods-main {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	margin-left: 24rpx;
}
.name {
	display: -webkit-box;
	max-width: 430rpx;
	overflow: hidden;
	font-size: 28rpx;
	line-height: 42rpx;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}
.spec {
	margin-top: 6rpx;
	color: #999;
	font-size: 23rpx;
}
.price {
	position: absolute;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: baseline;
	justify-content: flex-end;
	width: 320rpx;
	margin: 0;
	color: #999;
	font-size: 28rpx;
	white-space: nowrap;
}
.price text,
.price b { flex: none; white-space: nowrap; }
.price b {
	margin-left: 8rpx;
	color: #202020;
	font-size: 36rpx;
}
.count {
	position: absolute;
	right: 0;
	top: 32rpx;
	color: #555;
	font-size: 26rpx;
}
.more {
	text-align: right;
	color: #999;
	font-size: 24rpx;
}
.info {
	box-sizing: border-box;
	height: 128rpx;
	margin-top: 16rpx;
	padding: 16rpx 24rpx;
	background: #f9f9f9;
	border-radius: 24rpx;
	color: #818181;
	font-size: 26rpx;
	line-height: 48rpx;
}
.info view {
	position: relative;
	display: flex;
	min-width: 0;
}
.info view text:first-child {
	width: 128rpx;
	flex: none;
}
.info view text:nth-child(2) {
	overflow: hidden;
	color: rgba(0, 0, 0, .85);
	text-overflow: ellipsis;
	white-space: nowrap;
}
.total-count {
	position: absolute;
	right: 0;
	color: rgba(0, 0, 0, .85) !important;
}
.delivery-info view:first-child text:first-child { width: 96rpx; }
.foot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: 24rpx;
	padding-top: 4rpx;
}
.foot-left {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	min-width: 0;
}
.voucher-state { font-size: 22rpx; }
.voucher-state.uploaded { color: #62c10e; }
.voucher-state.rejected { color: #fb3b19; }
.voucher-state.none { color: #a3a3a3; }
.order-total {
	display: flex;
	align-items: baseline;
	color: #777;
	font-size: 25rpx;
}
.order-total b {
	margin-left: 8rpx;
	color: #f97316;
	font-size: 32rpx;
	white-space: nowrap;
}
.actions {
	display: flex;
	gap: 16rpx;
	margin-left: auto;
}
.actions button {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	width: 172rpx;
	min-width: 172rpx;
	height: 72rpx;
	margin: 0;
	padding: 0;
	color: #f97316;
	font-size: 26rpx;
	line-height: 72rpx;
	background: #fff;
	border: 2rpx solid #fb3b19;
	border-radius: 100rpx;
}
.actions button::after { border: 0; }
.actions .cancel {
	color: #777;
	border-color: #ddd;
}
.actions .pay {
	color: #fff;
	background: linear-gradient(90deg, #ff8a37, #fa3b19);
	border: 0;
}
.empty {
	padding: 160rpx 0;
	color: #999;
	font-size: 28rpx;
	text-align: center;
}
.spacer { height: 48rpx; }
</style>
