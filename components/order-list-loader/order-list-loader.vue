<template>
	<view class="loader-shell" :style="shellStyle">
		<scroll-view class="loader" scroll-y :show-scrollbar="false" :lower-threshold="80" :refresher-enabled="true" :refresher-triggered="refreshing" :refresher-threshold="90" refresher-default-style="none" refresher-background="#f8f8f8" @refresherpulling="pulling" @refresherrefresh="refresh" @refresherrestore="restore" @refresherabort="restore" @scrolltolower="loadMore">
			<slot />
			<view class="load-indicator" v-if="showFooter && (loading || !hasMore)">
				<template v-if="loading">
					<text class="load-spinner">◌</text>
					<text>正在加载下一页</text>
				</template>
				<view v-else class="load-end">
					<view class="load-end-line"/>
					<text class="load-end-text">已经到底了</text>
					<view class="load-end-line"/>
				</view>
			</view>
		</scroll-view>
		<view class="refresh-layer" :class="{ visible: showRefresh, refreshing, done: refreshState === 'done' }">
			<view class="refresh-orbit"><view class="refresh-core"><text v-if="refreshState === 'pulling'">↓</text><text v-else-if="refreshing" class="spin">◌</text><text v-else>✓</text></view></view>
			<view class="refresh-copy"><text class="refresh-title">{{ refreshText }}</text><text class="refresh-subtitle">{{ refreshSubtext }}</text></view>
		</view>
	</view>
</template>

<script>
export default {
	props: {
		loading: Boolean,
		hasMore: { type: Boolean, default: true },
		showFooter: Boolean,
		refreshName: { type: String, default: '订单' },
		top: { type: String, default: '514rpx' },
		bottom: { type: String, default: '110rpx' }
	},
	data() { return { refreshing: false, refreshState: 'idle', pullRatio: 0, doneTimer: null } },
	computed: {
		shellStyle() { return { top: this.top, bottom: this.bottom } },
		showRefresh() { return this.refreshState !== 'idle' },
		refreshText() { return this.refreshState === 'refreshing' ? `正在刷新${this.refreshName}` : this.refreshState === 'done' ? '加载完成' : '下拉刷新' },
		refreshSubtext() { return this.refreshState === 'refreshing' ? `为你同步最新${this.refreshName}` : this.refreshState === 'done' ? `${this.refreshName}信息已更新` : '松开即可刷新' }
	},
	beforeDestroy() { if (this.doneTimer) clearTimeout(this.doneTimer) },
	methods: {
		pulling(event) {
			if (this.refreshing) return
			const distance = Number(event.detail && event.detail.dy || 0)
			// 小程序初始化时会派发一次 dy=0；这不是用户下拉，不能让刷新层占位。
			if (distance <= 0) { this.pullRatio = 0; this.refreshState = 'idle'; return }
			this.pullRatio = Math.min(1, distance / 90)
			this.refreshState = 'pulling'
		},
		restore() { if (!this.refreshing && this.refreshState !== 'done') { this.pullRatio = 0; this.refreshState = 'idle' } },
		async refresh() {
			if (this.refreshing) return
			this.refreshing = true; this.refreshState = 'refreshing'
			try { this.$emit('refresh'); await this.$nextTick(); while (this.loading) await new Promise(resolve => setTimeout(resolve, 80)) }
			finally { this.refreshing = false; this.pullRatio = 0; this.refreshState = 'idle' }
		},
		loadMore() { if (!this.refreshing && !this.loading && this.hasMore) this.$emit('loadmore') }
	}
}
</script>

<style scoped>
.loader{position:absolute;top:544rpx;bottom:110rpx;width:100%;height:auto;overflow:hidden;background:#f8f8f8}.refresh-layer{position:absolute;z-index:2;top:0;right:0;left:0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;height:0;overflow:hidden;pointer-events:none;opacity:0;transform:translateY(-18rpx) scale(.92);transition:height .28s cubic-bezier(.2,.8,.2,1),opacity .2s ease,transform .28s cubic-bezier(.2,.8,.2,1)}.refresh-layer.visible{height:132rpx;opacity:1;transform:translateY(0) scale(1)}.refresh-orbit{display:flex;align-items:center;justify-content:center;width:62rpx;height:62rpx;margin-right:14rpx;border-radius:50%;background:linear-gradient(135deg,#fff7ee,#ffe2c7);box-shadow:0 10rpx 20rpx rgba(255,107,26,.16)}.refresh-core{display:flex;align-items:center;justify-content:center;width:44rpx;height:44rpx;color:#ff6b1a;font-size:32rpx;font-weight:600;background:#fff;border-radius:50%;box-shadow:inset 0 0 0 2rpx rgba(255,122,44,.1)}.refreshing .refresh-orbit{animation:pulse 1.1s ease-in-out infinite}.done .refresh-orbit{background:linear-gradient(135deg,#dff8e8,#bff0d0)}.done .refresh-core{color:#fff;background:#50b96c}.refresh-copy{display:flex;flex-direction:column}.refresh-title{color:#5d4a3f;font-size:25rpx;font-weight:500;line-height:34rpx}.refresh-subtitle{margin-top:3rpx;color:#b7aaa1;font-size:20rpx}.spin{display:block;font-size:36rpx;line-height:44rpx;animation:rotate .7s linear infinite}.load-indicator{display:flex;align-items:center;justify-content:center;gap:10rpx;box-sizing:border-box;min-height:88rpx;padding:28rpx 48rpx calc(36rpx + env(safe-area-inset-bottom));color:#b8a99c;font-size:22rpx}.load-spinner{display:inline-block;color:#ff6b1a;font-size:30rpx;animation:rotate .8s linear infinite}.load-end{display:flex;align-items:center;justify-content:center;gap:20rpx;width:100%;max-width:420rpx}.load-end-line{flex:1;height:2rpx;background:linear-gradient(90deg,transparent,#e5d8cc)}.load-end-line:last-child{background:linear-gradient(90deg,#e5d8cc,transparent)}.load-end-text{flex:none;color:#b8a99c;font-size:22rpx;letter-spacing:2rpx}@keyframes rotate{to{transform:rotate(360deg)}}@keyframes pulse{50%{transform:scale(1.08);box-shadow:0 12rpx 28rpx rgba(255,107,26,.28)}}
	/* 外层负责尺寸，刷新提示与滚动内容彻底分层，提示不会再撑开列表。 */
	.loader-shell{position:absolute;width:100%;height:auto;overflow:hidden;background:#f8f8f8}
	.loader-shell .loader{position:static;width:100%;height:100%;overflow:hidden;background:#f8f8f8}
	/* 完成提示独立悬浮，不参与列表排版，也不会盖住第一行内容。 */
	.refresh-layer.done{position:fixed;top:50%;right:auto;left:50%;width:270rpx;height:88rpx;padding:0 20rpx;background:rgba(255,255,255,.96);border-radius:44rpx;box-shadow:0 12rpx 34rpx rgba(0,0,0,.14);transform:translate(-50%,-50%)!important}
	.done .refresh-orbit{width:48rpx;height:48rpx;margin-right:10rpx;box-shadow:none}.done .refresh-core{width:36rpx;height:36rpx;font-size:26rpx}.done .refresh-subtitle{display:none}.done .refresh-title{font-size:26rpx;line-height:36rpx}
</style>
