<template>
	<view class="bottom-tabbar">
		<view
			v-for="item in items"
			:key="item.label"
			class="tab"
			:class="{ active: !!item.active }"
			hover-class="tab--pressed"
			:hover-stay-time="80"
			@tap.stop="onTap(item)"
		>
			<image class="tab-icon" :src="item.icon" mode="aspectFit" />
			<text class="tab-label">{{ item.label }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'BottomTabbar',
		props: {
			items: {
				type: Array,
				default: () => []
			}
		},
		methods: {
			onTap(item) {
				if (!item || item.active) return
				const url = item.route || item.url
				if (!url) return
				uni.redirectTo({ url })
			}
		}
	}
</script>

<style scoped>
	.bottom-tabbar {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 1000;
		display: flex;
		box-sizing: border-box;
		width: auto;
		height: calc(110rpx + constant(safe-area-inset-bottom));
		height: calc(110rpx + env(safe-area-inset-bottom));
		padding: 6rpx 0 constant(safe-area-inset-bottom);
		padding: 6rpx 0 env(safe-area-inset-bottom);
		background: #fff;
		border-top: 1rpx solid #eee;
		pointer-events: auto;
	}

	.tab {
		position: relative;
		z-index: 1;
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		height: 100%;
		min-width: 0;
		padding: 0;
		color: #676767;
		font-size: 22rpx;
		line-height: 1.2;
		pointer-events: auto;
	}

	.tab--pressed {
		opacity: 0.72;
	}

	.tab-icon {
		width: 44rpx;
		height: 44rpx;
		margin-bottom: 4rpx;
		pointer-events: none;
	}

	.tab-label {
		pointer-events: none;
	}

	.tab.active {
		color: #f97316;
	}
</style>
