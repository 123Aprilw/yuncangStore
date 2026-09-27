<template>
	<view class="workbench" :class="{ 'workbench--opened': isWarehouse }" :style="{ height: pageHeight }">
		<image class="header-bg" src="/static/common/header-bg.png" mode="aspectFill" />

		<page-nav class="page-nav-abs" :title="siteName" :show-back="false" transparent />

		<view class="greeting">
			<view class="greeting-line">
				<text class="greeting-title">{{ dashboard.greeting || '你好，用户' }}</text>
			</view>
			<text class="greeting-subtitle">欢迎使用循禾熙云仓商城系统</text>
		</view>
		<view class="header-art">
			<image src="/static/workbench/header-art.png" mode="widthFix" />
		</view>

		<view class="notice-bar" @tap="viewNotice">
			<view class="notice-icon">
				<image src="/static/workbench/notice.png" mode="scaleToFill" />
			</view>
			<text class="notice-text">{{ noticeText }}</text>
			<image class="notice-arrow" src="/static/workbench/arrow-notice.svg" mode="aspectFit" />
		</view>

		<view class="statistics" :class="{ 'statistics--four': isWarehouse }">
			<view v-for="item in statistics" :key="item.label" class="stat-card" :class="item.theme" hover-class="stat-card--pressed" @tap="handleStat(item)">
				<text class="stat-label">{{ item.label }}</text>
				<view class="stat-value-line">
					<text class="stat-value">{{ item.value }}</text>
					<text class="stat-unit">{{ item.unit }}</text>
				</view>
				<image class="stat-shadow" :src="item.shadow" mode="aspectFit" />
				<image class="stat-art" :src="item.image" mode="scaleToFill" />
			</view>
		</view>

		<view class="quick-section" :class="{ 'quick-section--opened': isWarehouse }">
			<text class="section-title">快捷操作</text>
			<view class="quick-card">
				<view v-for="item in quickActions" :key="item.label" class="quick-item" @tap="handleQuickAction(item)">
					<image class="quick-icon" :class="item.iconClass" :src="item.icon" mode="aspectFit" />
					<text class="quick-label">{{ item.label }}</text>
				</view>
			</view>
		</view>

		<view class="todo-card" :class="{ 'todo-card--opened': isWarehouse }">
			<view class="todo-header">
				<view class="todo-title-wrap">
					<text class="todo-title">待办提醒</text>
					<view v-if="todoCount > 0" class="todo-badge">
						<text class="todo-badge-num">{{ todoCount }}</text>
					</view>
				</view>
				<view class="todo-more" @tap="viewMoreTodos">
					<text>查看更多</text>
					<image src="/static/workbench/arrow-small.svg" mode="aspectFit" />
				</view>
			</view>
			<view v-for="todo in todos" :key="todo.title" class="todo-row" hover-class="todo-row--pressed" @tap="handleTodo(todo)">
				<view class="todo-dot"></view>
				<view class="todo-content">
					<text class="todo-name">{{ todo.title }}</text>
					<text class="todo-description">{{ todo.description }}</text>
				</view>
				<image class="todo-arrow" src="/static/workbench/arrow-row.svg" mode="aspectFit" />
			</view>
			<view v-if="!todos.length" class="todo-empty">暂无待办事项</view>
		</view>

		<bottom-tabbar :items="tabs" />
	</view>
