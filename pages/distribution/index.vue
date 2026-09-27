<template>
	<view class="page">
		<image class="bg" src="/static/common/header-bg.png" mode="aspectFill" />
		<image class="art" src="/static/distribution/header-art.png" />
		<image class="coin" src="/static/distribution/coin.png" />
		<page-nav class="page-nav-abs" title="分销中心" :show-back="false" transparent />
		<scroll-view class="content" scroll-y :style="{ top: contentTop }">
			<view class="body">
				<view class="level"><text>{{profile.title}}</text>
					<image src="/static/distribution/sparkle.png" />
				</view>
				<view v-if="showAgreementEntry" class="agreement" @tap="openDeposit">
					<view>
						<image src="/static/distribution/agreement.png" /><b>分销协议({{agreementStatusLabel}})</b>
					</view><text>{{agreementActionLabel}} ›</text>
				</view>
				<view class="team card">
					<view class="title"><b>我的团队</b>
						<view @tap="openTeam" style="display:flex;align-items:center"><text
								style="color:#f97316;font-size:24rpx">查看全部</text>
							<image src="/static/distribution/figma-arrow-right.svg"
								style="width:24rpx;height:24rpx;margin-left:4rpx;transform:rotate(-90deg)" />
						</view>
					</view>
					<view class="team-stats">
						<view style="box-sizing:border-box;padding-top:14rpx;justify-content:flex-start">
							<text>消费总人数</text>
							<view
								style="display:flex;flex-direction:row;align-items:baseline;justify-content:center;height:auto;margin-top:12rpx;background:transparent">
								<text
									style="color:#1a1c1c;font-size:40rpx;font-weight:500">{{profile.teamTotal}}</text><text
									style="margin-left:6rpx;color:#1a1c1c;font-size:24rpx">人</text></view>
						</view>
						<view style="box-sizing:border-box;padding-top:14rpx;justify-content:flex-start">
							<text>星级人数</text>
							<view
								style="display:flex;flex-direction:row;align-items:baseline;justify-content:center;height:auto;margin-top:12rpx;background:transparent">
								<text
									style="color:#1a1c1c;font-size:40rpx;font-weight:500">{{profile.starCount}}</text><text
									style="margin-left:6rpx;color:#1a1c1c;font-size:24rpx">人</text></view>
						</view>
					</view>
				</view>
				<view class="binding" @tap="openBinding">
					<view>
						<image src="/static/distribution/binding-icon.png" /><b>消费者绑定</b>
					</view><text>{{level===1?'暂未开启':'立即绑定'}} ›</text>
				</view>
				<view v-if="level>1" class="details">
					<view class="detail-title"><b>订单明细</b><text @tap="openRecords">查看全部›</text></view>
					<view class="detail-tools">
						<view class="types"><text v-for="(t,i) in types" :key="t" :class="{active:typeIndex===i}"
								@tap="changeType(i)">{{t}}</text></view>
						<view class="filter-button" :class="{active: filterActive}" @tap="openFilter">
							<image src="/static/distribution/filter.svg" />
						</view>
					</view>
					<view class="filter-tags-wrap" :class="{ show: filterBarVisible }">
						<view class="filter-tags">
							<view v-if="filterBarTags.dateText" class="filter-tag" @tap="openFilter"><text
									class="filter-tag-label">分销时间</text><text
									class="filter-tag-text">{{ filterBarTags.dateText }}</text></view>
							<view v-if="filterBarTags.scopeText" class="filter-tag" @tap="openFilter"><text
									class="filter-tag-label">类型</text><text
									class="filter-tag-text">{{ filterBarTags.scopeText }}</text></view>
							<view v-if="filterBarTags.levelText" class="filter-tag" @tap="openFilter"><text
									class="filter-tag-label">星级</text><text
									class="filter-tag-text">{{ filterBarTags.levelText }}</text></view><text
								v-if="filterBarVisible" class="filter-tag-clear" @tap.stop="clearFilter">清除</text>
						</view>
					</view>
					<view class="detail-list" :class="{'is-empty': !recordsLoading && !rows.length}">
						<view v-for="item in rows" :key="item.id" class="detail-row">
							<view><b>{{ item.from_name || '用户' }}</b><em
									:style="levelTagStyle(item.level_color, item.from_level)">{{ item.level_title || '暂无等级' }}</em><text>尾号:{{ item.mobile_tail || mobileTail(item.from_mobile) }}</text>
							</view>
							<view><text>类型: {{ typeLabel(item.order_type) }}　
									金额:¥{{ formatAmount(item.amount) }}</text><text>{{ item.createtime_text || formatDate(item.createtime) }}</text>
							</view>
						</view>
						<view v-if="!recordsLoading && !rows.length" class="records-empty">
							<view class="records-empty-icon">
								<view class="records-empty-doc">
									<view />
									<view />
									<view class="short" />
								</view>
							</view><text class="records-empty-title">暂无分销明细</text><text
								class="records-empty-desc">{{ filterActive ? '未找到符合条件的分销明细' : '产生采购或代发订单后，明细将显示在这里' }}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
		<view v-if="filterVisible" class="filter-layer">
			<view class="filter-mask" @tap="closeFilter" />
			<view class="filter-sheet" @tap.stop>
				<view class="filter-handle" /><text class="filter-title">筛选分销明细</text>
				<view class="filter-section"><text class="filter-label">分销时间</text>
					<view class="filter-presets"><text v-for="item in datePresets" :key="item.key"
							:class="{active: draftPreset === item.key}"
							@tap="applyPreset(item.key)">{{ item.label }}</text></view>
					<view class="filter-date-row">
						<picker mode="date" :value="draftStartDate" @change="changeDraftDate('start', $event)">
							<view class="filter-date-box"><text
									:class="{placeholder: !draftStartDate}">{{ draftStartDate || '开始日期' }}</text></view>
						</picker><text class="filter-date-sep">至</text>
						<picker mode="date" :value="draftEndDate" :start="draftStartDate"
							@change="changeDraftDate('end', $event)">
							<view class="filter-date-box"><text
									:class="{placeholder: !draftEndDate}">{{ draftEndDate || '结束日期' }}</text></view>
						</picker>
					</view>
				</view>
				<view class="filter-section"><text class="filter-label">星级</text>
					<view class="filter-presets wrap"><text v-for="item in levelOptions" :key="item.value"
							:class="{active: draftLevel === item.value}"
							@tap="draftLevel = item.value">{{ item.label }}</text></view>
				</view>
				<view class="filter-section"><text class="filter-label">团队/直招</text>
					<view class="filter-presets"><text v-for="item in scopeOptions" :key="item.value"
							:class="{active: draftScope === item.value}"
							@tap="draftScope = item.value">{{ item.label }}</text></view>
				</view>
				<view class="filter-actions"><button class="filter-reset" @tap="resetFilter">重置</button><button
						class="filter-confirm" @tap="confirmFilter">确定</button></view>
			</view>
		</view>
		<bottom-tabbar :items="tabs" />
	</view>
