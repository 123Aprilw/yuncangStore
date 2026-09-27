<template>
	<view class="page">
		<page-nav title="订单详情" back-icon="/static/order-detail/back.svg" :auto-back="false" fallback="/pages/order/index" @back="goBack" />
		<scroll-view v-if="order" class="content" scroll-y :show-scrollbar="false">
			<view class="hero"><view class="state-row"><view class="state-icon" :class="{'state-icon--cancel': isCancellationFlow || isPurchaseRejected}"><template v-if="isCancellationFlow || isPurchaseRejected"><image src="/static/order-detail/state-cancel.svg" mode="aspectFit"/></template><template v-else-if="orderStateIcon"><image v-if="orderStateIcon.background" class="figma-state-bg" :src="orderStateIcon.background" mode="aspectFit"/><image v-for="(glyph,index) in orderStateIcon.glyphs" :key="glyph.src + index" class="figma-state-glyph" :class="glyph.className" :src="glyph.src" mode="aspectFit"/></template></view><view><text class="state-title">{{cancellationTitle || order.status_text}}</text><text class="state-time">{{(isCancellationFlow || isPurchaseRejected) && order.canceltime_text ? order.canceltime_text : order.createtime_text}}</text></view></view><view class="progress"><view v-for="(step,index) in progressSteps" :key="step.key" class="progress-step"><text>{{step.label}}</text><view class="track"><view class="progress-dot" :class="{active:index<=progressIndex}"/><view v-if="index<progressSteps.length-1" class="progress-line" :class="{active:index<progressIndex}"/></view></view></view></view>
			<view class="card goods-card"><view class="card-title"><text>商品清单</text><small>共 {{order.total_qty}} 盒</small></view><view class="line"/><view v-for="(item,index) in order.goods" :key="index" class="product"><image :src="item.image || '/static/common/product-placeholder.png'" mode="aspectFill"/><view class="product-info"><text class="product-name">{{item.name}}</text><text v-if="item.sku_name" class="product-spec">规格: {{item.sku_name}}</text><text class="item-price">实付: ￥{{item.amount || item.price}}</text></view><text class="qty">× {{item.qty}}</text></view><view class="line"/><view class="summary"><text>实付金额</text><b>￥{{totalAmount}}</b></view></view>
			<view class="card delivery-card"><text class="card-title-text">{{isCancellationFlow ? '收货地址' : (order.pickup === 'warehouse' ? '提货信息' : '配送信息')}}</text><template v-if="isCancellationFlow"><view class="cancel-address"><view><text>{{order.receiver_name}}</text><text>{{maskMobile(order.receiver_mobile)}}</text></view><text>{{order.receiver_address}}</text></view></template><template v-else><view class="detail-row"><label>{{order.pickup === 'warehouse' ? '提货方式' : '配送方式'}}</label><text>{{order.pickup_text}}</text></view><template v-if="order.pickup !== 'warehouse'"><view class="detail-row"><label>收件人</label><text>{{order.receiver_name}} {{maskMobile(order.receiver_mobile)}}</text></view><view class="detail-row"><label>收件地址</label><text>{{order.receiver_address}}</text></view></template><view v-else class="detail-row"><label>配送方式</label><text>{{order.ship_mode}}</text></view></template></view>
			<view v-if="showLogistics" class="card logistics-card">
				<view class="logistics-head">
					<text class="card-title-text">物流信息</text>
					<text v-if="isSfExpress && sfStatus" class="sf-status-chip">{{sfStatus}}</text>
				</view>
				<template v-if="hasLogistics">
					<!-- 非顺丰：只展示单号 -->
					<template v-if="!isSfExpress">
						<view class="detail-row">
							<label>快递单号</label>
							<view>
								<text>{{expressNo}}</text>
								<button v-if="expressNo && expressNo !== '暂无'" @tap="copyExpress">复制</button>
							</view>
						</view>
					</template>
					<!-- 顺丰：时间线 -->
					<template v-else>
						<view class="sf-express-bar">
							<view class="sf-express-main">
								<text class="sf-company">{{expressCompany !== '暂无' ? expressCompany : '顺丰速运'}}</text>
								<text class="sf-no">{{sfMailNo || expressNo}}</text>
							</view>
							<button v-if="(sfMailNo || expressNo) && expressNo !== '暂无'" class="sf-copy" @tap="copyExpress">复制</button>
						</view>
						<view v-if="sfLoading" class="sf-loading">物流轨迹加载中...</view>
						<view v-else-if="sfRoutes.length" class="sf-timeline">
							<view v-for="(item, index) in visibleSfRoutes" :key="index" class="sf-item" :class="{ 'is-latest': index === 0 }">
								<view class="sf-dot"/>
								<view v-if="index < visibleSfRoutes.length - 1" class="sf-line"/>
								<text v-if="item.status_text" class="sf-tag">{{item.status_text}}</text>
								<text class="sf-remark">{{item.remark}}</text>
								<view class="sf-meta">
									<text v-if="item.accept_time">{{item.accept_time}}</text>
									<text v-if="item.accept_address">{{item.accept_address}}</text>
								</view>
							</view>
							<view v-if="sfRoutes.length > 3" class="sf-toggle" @tap="sfExpanded = !sfExpanded">
								{{sfExpanded ? '收起' : '展开全部（共' + sfRoutes.length + '条）'}}
							</view>
						</view>
						<view v-else class="sf-empty">
							<text class="sf-empty-title">{{sfError || '暂无物流轨迹'}}</text>
							<text class="sf-empty-desc">可稍后下拉刷新，或点击重试</text>
							<button class="sf-retry" @tap="loadSfTrack">重新查询</button>
						</view>
					</template>
				</template>
				<view v-else class="logistics-empty">
					<text>{{['shipped','completed'].includes(order.status) ? '暂无物流信息' : '暂未发货'}}</text>
					<text>{{['shipped','completed'].includes(order.status) ? '如已发货请联系客服核对' : '发货后将在这里展示物流单号'}}</text>
				</view>
			</view>
			<view class="card order-card"><view class="detail-row"><label>订单编号</label><view><text>{{order.order_no}}</text><button @tap="copyOrder">复制</button></view></view><view class="line"/><view class="detail-row"><label>下单时间</label><text>{{order.createtime_text}}</text></view></view>
			<view v-if="showVoucher" class="card voucher-card"><text class="card-title-text">凭证信息</text><view v-if="order.voucher_images && order.voucher_images.length" class="voucher-content"><scroll-view class="voucher-list" scroll-x :show-scrollbar="false"><image v-for="(url,index) in order.voucher_images" :key="index" :src="url" mode="aspectFill" @tap="previewVoucher(index)"/></scroll-view><view class="voucher-meta"><text>凭证编号: {{order.voucher_no || '—'}}</text><text>上传时间: {{voucherTime}}</text><text class="voucher-status">{{order.voucher_status_text}}</text></view></view><view v-else class="voucher-empty"><text class="voucher-empty-icon">▧</text><view><text>暂未上传凭证</text><text>上传后将在这里展示</text></view></view></view>
			<view v-if="isRefundFlow" class="card refund-card"><text class="card-title-text">退款明细</text><view class="refund-notice"><image src="/static/order-detail/refund-info.svg"/><text>{{order.status === 'refunded' ? '退款已完成,款项已原路返回' : '申请已通过,等待财务打款退款'}}</text></view><view class="refund-row"><text>邮费</text><text>￥{{order.postage}}</text></view><view class="line"/><view class="refund-row"><text>退款方式</text><text>原路返回</text></view></view>
			<view v-else-if="isPurchaseRejected && order.admin_remark" class="card reject-card"><text class="card-title-text">审核结果</text><view class="reject-notice"><image src="/static/order-detail/refund-info.svg"/><view><text>审核未通过</text><text>原因：{{order.admin_remark}}</text></view></view></view>
			<view v-else-if="showCancelRejectRemark" class="card reject-card"><text class="card-title-text">取消申请结果</text><view class="reject-notice"><image src="/static/order-detail/refund-info.svg"/><view><text>取消申请已驳回</text><text>驳回原因：{{order.admin_remark}}</text></view></view></view>
			<view v-else class="card amount-card"><view><text>商品总额</text><text>￥{{order.goods_amount}}</text></view><view><text>邮费</text><text>￥{{order.postage}}</text></view><view v-if="order.can_pay" class="pay-hint"><text>待付邮费</text><text>￥{{order.pay_amount}}</text></view><view class="line"/><view><b>合计</b><b>￥{{totalAmount}}</b></view></view><view class="safe-space"/>
		</scroll-view>
		<view v-else-if="loading" class="loading">订单加载中...</view><view v-else class="loading">订单不存在或已被删除</view>
		<view v-if="order && (order.can_pay || order.status === 'shipped' || order.can_cancel || order.can_revoke)" class="footer"><button v-if="order.can_revoke" class="light" @tap="revokeCancel">撤销申请</button><button v-else-if="order.can_cancel" class="light" @tap="cancelOrder">{{order.type === 'delivery' ? '取消代发' : '取消订单'}}</button><button v-if="order.status === 'shipped'" class="primary" @tap="confirmReceive">确认收货</button><button v-if="order.can_pay" class="primary" @tap="continuePay">{{order.type === 'delivery' ? '去支付邮费' : '去支付'}}</button></view>
	</view>