</template>

	<script>
	import { workbenchApi } from '@/api/index'
	import BottomTabbar from '@/components/bottom-tabbar/bottom-tabbar.vue'
	import PageNav from '@/components/page-nav/page-nav.vue'
	export default {
		components: { BottomTabbar, PageNav },
		props: {
			hasWarehouse: {
				type: Boolean,
				default: false
			}
		},
		computed: {
			siteName() {
				return this.dashboard.site_name || '循禾熙云仓'
			},
			isWarehouse() {
				return this.dashboard.has_warehouse === undefined ? this.hasWarehouse : !!this.dashboard.has_warehouse
			},
			todoCount() {
				const n = Number(this.dashboard.todo_count)
				if (!Number.isNaN(n) && n > 0) return n
				return this.todos.length
			},
			pageHeight() {
				const todoTop = this.isWarehouse ? 1060 : 882
				const todoBody = 60 + 44 + 12 + Math.max(this.todos.length, 1) * 112 + 28
				const tabbar = 150
				const minHeight = this.isWarehouse ? 1728 : 1624
				return Math.max(minHeight, todoTop + todoBody + tabbar) + 'rpx'
			},
			noticeText() {
				const notice = this.dashboard.notice
				if (!notice) return '暂无系统公告'
				const plain = String(notice.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
				return (notice.title || '系统通知') + (plain ? ' ' + plain : '')
			},
			statistics() {
				const common = [
					{ key: 'waiting_ship', label: '待发货订单', value: this.dashboard.statistics ? this.dashboard.statistics.waiting_ship || 0 : 0, unit: '单', image: '/static/workbench/stat-orders.png', shadow: '/static/workbench/shadow-orders.svg', theme: 'blue' },
					{ key: 'team', label: '我的团队', value: this.dashboard.statistics ? this.dashboard.statistics.team_count || 0 : 0, unit: '人', image: '/static/workbench/stat-team.png', shadow: '/static/workbench/shadow-team.svg', theme: 'green' }
				]
				if (!this.isWarehouse) return common
				return [
					{ key: 'stock_total', label: '库存总数量', value: this.dashboard.statistics ? this.dashboard.statistics.stock_total || 0 : 0, unit: '盒', image: '/static/workbench/stat-stock.png', shadow: '/static/workbench/shadow-stock.svg', theme: 'orange' },
					{ key: 'stock_warn', label: '库存预警', value: this.dashboard.statistics ? this.dashboard.statistics.warn_count || 0 : 0, unit: '项', image: '/static/workbench/stat-monthly.png', shadow: '/static/workbench/shadow-monthly.svg', theme: 'purple' },
					...common
				]
			},
			quickActions() {
				return [
					{ label: '采购下单', icon: '/static/workbench/quick-purchase.png', iconClass: 'purchase', action: 'purchase-order' },
					{ label: '云仓发货', icon: '/static/workbench/quick-create.png', iconClass: 'create', action: 'create-delivery' },
					{ label: '添加收货人', icon: '/static/workbench/quick-recipient.png', iconClass: 'recipient', action: 'add-recipient' },
					{ label: this.isWarehouse ? '仓库管理' : '开通仓库', icon: this.isWarehouse ? '/static/workbench/warehouse-manage.png' : '/static/workbench/warehouse-open.png', iconClass: 'warehouse', action: this.isWarehouse ? 'manage-warehouse' : 'open-warehouse' }
				]
			}
		},
		methods: {
			async loadDashboard() {
				try {
					const data = await workbenchApi.index()
					this.dashboard = data || {}
					this.todos = Array.isArray(this.dashboard.todos) ? this.dashboard.todos : []
				} catch (e) {}
			},
			viewNotice() {
				if (!this.dashboard.notice) return
				uni.setStorageSync('workbench_notice', this.dashboard.notice)
				uni.navigateTo({ url: '/pages/workbench/notice-detail' })
			},
			handleStat(item) {
				const routes = {
					stock_total: '/pages/warehouse/manage',
					stock_warn: '/pages/warehouse/manage?warn=1',
					waiting_ship: '/pages/order/index?type=delivery&status=waiting',
					team: '/pages/distribution/team'
				}
				const url = routes[item.key]
				if (url) uni.navigateTo({ url })
			},
			handleQuickAction(item) {
				if (item.action === 'purchase-order') {
					uni.navigateTo({ url: '/pages/product/index' })
					return
				}
				if (item.action === 'open-warehouse') {
					uni.navigateTo({ url: '/pages/warehouse/unopened' })
					return
				}
				if (item.action === 'manage-warehouse') {
					uni.navigateTo({ url: '/pages/warehouse/manage' })
					return
				}
				if (item.action === 'create-delivery') {
					uni.navigateTo({ url: '/pages/delivery/create' })
					return
				}
				if (item.action === 'add-recipient') {
					uni.navigateTo({ url: '/pages/recipient/add?from=workbench' })
				}
			},
			handleTodo(todo) {
				const action = todo.action || ''
				if (action === 'review_messages' || todo.title === '凭证审核') {
					uni.navigateTo({ url: '/pages/profile/messages?type=review' })
					return
				}
				if (action === 'stock_warn' || todo.title === '库存预警') {
					uni.navigateTo({ url: '/pages/warehouse/manage?warn=1' })
					return
				}
				if (action === 'pending_orders' || todo.title === '待处理订单') {
					uni.navigateTo({ url: '/pages/order/pending' })
					return
				}
				if (action === 'order_detail' && todo.order_id) {
					uni.navigateTo({ url: '/pages/order/detail?id=' + todo.order_id })
				}
			},
			viewMoreTodos() { uni.navigateTo({ url: '/pages/order/pending' }) }
		},
		data() {
			return {
				dashboard: {},
				todos: [],
				tabs: [
					{ label: '工作台', icon: '/static/workbench/nav-workbench.svg', active: true },
					{ label: '商品', icon: '/static/workbench/nav-product.svg', route: '/pages/product/index' },
					{ label: '订单', icon: '/static/workbench/nav-order.svg', route: '/pages/order/index' },
					{ label: '分销', icon: '/static/workbench/nav-distribution.svg', route: '/pages/distribution/index' },
					{ label: '我的', icon: '/static/workbench/nav-profile.svg', route: '/pages/profile/index' }
				]
			}
		},
		mounted() { this.loadDashboard() }
	}
</script>

<style scoped>
	/* H5 预览隐藏原生滚动轨道，页面仍可正常滚动。 */
	.workbench::-webkit-scrollbar { display: none; width: 0; height: 0; }
	:deep(::-webkit-scrollbar) { display: none; width: 0; height: 0; }
	.workbench {
		position: relative;
		box-sizing: border-box;
		width: 100%;
		min-height: 100vh;
		overflow: visible;
		color: #000;
		background: linear-gradient(180deg, #fffaf2 1.014%, #f9f9f9 18.132%);
		font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
	}
	.header-bg { position: absolute; top: 0; left: 0; width: 750rpx; height: 418rpx; opacity: .13; transform: scaleY(-1); pointer-events: none; }
	.page-nav-abs { position: absolute; top: 0; left: 0; z-index: 10; width: 100%; }
	.greeting { position: absolute; top: 204rpx; left: 30rpx; }
	.greeting-line { display: flex; align-items: center; height: 50rpx; }
	.greeting-title { font-size: 40rpx; font-weight: 500; line-height: 50rpx; }
	.greeting-subtitle { display: block; margin-top: 14rpx; color: #6b7280; font-size: 28rpx; line-height: 40rpx; }
	.header-art { position: absolute; top: 188rpx; right: 62rpx; width: 202rpx; height: 166rpx; overflow: hidden; opacity: .3; pointer-events: none; }
	.header-art image { position: absolute; top: -102rpx; left: 0; width: 244rpx; }

	.notice-bar { position: absolute; top: 348rpx; left: 30rpx; display: flex; align-items: center; box-sizing: border-box; width: 690rpx; height: 82rpx; padding: 0 18rpx; overflow: hidden; background: linear-gradient(181deg, #fff 0%, #ffe4cd 137%); border: 2rpx solid #fff; border-radius: 16rpx; }
	.notice-icon { position: relative; flex: 0 0 auto; width: 38rpx; height: 46rpx; overflow: hidden; transform: rotate(180deg) scaleY(-1); }
	.notice-icon image { position: absolute; top: -4rpx; left: -8rpx; width: 52rpx; height: 54rpx; }
	.notice-text { flex: 1; min-width: 0; margin-left: 10rpx; overflow: hidden; color: #a0490d; font-size: 28rpx; line-height: 40rpx; white-space: nowrap; text-overflow: ellipsis; }
	.notice-arrow { flex: 0 0 auto; width: 36rpx; height: 36rpx; margin-left: 8rpx; transform: rotate(90deg) scaleY(-1); }

	.statistics { position: absolute; top: 454rpx; left: 30rpx; display: grid; grid-template-columns: repeat(2, 336rpx); gap: 18rpx; }
	.stat-card { position: relative; box-sizing: border-box; width: 336rpx; height: 154rpx; padding: 22rpx 24rpx; overflow: hidden; background: #fff; border: 2rpx solid #fff; border-radius: 24rpx; }
	.stat-card--pressed { background: #fff8f1; }
	.statistics--four { grid-template-rows: repeat(2, 154rpx); gap: 20rpx 18rpx; }
	.stat-label { display: block; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 40rpx; }
	.stat-value-line { display: flex; align-items: baseline; margin-top: 6rpx; }
	.stat-value { color: #111827; font-family: DIN, "Arial Black", sans-serif; font-size: 40rpx; font-weight: 900; line-height: 50rpx; }
	.stat-unit { margin-left: 6rpx; color: rgba(0,0,0,.45); font-size: 24rpx; }
	.stat-shadow { position: absolute; right: 24rpx; bottom: 20rpx; width: 90rpx; height: 44rpx; }
	.stat-art { position: absolute; right: 22rpx; bottom: 16rpx; width: 104rpx; height: 94rpx; opacity: .5; }

	.quick-section { position: absolute; top: 628rpx; left: 30rpx; width: 690rpx; }
	.quick-section--opened { top: 802rpx; }
	.section-title { display: block; height: 44rpx; font-size: 32rpx; font-weight: 500; line-height: 44rpx; }
	.quick-card { display: flex; align-items: stretch; justify-content: space-around; box-sizing: border-box; width: 690rpx; height: 166rpx; margin-top: 20rpx; padding: 30rpx 18rpx 22rpx; background: #fff; border-radius: 24rpx; }
	.quick-item { display: flex; flex: 1; flex-direction: column; align-items: center; }
	.quick-icon { width: 56rpx; height: 56rpx; }
	.quick-icon.purchase { width: 54rpx; height: 54rpx; margin-top: 2rpx; }
	.quick-icon.recipient { width: 44rpx; height: 48rpx; margin-top: 4rpx; margin-bottom: 4rpx; }
	.quick-icon.warehouse { width: 50rpx; height: 48rpx; margin-top: 4rpx; margin-bottom: 4rpx; }
	.quick-label { margin-top: 14rpx; color: rgba(0,0,0,.85); font-size: 24rpx; line-height: 34rpx; white-space: nowrap; }

	.todo-card { position: absolute; top: 882rpx; left: 30rpx; box-sizing: border-box; width: 690rpx; min-height: 442rpx; padding: 32rpx 28rpx 28rpx; background: #fff; border-radius: 24rpx; }
	.todo-card--opened { top: 1060rpx; }
	.todo-header { display: flex; align-items: center; justify-content: space-between; height: 44rpx; }
	.todo-title-wrap { display: flex; align-items: center; min-width: 0; }
	.todo-title { font-size: 32rpx; font-weight: 500; line-height: 44rpx; }
	.todo-badge { display: flex; align-items: center; justify-content: center; box-sizing: border-box; min-width: 36rpx; height: 36rpx; margin-left: 12rpx; padding: 0 10rpx; background: linear-gradient(135deg, #ff8a3d 0%, #ff6a00 100%); border-radius: 18rpx; }
	.todo-badge-num { display: block; height: 36rpx; color: #fff; font-family: DIN, "Arial Black", sans-serif; font-size: 22rpx; font-weight: 700; line-height: 36rpx; text-align: center; }
	.todo-more { display: flex; align-items: center; padding: 8rpx 0 8rpx 18rpx; color: rgba(0,0,0,.4); font-size: 24rpx; line-height: 34rpx; }
	.todo-more image { width: 24rpx; height: 24rpx; margin-left: 2rpx; transform: rotate(90deg) scaleY(-1); }
	.todo-row { position: relative; display: flex; align-items: center; box-sizing: border-box; min-height: 112rpx; padding: 20rpx 8rpx 20rpx 4rpx; border-radius: 16rpx; }
	.todo-row--pressed { background: #fff6ef; }
	.todo-header + .todo-row { margin-top: 12rpx; }
	.todo-row + .todo-row { border-top: 1rpx solid #f3f4f6; }
	.todo-dot { flex: 0 0 auto; width: 14rpx; height: 14rpx; margin-right: 16rpx; background: #ff6a00; border-radius: 50%; box-shadow: 0 0 0 6rpx rgba(255, 106, 0, .12); }
	.todo-content { display: flex; flex: 1; flex-direction: column; min-width: 0; }
	.todo-name { color: rgba(0,0,0,.85); font-size: 28rpx; font-weight: 500; line-height: 40rpx; }
	.todo-description { margin-top: 6rpx; color: rgba(0,0,0,.4); font-size: 24rpx; line-height: 34rpx; }
	.todo-arrow { flex: 0 0 auto; width: 40rpx; height: 40rpx; margin-left: 8rpx; opacity: .55; transform: rotate(90deg) scaleY(-1); }
	.todo-empty { padding: 88rpx 0 60rpx; color: rgba(0,0,0,.35); font-size: 26rpx; text-align: center; }

</style>