</template>
<style scoped>
	.binding-tip {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		width: 690rpx;
		min-height: 128rpx;
		margin-top: 12rpx;
		padding: 18rpx 20rpx;
		background: linear-gradient(135deg, #fffaf5 0%, #fff2e8 100%);
		border: 2rpx solid #ffe1cb;
		border-radius: 16rpx
	}

	.binding-tip-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 56rpx;
		height: 56rpx;
		margin-right: 14rpx;
		background: #fff;
		border-radius: 16rpx;
		box-shadow: 0 6rpx 16rpx rgba(246, 111, 42, .1)
	}

	.binding-tip-icon image {
		width: 32rpx;
		height: 32rpx
	}

	.binding-tip-copy {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0
	}

	.binding-tip-title {
		color: #7b5135;
		font-size: 25rpx;
		font-weight: 600
	}

	.binding-tip-desc {
		display: flex;
		flex-direction: column;
		margin-top: 6rpx;
		color: #a98a74;
		font-size: 21rpx;
		line-height: 30rpx
	}

	.binding-tip-desc text+text {
		margin-top: 3rpx
	}

	.binding-tip-desc b {
		color: #f05a26;
		font-size: 22rpx;
		font-weight: 600
	}

	.binding-tip-action {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		margin: 0 0 0 14rpx;
		padding: 0;
		color: #f97316;
		font-size: 23rpx;
		font-weight: 600;
		line-height: 36rpx;
		background: transparent;
		border: 0
	}

	.binding-tip-action:after {
		border: 0
	}

	.binding-tip-arrow {
		margin-left: 7rpx;
		font-size: 30rpx;
		line-height: 1
	}

	.upgrade-mask {
		position: fixed;
		z-index: 1100;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, .48)
	}

	.upgrade-dialog {
		box-sizing: border-box;
		width: 610rpx;
		padding: 32rpx 30rpx 28rpx;
		background: #fff;
		border-radius: 28rpx
	}

	.upgrade-dialog-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 26rpx;
		color: #28211d;
		font-size: 32rpx;
		font-weight: 600
	}

	.upgrade-dialog-head text:last-child {
		width: 48rpx;
		color: #aaa;
		font-size: 44rpx;
		font-weight: 300;
		line-height: 42rpx;
		text-align: right
	}

	.upgrade-dialog-body {
		max-height: 560rpx;
		margin: 8rpx 0 22rpx
	}

	.upgrade-dialog-note {
		display: block;
		color: #796a5e;
		font-size: 24rpx;
		line-height: 38rpx;
		white-space: pre-wrap
	}

	.upgrade-dialog button {
		height: 76rpx;
		color: #fff;
		font-size: 27rpx;
		line-height: 76rpx;
		background: linear-gradient(90deg, #ff451d, #ff7918);
		border: 0;
		border-radius: 40rpx
	}

	.upgrade-dialog button:after {
		border: 0
	}

	.detail-title>text {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		height: 52rpx;
		padding: 0 16rpx;
		color: transparent !important;
		font-size: 0 !important;
		font-weight: 500;
		background: #fff7f1;
		border: 2rpx solid #ffe6d5;
		border-radius: 28rpx
	}

	.detail-title>text:before {
		color: #f36a2e;
		font-size: 23rpx;
		content: '查看全部'
	}

	.detail-title>text:after {
		width: 12rpx;
		height: 12rpx;
		margin-left: 10rpx;
		content: '';
		border-top: 3rpx solid #f36a2e;
		border-right: 3rpx solid #f36a2e;
		transform: rotate(45deg)
	}

	.filter-button {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 56rpx;
		height: 56rpx;
		background: #f5f5f5;
		border-radius: 50%
	}

	.filter-button image {
		width: 28rpx;
		height: 26rpx
	}

	.filter-button.active {
		background: rgba(249, 115, 22, .12);
		box-shadow: 0 0 0 2rpx rgba(249, 115, 22, .35)
	}

	.filter-tags-wrap {
		overflow: hidden;
		max-height: 0;
		margin-top: 0;
		opacity: 0;
		pointer-events: none;
		transition: max-height .2s ease, margin-top .2s ease, opacity .18s ease
	}

	.filter-tags-wrap.show {
		max-height: 120rpx;
		margin-top: 16rpx;
		opacity: 1;
		pointer-events: auto
	}

	.filter-tags {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12rpx
	}

	.filter-tag {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		height: 48rpx;
		padding: 0 18rpx;
		background: #fff7ed;
		border-radius: 24rpx;
		box-shadow: inset 0 0 0 2rpx rgba(249, 115, 22, .25)
	}

	.filter-tag-label {
		flex: none;
		margin-right: 10rpx;
		color: #f97316;
		font-size: 22rpx;
		font-weight: 500
	}

	.filter-tag-text {
		color: #666;
		font-size: 22rpx
	}

	.filter-tag-clear {
		flex: none;
		margin-left: 4rpx;
		color: #999;
		font-size: 22rpx;
		line-height: 48rpx
	}

	.filter-layer {
		position: fixed;
		z-index: 2000;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0
	}

	.filter-mask {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, .45)
	}

	.filter-sheet {
		position: absolute;
		bottom: 0;
		left: 0;
		box-sizing: border-box;
		width: 100%;
		padding: 28rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));
		background: linear-gradient(180deg, #fffaf2 0%, #fff 28%);
		border-radius: 36rpx 36rpx 0 0;
		box-shadow: 0 -16rpx 40rpx rgba(0, 0, 0, .1)
	}

	.filter-handle {
		width: 72rpx;
		height: 8rpx;
		margin: 0 auto 28rpx;
		background: #e5e7eb;
		border-radius: 8rpx
	}

	.filter-title {
		display: block;
		margin-bottom: 36rpx;
		color: #1f2937;
		font-size: 34rpx;
		font-weight: 600;
		line-height: 48rpx;
		text-align: center
	}

	.filter-section {
		margin-bottom: 36rpx
	}

	.filter-label {
		display: block;
		margin-bottom: 20rpx;
		color: #6b7280;
		font-size: 26rpx;
		line-height: 36rpx
	}

	.filter-presets {
		display: flex;
		gap: 16rpx;
		margin-bottom: 24rpx
	}

	.filter-presets.wrap {
		flex-wrap: wrap;
		margin-bottom: 0
	}

	.filter-presets text {
		flex: 1;
		height: 64rpx;
		color: #666;
		font-size: 26rpx;
		line-height: 64rpx;
		text-align: center;
		background: #f5f5f5;
		border-radius: 32rpx
	}

	.filter-presets.wrap text {
		flex: none;
		min-width: 120rpx;
		padding: 0 20rpx;
		font-size: 24rpx
	}

	.filter-presets text.active {
		color: #f97316;
		font-weight: 500;
		background: #fff7ed;
		box-shadow: inset 0 0 0 2rpx #fdba74
	}

	.filter-date-row {
		display: flex;
		align-items: center;
		gap: 16rpx
	}

	.filter-date-row picker {
		flex: 1
	}

	.filter-date-box {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		height: 80rpx;
		padding: 0 20rpx;
		color: #1f2937;
		font-size: 28rpx;
		background: #fff;
		border: 2rpx solid #eee;
		border-radius: 16rpx
	}

	.filter-date-box .placeholder {
		color: #999
	}

	.filter-date-sep {
		flex: none;
		color: #999;
		font-size: 26rpx
	}

	.filter-actions {
		display: flex;
		gap: 20rpx
	}

	.filter-actions button {
		flex: 1;
		height: 88rpx;
		margin: 0;
		padding: 0;
		font-size: 30rpx;
		line-height: 88rpx;
		border-radius: 44rpx
	}

	.filter-actions button::after {
		border: 0
	}

	.filter-reset {
		color: #666;
		background: #f3f4f6
	}

	.filter-confirm {
		color: #fff;
		background: linear-gradient(90deg, #ff8a37, #fa3b19)
	}

	.records-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 100%;
		min-height: 360rpx;
		padding: 40rpx 36rpx 48rpx
	}

	.records-empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 108rpx;
		height: 108rpx;
		margin-bottom: 22rpx;
		background: linear-gradient(160deg, #fff8f1 0%, #ffe9d6 100%);
		border-radius: 32rpx;
		box-shadow: 0 12rpx 28rpx rgba(249, 115, 22, .08)
	}

	.records-empty-doc {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 10rpx;
		box-sizing: border-box;
		width: 46rpx;
		height: 56rpx;
		padding: 10rpx 8rpx;
		background: #fff;
		border: 3rpx solid #f2a06a;
		border-radius: 10rpx
	}

	.records-empty-doc view {
		height: 4rpx;
		background: #f2a06a;
		border-radius: 4rpx;
		opacity: .85
	}

	.records-empty-doc .short {
		width: 58%
	}

	.records-empty-title {
		color: #7a6556;
		font-size: 28rpx;
		font-weight: 500;
		line-height: 40rpx
	}

	.records-empty-desc {
		margin-top: 10rpx;
		color: #b09a8a;
		font-size: 22rpx;
		line-height: 32rpx;
		text-align: center
	}

	.detail-list {
		display: flex;
		flex-direction: column;
		min-height: 420rpx
	}

	.detail-list.is-empty {
		justify-content: center;
		background: linear-gradient(180deg, #fff 0%, #fffaf6 100%)
	}
</style>
<script>
	import {
		distributionApi
	} from '../../api'
	import {
		dismissAllToasts
	} from '../../utils/app-dialog'
	import {
		levelTagStyle
	} from '../../utils/level-color'
	import {
		applyLevelsToOptions
	} from '../../utils/level-options'
	import BottomTabbar from '@/components/bottom-tabbar/bottom-tabbar.vue'
	import PageNav from '@/components/page-nav/page-nav.vue'
	import {
		getCapsuleLayout
	} from '@/utils/capsule'

	export default {
		components: {
			BottomTabbar,
			PageNav
		},
		data() {
			return {
				navBarHeight: getCapsuleLayout().navBarHeight,
				level: 1,
				agreementMinLevel: 4,
				distribution: null,
				typeIndex: 0,
				startDate: '',
				endDate: '',
				scope: 'all',
				levelFilter: 0,
				filterVisible: false,
				filterBarVisible: false,
				filterBarTags: {
					dateText: '',
					scopeText: '',
					levelText: ''
				},
				filterBarTimer: null,
				draftStartDate: '',
				draftEndDate: '',
				draftPreset: '',
				draftScope: 'all',
				draftLevel: 0,
				datePresets: [{
					key: '7d',
					label: '近7天'
				}, {
					key: '30d',
					label: '近30天'
				}, {
					key: 'month',
					label: '本月'
				}],
				scopeOptions: [{
					value: 'all',
					label: '全部'
				}, {
					value: 'direct',
					label: '直招'
				}, {
					value: 'team',
					label: '团队'
				}],
				levelOptions: [{
					value: 0,
					label: '全部'
				}],
				types: ['全部', '云仓', '发货'],
				rows: [],
				recordsLoading: false,
				recordsSeq: 0,
				tabs: [{
					label: '工作台',
					icon: '/static/order/tab-workbench.svg',
					route: '/pages/workbench/no-warehouse'
				}, {
					label: '商品',
					icon: '/static/order/tab-product.svg',
					route: '/pages/product/index'
				}, {
					label: '订单',
					icon: '/static/product/tab-order.svg',
					route: '/pages/order/index'
				}, {
					label: '分销',
					icon: '/static/distribution/tab-active.svg',
					active: true
				}, {
					label: '我的',
					icon: '/static/order/tab-profile.svg',
					route: '/pages/profile/index'
				}]
			}
		},
		beforeDestroy() {
			if (this.filterBarTimer) clearTimeout(this.filterBarTimer)
		},
		computed: {
			contentTop() {
				return this.navBarHeight + 'px'
			},
			recordType() {
				return this.typeIndex === 1 ? 'purchase' : this.typeIndex === 2 ? 'delivery' : ''
			},
			filterActive() {
				return !!(this.startDate || this.endDate || this.scope !== 'all' || this.levelFilter > 0)
			},
			dateFilterText() {
				if (this.startDate && this.endDate) {
					return this.startDate === this.endDate ? this.startDate : this.startDate + ' 至 ' + this.endDate
				}
				if (this.startDate) return this.startDate + ' 起'
				if (this.endDate) return '至 ' + this.endDate
				return ''
			},
			scopeLabel() {
				const hit = this.scopeOptions.find(item => item.value === this.scope)
				return hit ? hit.label : '全部'
			},
			levelFilterLabel() {
				const hit = this.levelOptions.find(item => item.value === this.levelFilter)
				return hit ? hit.label : '全部'
			},
			agreementStatus() {
				return (this.distribution && this.distribution.agreement_status) || 'none'
			},
			showAgreementEntry() {
				// 双方签完后不再在分销设置中展示
				return this.level >= this.agreementMinLevel && this.agreementStatus !== 'signed'
			},
			agreementStatusLabel() {
				if (this.agreementStatus === 'pending_party_a') return '乙方已签，待甲方签名'
				if (this.agreementStatus === 'signed') return '已签署'
				return '未签署'
			},
			agreementActionLabel() {
				if (this.agreementStatus === 'pending_party_a') return '查看'
				if (this.agreementStatus === 'signed') return '查看'
				return '去签署'
			},
			profile() {
				const fallback = [{}, {
					title: '一星店长',
					price: 358
				}, {
					title: '二星店长',
					price: 200
				}, {
					title: '三星经销商',
					price: 150
				}, {
					title: '四星分销商',
					price: 150
				}][this.level] || {}
				const data = this.distribution || {}
				return {
					title: data.level_title || fallback.title || '暂无等级',
					price: data.take_price !== undefined ? data.take_price : fallback.price || 0,
					teamTotal: data.team_total !== undefined ? data.team_total : 0,
					starCount: data.star_count !== undefined ? data.star_count : 0,
					consumptionAmount: Number(data.consumption_amount || 0).toFixed(2),
					distributionAmount: Number(data.distribution_amount || 0).toFixed(2),
					directLevel3: Number(data.direct_level3_count || 0),
					teamLevel3: Number(data.team_level3_count || 0)
				}
			}
		},
		onLoad(o) {
			this.navBarHeight = getCapsuleLayout(true).navBarHeight;
			const n = Number(o.level);
			if (n >= 1 && n <= 4) this.level = n
		},
		onShow() {
			dismissAllToasts();
			this.loadDistribution();
			this.loadRecords()
		},
		methods: {
			async loadDistribution() {
				try {
					const data = await distributionApi.index()
					this.distribution = data || null
					if (data && data.level) this.level = Number(data.level)
					if (data && (data.agreement_sign_level || data.agreement_min_level)) {
						this.agreementMinLevel = Number(data.agreement_sign_level || data.agreement_min_level)
					}
					if (data && data.levels) applyLevelsToOptions(this.levelOptions, data.levels)
					if (data && data.just_upgraded && !this._upgradeToastShown) {
						this._upgradeToastShown = true
						uni.showToast({
							title: '恭喜升级为' + (data.level_title || ''),
							icon: 'none'
						})
					}
				} catch (e) {}
			},
			async loadRecords() {
				const seq = ++this.recordsSeq
				this.recordsLoading = true
				try {
					const params = {
						page: 1,
						limit: 5,
						order_type: this.recordType,
						start_time: this.startDate || '',
						end_time: this.endDate || '',
						scope: this.scope || 'all',
						level: this.levelFilter || ''
					}
					const data = await distributionApi.records(params)
					if (seq !== this.recordsSeq) return
					this.rows = (data && data.list) || []
					if (data && data.levels) applyLevelsToOptions(this.levelOptions, data.levels)
				} catch (e) {
					if (seq !== this.recordsSeq) return
					this.rows = []
				} finally {
					if (seq === this.recordsSeq) this.recordsLoading = false
				}
			},
			changeType(index) {
				this.typeIndex = index;
				this.loadRecords()
			},
			formatDay(date) {
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
				return {
					start: this.formatDay(start),
					end: this.formatDay(end)
				}
			},
			openFilter() {
				this.draftStartDate = this.startDate
				this.draftEndDate = this.endDate
				this.draftPreset = this.matchPreset(this.startDate, this.endDate)
				this.draftScope = this.scope
				this.draftLevel = this.levelFilter
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
				const value = (event.detail && event.detail.value) || ''
				if (type === 'start') this.draftStartDate = value
				else this.draftEndDate = value
				this.draftPreset = this.matchPreset(this.draftStartDate, this.draftEndDate)
			},
			resetFilter() {
				this.draftStartDate = ''
				this.draftEndDate = ''
				this.draftPreset = ''
				this.draftScope = 'all'
				this.draftLevel = 0
			},
			syncFilterBar() {
				const dateText = (this.startDate || this.endDate) ? this.dateFilterText : ''
				const scopeText = this.scope !== 'all' ? this.scopeLabel : ''
				const levelText = this.levelFilter > 0 ? this.levelFilterLabel : ''
				this.filterBarTags = {
					dateText,
					scopeText,
					levelText
				}
				this.filterBarVisible = !!(dateText || scopeText || levelText)
			},
			hideFilterBar() {
				this.filterBarVisible = false
				if (this.filterBarTimer) clearTimeout(this.filterBarTimer)
				this.filterBarTimer = setTimeout(() => {
					this.filterBarTags = {
						dateText: '',
						scopeText: '',
						levelText: ''
					}
					this.filterBarTimer = null
				}, 220)
			},
			confirmFilter() {
				if (this.draftStartDate && this.draftEndDate && this.draftStartDate > this.draftEndDate) {
					uni.showToast({
						title: '开始日期不能晚于结束日期',
						icon: 'none'
					})
					return
				}
				this.startDate = this.draftStartDate
				this.endDate = this.draftEndDate
				this.scope = this.draftScope
				this.levelFilter = this.draftLevel
				this.filterVisible = false
				this.syncFilterBar()
				this.loadRecords()
			},
			async clearFilter() {
				if (!this.filterBarVisible && !this.filterActive) return
				this.startDate = ''
				this.endDate = ''
				this.scope = 'all'
				this.levelFilter = 0
				this.draftStartDate = ''
				this.draftEndDate = ''
				this.draftPreset = ''
				this.draftScope = 'all'
				this.draftLevel = 0
				await this.loadRecords()
				this.hideFilterBar()
			},
			typeLabel(type) {
				return ({
					purchase: '云仓',
					delivery: '发货'
				})[type] || type || '—'
			},
			formatAmount(value) {
				const amount = Number(value);
				return Number.isFinite(amount) ? amount.toFixed(2).replace(/\.00$/, '') : '0'
			},
			mobileTail(mobile) {
				const value = String(mobile || '');
				return value.length >= 4 ? value.slice(-4) : '—'
			},
			formatDate(value) {
				if (!value) return '—';
				const date = new Date(/^\d+$/.test(String(value)) ? Number(value) * 1000 : value);
				if (Number.isNaN(date.getTime())) return String(value);
				const pad = n => String(n).padStart(2, '0');
				return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate()) + ' ' + pad(date
					.getHours()) + ':' + pad(date.getMinutes())
			},
			levelTagStyle,
			openTeam() {
				uni.navigateTo({
					url: '/pages/distribution/team?mode=' + (this.level >= 3 ? 'agent' : 'star')
				})
			},
			openBinding() {
				const enabled = this.level > 1 || !!(this.distribution && Number(this.distribution.bind_enabled))
				if (!enabled) {
					uni.showToast({
						title: '当前等级暂不可绑定消费者',
						icon: 'none'
					})
					return
				}
				uni.navigateTo({
					url: '/pages/distribution/binding'
				})
			},
			openDeposit() {
				uni.navigateTo({
					url: '/pages/profile/agreement-detail?type=distribution'
				})
			},
			openRecords() {
				const q = []
				if (this.recordType) q.push('order_type=' + this.recordType)
				if (this.startDate) q.push('start_time=' + this.startDate)
				if (this.endDate) q.push('end_time=' + this.endDate)
				if (this.scope && this.scope !== 'all') q.push('scope=' + this.scope)
				if (this.levelFilter > 0) q.push('level=' + this.levelFilter)
				uni.navigateTo({
					url: '/pages/distribution/records' + (q.length ? '?' + q.join('&') : '')
				})
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
		background: linear-gradient(179deg, #ffe7ce 1.5%, #f9f9f9 50%);
		font-family: "PingFang SC", sans-serif
	}

	.bg {
		position: absolute;
		top: 0;
		right: -276rpx;
		width: 1302rpx;
		height: 724rpx;
		opacity: .2;
		transform: scaleY(-1)
	}

	.art {
		position: absolute;
		top: 122rpx;
		left: 488rpx;
		width: 370rpx;
		height: 376rpx;
		opacity: .2
	}

	.coin {
		position: absolute;
		top: 196rpx;
		left: 558rpx;
		width: 140rpx;
		height: 140rpx
	}

	.page-nav-abs {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		width: 100%
	}

	.content {
		position: absolute;
		bottom: calc(110rpx + constant(safe-area-inset-bottom));
		bottom: calc(110rpx + env(safe-area-inset-bottom));
		width: 100%
	}

	.body {
		position: relative;
		box-sizing: border-box;
		min-height: 1100rpx;
		padding: 6rpx 30rpx 48rpx
	}

	.level {
		display: flex;
		align-items: center;
		height: 54rpx;
		color: #a35312;
		font-size: 40rpx;
		font-weight: 700
	}

	.level image {
		width: 52rpx;
		height: 52rpx
	}

	.price {
		font-size: 24rpx
	}

	.price b {
		color: #ff4b13;
		font-size: 36rpx;
		font-weight: 500
	}

	.price small {
		color: #999
	}

	.card {
		background: #fff;
		border-radius: 24rpx
	}

	.agreement,
	.binding {
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-sizing: border-box;
		width: 690rpx;
		height: 84rpx;
		margin-top: 24rpx;
		padding: 0 24rpx;
		color: #a0490d;
		background: rgba(255, 255, 255, .7);
		border: 2rpx solid #fff;
		border-radius: 16rpx
	}

	.agreement view,
	.binding view {
		display: flex;
		align-items: center
	}

	.agreement image {
		width: 72rpx;
		height: 54rpx
	}

	.binding {
		height: 96rpx;
		color: #111;
		background: rgba(255, 245, 235, .78)
	}

	.binding image {
		width: 36rpx;
		height: 36rpx;
		margin-right: 8rpx
	}

	.binding>text,
	.agreement>text,
	.title>text {
		color: #ff642f
	}

	.team {
		box-sizing: border-box;
		height: 268rpx;
		margin-top: 32rpx;
		padding: 30rpx
	}

	.title,
	.detail-title {
		display: flex;
		justify-content: space-between
	}

	.title b,
	.detail-title b {
		font-size: 32rpx;
		font-weight: 500
	}

	.title text,
	.detail-title text {
		font-size: 24rpx
	}

	.team-stats {
		display: flex;
		gap: 24rpx;
		margin-top: 24rpx
	}

	.team-stats view {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 134rpx;
		background: #fafafa;
		border-radius: 16rpx
	}

	.team-stats text {
		color: #5a6170;
		font-size: 24rpx
	}

	.team-stats b {
		margin-top: 12rpx;
		font-size: 40rpx;
		font-weight: 500
	}

	.team-stats small {
		font-size: 24rpx
	}

	.details {
		margin-top: 30rpx
	}

	.detail-tools {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 14rpx
	}

	.types {
		display: flex;
		gap: 56rpx
	}

	.types text {
		position: relative;
		color: #5d5d5d;
		font-size: 26rpx
	}

	.types .active {
		color: #ff5b24
	}

	.types .active:after {
		position: absolute;
		bottom: -18rpx;
		left: 50%;
		width: 36rpx;
		height: 4rpx;
		content: "";
		background: #ff5b24;
		transform: translateX(-50%)
	}

	.detail-list {
		margin-top: 24rpx;
		padding: 0 30rpx;
		background: #fff;
		border-radius: 20rpx;
		box-shadow: 0 8rpx 24rpx rgba(45, 35, 25, .03)
	}

	.detail-list.is-empty {
		padding: 0
	}

	.detail-row {
		padding: 24rpx 0;
		border-bottom: 2rpx solid rgba(0, 0, 0, .04)
	}

	.detail-row>view {
		display: flex;
		align-items: center;
		justify-content: space-between
	}

	.detail-row>view+view {
		margin-top: 14rpx;
		color: #666;
		font-size: 24rpx
	}

	.detail-row b {
		font-size: 32rpx
	}

	.detail-row em {
		margin-right: auto;
		margin-left: 10rpx;
		padding: 2rpx 8rpx;
		font-size: 20rpx;
		font-style: normal;
		border-radius: 12rpx
	}

	.detail-row>view:first-child>text {
		font-size: 24rpx
	}
</style>