</template>

<script>
import { orderApi, wxpayWithCode, requestWxPayment } from '@/api/index'
import PageNav from '@/components/page-nav/page-nav.vue'
import { navigateBack } from '@/utils/nav'
export default {
	components: { PageNav },
	data() {
		return {
			orderId: 0,
			order: null,
			loading: true,
			paying: false,
			sfLoading: false,
			sfExpanded: false,
			sfStatus: '',
			sfMailNo: '',
			sfError: '',
			sfRoutes: []
		}
	},
	computed: {
		totalAmount() { return this.order ? (Number(this.order.goods_amount || 0) + Number(this.order.postage || 0)).toFixed(2) : '0.00' },
		showVoucher() { return this.order && (this.order.type === 'purchase' || (this.order.voucher_images && this.order.voucher_images.length)) },
		isCancellationFlow() { return this.order && ['canceling', 'cancelled', 'refund_approved', 'refunded'].includes(this.order.status) },
		isPurchaseOrder() { return this.order && this.order.type === 'purchase' },
		orderStateIcon() {
			if (!this.order || this.isCancellationFlow || this.isPurchaseRejected) return null
			const base = '/static/order-detail/figma-status/'
			const figma = {
				pending: { glyphs: [{ src: base + 'pending.svg', className: 'figma-state-glyph--full' }] },
				approved: { background: base + 'approved-bg.svg', glyphs: [{ src: base + 'approved-main.svg', className: 'figma-state-glyph--approved' }, { src: base + 'approved-corner.svg', className: 'figma-state-glyph--approved-corner' }] },
				shipped: { background: base + 'shipped-bg.svg', glyphs: [{ src: base + 'shipped.svg', className: 'figma-state-glyph--standard' }] },
				completed: { background: base + 'completed-bg.svg', glyphs: [{ src: base + 'completed.svg', className: 'figma-state-glyph--standard' }] }
			}
			if (this.isPurchaseOrder) return figma[this.order.status] || null
			return ({
				unpaid: { background: '/static/order-detail/pay-circle.svg', glyphs: [{ src: '/static/order-detail/pay-state.svg', className: 'figma-state-glyph--standard' }] },
				waiting: { glyphs: [{ src: '/static/order-detail/state-waiting.svg', className: 'figma-state-glyph--full' }] },
				shipped: figma.shipped,
				completed: figma.completed
			})[this.order.status] || null
		},
		isPurchaseRejected() { return this.order && this.order.type === 'purchase' && this.order.status === 'rejected' },
		showCancelRejectRemark() {
			return !!(this.order && this.order.admin_remark && this.order.type === 'delivery' && !this.isRefundFlow && !this.isCancellationFlow)
		},
		cancellationTitle() {
			if (!this.order) return ''
			return ({
				canceling: '取消审核中',
				refund_approved: '取消已通过',
				refunded: '已退款',
				cancelled: '已取消',
				rejected: '已拒绝'
			})[this.order.status] || ''
		},
		isRefundFlow() { return this.order && ['refund_approved', 'refunded'].includes(this.order.status) },
		expressCompany() {
			if (!this.order) return '暂无'
			const v = String(this.order.express_company || '').trim()
			return !v || v === '暂无' ? '暂无' : v
		},
		expressNo() {
			if (!this.order) return '暂无'
			const v = String(this.order.express_no || '').trim()
			if (!v || v === '暂无') return '暂无'
			if (/^(WAITING|PENDING|WAITSHIP|UNPAID|WAREHOUSE|CANCELING|REFUNDED)/i.test(v)) return '暂无'
			return v
		},
		hasLogistics() {
			return this.expressCompany !== '暂无' || this.expressNo !== '暂无'
		},
		isSfExpress() {
			const company = this.expressCompany
			if (company && company !== '暂无' && (company.indexOf('顺丰') !== -1 || /^SF/i.test(company))) return true
			const no = this.expressNo
			return !!(no && no !== '暂无' && /^SF/i.test(no))
		},
		visibleSfRoutes() {
			if (this.sfExpanded) return this.sfRoutes
			return this.sfRoutes.slice(0, 3)
		},
		showLogistics() {
			if (!this.order || this.order.pickup === 'warehouse') return false
			if (this.hasLogistics) return true
			return ['approved', 'waiting', 'shipped', 'completed'].includes(this.order.status)
		},
		voucherTime() { if (!this.order || !this.order.voucher_time) return '—'; const d = new Date(Number(this.order.voucher_time) * 1000); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) },
		progressSteps() {
			if (this.isCancellationFlow) {
				const status = this.order.status
				// 未支付直接取消：仅 待支付 → 已取消
				if (status === 'cancelled') {
					return [{ key: 'unpaid', label: '待支付' }, { key: 'canceling', label: '已取消' }]
				}
				// 已支付取消：待支付 → 取消审核中/取消已通过 → 已退款
				const midLabel = status === 'canceling' ? '取消审核中' : '取消已通过'
				return [
					{ key: 'unpaid', label: '待支付' },
					{ key: 'canceling', label: midLabel },
					{ key: 'refunded', label: '已退款' }
				]
			}
			if (this.isPurchaseRejected) return [{ key: 'pending', label: '待审核' }, { key: 'rejected', label: '已拒绝' }]
			// 入我的仓库：审核通过即完成，无发货环节
			if (this.order && this.order.type === 'purchase' && this.order.pickup === 'warehouse') {
				return [{ key: 'pending', label: '待审核' }, { key: 'completed', label: '已完成' }]
			}
			if (this.order && this.order.type === 'purchase') {
				return [
					{ key: 'pending', label: '待审核' },
					{ key: 'approved', label: '已审核' },
					{ key: 'shipped', label: '已发货' },
					{ key: 'completed', label: '已完成' }
				]
			}
			return [
				{ key: 'unpaid', label: '待支付' },
				{ key: 'waiting', label: '待发货' },
				{ key: 'shipped', label: '已发货' },
				{ key: 'completed', label: '已完成' }
			]
		},
		progressIndex() {
			if (!this.order) return 0
			const status = this.order.status
			// 取消链路：cancelled / canceling / refund_approved 停在中间节点；refunded 到最后
			if (status === 'cancelled' || status === 'refund_approved') return 1
			if (status === 'canceling') return 1
			if (status === 'refunded') return this.progressSteps.length - 1
			// 入仓库采购：approved/shipped 历史数据也视为已完成
			if (this.order.pickup === 'warehouse' && ['approved', 'shipped', 'completed'].includes(status)) {
				return this.progressSteps.length - 1
			}
			const i = this.progressSteps.findIndex(item => item.key === status)
			return i < 0 ? 0 : i
		}
	},
	onLoad(options) { this.orderId = Number(options.id || 0); this.loadDetail() },
	methods: {
		goBack() { navigateBack('/pages/order/index') },
		async loadDetail() {
			if (!this.orderId) { this.loading = false; return }
			this.loading = true
			this.resetSfTrack()
			try {
				this.order = await orderApi.detail(this.orderId)
				this.$nextTick(() => this.loadSfTrack())
			} catch (e) {
				this.order = null
			} finally {
				this.loading = false
			}
		},
		resetSfTrack() {
			this.sfLoading = false
			this.sfExpanded = false
			this.sfStatus = ''
			this.sfMailNo = ''
			this.sfError = ''
			this.sfRoutes = []
		},
		async loadSfTrack() {
			if (!this.order || !this.isSfExpress || this.expressNo === '暂无') return
			this.sfLoading = true
			this.sfError = ''
			try {
				const data = await orderApi.sfroute(this.orderId)
				if (!data || !data.is_sf) {
					this.sfError = '暂不支持该快递轨迹查询'
					this.sfRoutes = []
					this.sfStatus = ''
					return
				}
				this.sfMailNo = data.mail_no || ''
				this.sfStatus = data.status || ''
				this.sfRoutes = Array.isArray(data.routes) ? data.routes : []
				this.sfError = this.sfRoutes.length ? '' : (data.error || '暂无物流轨迹，请稍后查看')
			} catch (e) {
				this.sfRoutes = []
				this.sfStatus = ''
				this.sfError = '物流轨迹暂时无法获取'
			} finally {
				this.sfLoading = false
			}
		},
		maskMobile(mobile) { return mobile && mobile !== '暂无' ? String(mobile).replace(/(\d{3})\d+(\d{4})/, '$1 **** $2') : '' },
		copyOrder() { if (this.order) uni.setClipboardData({ data: this.order.order_no }) },
		copyExpress() {
			const no = this.sfMailNo || this.expressNo
			if (no && no !== '暂无') uni.setClipboardData({ data: no })
		},
		previewVoucher(index) { uni.previewImage({ current: this.order.voucher_images[index], urls: this.order.voucher_images }) },
		confirmReceive() { uni.showModal({ title: '确认收货', content: '确认已经收到商品吗？', success: async result => { if (result.confirm) { try { await orderApi.confirm(this.orderId); uni.showToast({title:'已确认收货',icon:'success'}); this.loadDetail() } catch (e) {} } } }) },
		cancelOrder() { const isDelivery = this.order && this.order.type === 'delivery'; uni.showModal({ title: isDelivery ? '取消代发' : '取消订单', content: isDelivery ? '确认取消该代发订单吗？' : '确认取消该订单吗？', success: async result => { if (result.confirm) { try { await orderApi.cancel(this.orderId); uni.showToast({title:isDelivery ? '已提交取消代发申请' : '已提交取消申请',icon:'success'}); this.loadDetail() } catch (e) {} } } }) },
		revokeCancel() {
			if (!this.order || !this.order.can_revoke) {
				uni.showToast({ title: '当前状态不可撤销', icon: 'none' })
				return
			}
			uni.showModal({
				title: '撤销申请',
				content: '确认撤销取消申请吗？撤销后订单将恢复为待发货。',
				success: async result => {
					if (!result.confirm) return
					try {
						await orderApi.revokeCancel(this.orderId)
						uni.showToast({ title: '已撤销申请', icon: 'success' })
						this.loadDetail()
					} catch (e) {}
				}
			})
		},
		async continuePay() { if (this.paying) return; this.paying = true; try { const data = await wxpayWithCode(this.orderId); if (!data.paid) await requestWxPayment(data.payment); uni.showToast({title:data.test_payment ? '测试支付成功' : '支付成功',icon:'success'}); this.loadDetail() } catch (e) {} finally { this.paying = false } }
	}
}
</script>

<style scoped>
.voucher-content{display:flex;align-items:center;margin-top:24rpx}.voucher-content .voucher-list{width:170rpx;flex:none;margin:0}.voucher-content .voucher-list image{width:150rpx;height:150rpx;margin:0}.voucher-meta{display:flex;flex:1;flex-direction:column;gap:12rpx;margin-left:20rpx;color:#414755;font-size:24rpx;line-height:34rpx}.voucher-meta .voucher-status{margin:0;color:#62c10e}.voucher-empty{display:flex;align-items:center;height:150rpx;margin-top:22rpx;padding:0 20rpx;color:#8a95a5;background:#f7f8fb;border-radius:14rpx}.voucher-empty-icon{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;margin-right:18rpx;color:#8a7dff;font-size:36rpx;background:#eceaff;border-radius:12rpx}.voucher-empty view{display:flex;flex-direction:column;font-size:26rpx}.voucher-empty view text+text{margin-top:8rpx;color:#a7aeb8;font-size:22rpx}
.logistics-empty{display:flex;flex-direction:column;margin-top:22rpx;padding:28rpx 24rpx;color:#8a95a5;font-size:26rpx;line-height:36rpx;background:#f7f8fb;border-radius:14rpx}.logistics-empty text+text{margin-top:8rpx;color:#a7aeb8;font-size:22rpx}
.logistics-head{display:flex;align-items:center;justify-content:space-between;gap:16rpx}
.sf-status-chip{flex:none;padding:6rpx 16rpx;color:#f97316;font-size:22rpx;font-weight:600;line-height:32rpx;background:rgba(249,115,22,.1);border-radius:999rpx}
.sf-express-bar{display:flex;align-items:center;justify-content:space-between;gap:16rpx;margin-top:22rpx;padding:20rpx 22rpx;background:#f7f8fb;border-radius:14rpx}
.sf-express-main{display:flex;flex:1;min-width:0;flex-direction:column;gap:6rpx}
.sf-company{color:#1f2937;font-size:26rpx;font-weight:600;line-height:36rpx}
.sf-no{color:#64748b;font-size:24rpx;line-height:34rpx;word-break:break-all}
.sf-copy{width:72rpx;height:36rpx;margin:0;padding:0;color:#666;font-size:22rpx;line-height:32rpx;background:#fff;border:2rpx solid #aaa;border-radius:30rpx;flex:none}
.sf-copy::after{border:0}
.sf-status{color:#f97316;font-weight:600}
.sf-loading,.sf-tip{margin-top:22rpx;padding:20rpx;color:#8a95a5;font-size:24rpx;line-height:36rpx;background:#f7f8fb;border-radius:14rpx}
.sf-empty{display:flex;flex-direction:column;align-items:flex-start;margin-top:22rpx;padding:24rpx;background:#f7f8fb;border-radius:14rpx}
.sf-empty-title{color:#64748b;font-size:26rpx;line-height:36rpx}
.sf-empty-desc{margin-top:8rpx;color:#a7aeb8;font-size:22rpx;line-height:32rpx}
.sf-retry{width:auto;height:56rpx;margin-top:18rpx;padding:0 28rpx;color:#f97316;font-size:24rpx;line-height:56rpx;background:#fff;border:2rpx solid rgba(249,115,22,.35);border-radius:28rpx}
.sf-retry::after{border:0}
.sf-timeline{margin-top:28rpx;padding:0 4rpx 0 8rpx}
.sf-item{position:relative;padding:0 0 28rpx 36rpx}
.sf-item:last-child{padding-bottom:0}
.sf-line{position:absolute;left:8rpx;top:26rpx;bottom:-8rpx;width:2rpx;background:rgba(0,0,0,.06)}
.sf-dot{position:absolute;left:0;top:8rpx;width:18rpx;height:18rpx;border-radius:50%;background:#e5e7eb;border:4rpx solid #fff;box-shadow:0 0 0 2rpx #d1d5db;box-sizing:border-box}
.sf-item.is-latest .sf-dot{background:#f97316;box-shadow:0 0 0 2rpx #fdba74}
.sf-item.is-latest .sf-tag{color:#f97316}
.sf-tag{display:block;margin-bottom:6rpx;font-size:26rpx;font-weight:600;line-height:36rpx}
.sf-remark{display:block;color:#1f2937;font-size:26rpx;line-height:38rpx;word-break:break-word}
.sf-meta{display:flex;flex-wrap:wrap;gap:8rpx 16rpx;margin-top:8rpx;color:#8a8f98;font-size:22rpx;line-height:32rpx}
.sf-toggle{margin-top:8rpx;padding:16rpx 0 4rpx;color:#f97316;font-size:24rpx;text-align:center}
.state-icon{display:flex;align-items:center;justify-content:center;width:84rpx;height:84rpx;margin-right:22rpx}.state-icon image{width:84rpx;height:84rpx}
.page{display:flex;flex-direction:column;height:100vh;background:#f5f5f5;color:#1f2937;font-family:"PingFang SC","Microsoft YaHei",sans-serif}.content{box-sizing:border-box;flex:1;height:0}.hero{box-sizing:border-box;height:392rpx;padding:42rpx 30rpx 0;color:#fff;background:linear-gradient(180deg,#ff982c,#f25530 54%,#f5f5f5)}.state-row{display:flex;align-items:center}.state-icon{display:flex;align-items:center;justify-content:center;width:84rpx;height:84rpx;margin-right:22rpx;color:#ff6a1b;font-size:36rpx;font-weight:600;background:#fff3e9;border-radius:50%}.state-title{display:block;font-size:32rpx;font-weight:600}.state-time{display:block;margin-top:8rpx;font-size:24rpx}.progress{display:flex;box-sizing:border-box;height:134rpx;margin-top:42rpx;padding:26rpx 18rpx;color:#252525;background:#fff;border-radius:24rpx}.progress-step{display:flex;flex:1;flex-direction:column;align-items:center;font-size:24rpx}.track{position:relative;width:100%;height:24rpx;margin-top:22rpx}.track i{position:absolute;z-index:2;top:0;left:50%;width:24rpx;height:24rpx;background:#d8d8d8;border:6rpx solid #f1f1f1;border-radius:50%;transform:translateX(-50%);box-sizing:border-box}.track i.active{background:#ff6b1a;border-color:#fff0e5}.track b{position:absolute;top:11rpx;left:calc(50% + 12rpx);width:calc(100% - 24rpx);height:2rpx;background:repeating-linear-gradient(90deg,#d8d8d8 0,#d8d8d8 10rpx,transparent 10rpx,transparent 20rpx)}.track b.active{background:repeating-linear-gradient(90deg,#ff6b1a 0,#ff6b1a 10rpx,transparent 10rpx,transparent 20rpx)}.card{box-sizing:border-box;width:690rpx;margin:24rpx 30rpx 0;padding:30rpx;background:#fff;border-radius:20rpx}.goods-card{margin-top:-16rpx}.card-title{display:flex;justify-content:space-between;font-size:32rpx;font-weight:500}.card-title small{color:#999;font-size:24rpx;font-weight:400}.line{height:2rpx;margin:24rpx 0;background:rgba(0,0,0,.06)}.product{position:relative;display:flex;min-height:150rpx;margin-top:18rpx}.product+ .product{padding-top:20rpx;border-top:2rpx solid rgba(0,0,0,.05)}.product image{width:128rpx;height:128rpx;flex:none;border-radius:16rpx;background:#f5f5f5}.product-info{display:flex;flex:1;min-width:0;flex-direction:column;margin-left:18rpx;padding-right:60rpx}.product-name{display:-webkit-box;overflow:hidden;font-size:28rpx;line-height:40rpx;-webkit-box-orient:vertical;-webkit-line-clamp:2}.product-spec{margin-top:5rpx;color:#999;font-size:23rpx}.item-price{margin-top:auto;color:#777;font-size:24rpx}.qty{position:absolute;top:10rpx;right:0;color:#777;font-size:26rpx}.summary{display:flex;justify-content:space-between;font-size:28rpx}.summary b{color:#ff6b01;font-size:34rpx}.card-title-text{display:block;font-size:32rpx;font-weight:500}.detail-row{display:flex;align-items:flex-start;margin-top:22rpx;font-size:27rpx;line-height:40rpx}.detail-row label{width:150rpx;flex:none;color:#64748b}.detail-row>text,.detail-row>view{flex:1;word-break:break-all}.detail-row>view{display:flex;justify-content:space-between;align-items:center}.detail-row button{width:72rpx;height:36rpx;margin:0;padding:0;color:#666;font-size:22rpx;line-height:32rpx;background:#fff;border:2rpx solid #aaa;border-radius:30rpx}.detail-row button::after{border:0}.voucher-list{display:flex;white-space:nowrap;height:150rpx;margin-top:24rpx}.voucher-list image{width:150rpx;height:150rpx;margin-right:18rpx;border-radius:14rpx;background:#f5f5f5}.voucher-status{display:block;margin-top:18rpx;color:#999;font-size:24rpx}.amount-card>view{display:flex;justify-content:space-between;margin-top:16rpx;font-size:27rpx}.amount-card>view:first-child{margin-top:0}.amount-card .line{margin:22rpx 0}.amount-card b{color:#ff6b01;font-size:30rpx}.amount-card .pay-hint{color:#f97316;font-weight:500}.safe-space{height:220rpx}.footer{position:fixed;right:0;bottom:0;left:0;z-index:3;display:flex;gap:18rpx;box-sizing:border-box;padding:24rpx 30rpx 36rpx;background:#fff}.footer button{flex:1;height:88rpx;margin:0;font-size:30rpx;line-height:88rpx;border-radius:50rpx}.footer button::after{border:0}.footer .light{color:#666;background:#f5f5f5}.footer .primary{color:#fff;background:linear-gradient(90deg,#fb3b19,#f97316)}.loading{display:flex;align-items:center;justify-content:center;height:100vh;color:#999;font-size:28rpx}
.state-row .state-icon{margin-right:22rpx;color:transparent;background:transparent;border-radius:0}.state-row .state-icon image{width:84rpx;height:84rpx}
.cancel-address{display:flex;flex-direction:column;gap:14rpx;margin-top:26rpx;color:rgba(0,0,0,.85);font-size:28rpx;line-height:40rpx}.cancel-address view{display:flex;gap:18rpx;align-items:center}.cancel-address view text:first-child{font-size:34rpx;font-weight:500}.cancel-address view text:last-child{color:rgba(0,0,0,.65)}
.state-row .state-icon--cancel{width:84rpx;height:84rpx;background:rgba(255,255,255,.32);border-radius:50%}.state-row .state-icon--cancel image{width:60rpx;height:60rpx}.refund-card{padding:30rpx}.refund-notice{display:flex;align-items:center;box-sizing:border-box;min-height:72rpx;margin-top:24rpx;padding:16rpx 20rpx;background:rgba(249,115,22,.08);border-radius:16rpx}.refund-notice image{width:40rpx;height:48rpx;margin-right:20rpx}.refund-notice text{color:#1a1c1c;font-size:28rpx;line-height:40rpx}.refund-row{display:flex;justify-content:space-between;margin-top:24rpx;color:#414755;font-size:28rpx;line-height:40rpx}.refund-row text:last-child{color:#1a1c1c}
.reject-card{padding:30rpx}.reject-notice{display:flex;align-items:flex-start;box-sizing:border-box;margin-top:24rpx;padding:20rpx;background:rgba(249,115,22,.08);border-radius:16rpx}.reject-notice image{width:40rpx;height:48rpx;margin:2rpx 18rpx 0 0}.reject-notice view{display:flex;flex:1;flex-direction:column;gap:8rpx}.reject-notice text{color:#1a1c1c;font-size:28rpx;line-height:40rpx}.reject-notice text+text{color:#6b7280;font-size:26rpx}
.progress-dot{position:absolute;z-index:2;top:0;left:50%;box-sizing:border-box;width:24rpx;height:24rpx;background:#d8d8d8;border:6rpx solid #f1f1f1;border-radius:50%;transform:translateX(-50%)}.progress-dot.active{background:#ff6b1a;border-color:#fff0e5}.progress-line{position:absolute;top:11rpx;left:calc(50% + 12rpx);width:calc(100% - 24rpx);height:2rpx;background:repeating-linear-gradient(90deg,#d8d8d8 0,#d8d8d8 10rpx,transparent 10rpx,transparent 20rpx)}.progress-line.active{background:repeating-linear-gradient(90deg,#ff6b1a 0,#ff6b1a 10rpx,transparent 10rpx,transparent 20rpx)}
.state-row .state-icon{position:relative;overflow:hidden}.figma-state-bg,.figma-state-glyph{position:absolute}.state-row .state-icon .figma-state-bg{inset:0;width:84rpx;height:84rpx}.state-row .state-icon .figma-state-glyph--full{inset:0;width:84rpx;height:84rpx}.state-row .state-icon .figma-state-glyph--standard{top:13rpx;left:13rpx;width:58rpx;height:58rpx}.state-row .state-icon .figma-state-glyph--approved{top:12rpx;left:12rpx;width:58rpx;height:58rpx}.state-row .state-icon .figma-state-glyph--approved-corner{right:11rpx;bottom:11rpx;width:22rpx;height:22rpx}
</style>
