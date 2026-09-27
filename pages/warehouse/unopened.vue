<template>
	<view class="unopened-page">
		<image class="header-bg" src="/static/common/header-bg.png" mode="aspectFill" />
		<page-nav class="page-nav-abs" title="仓库管理" back-icon="/static/warehouse-unopened/back.svg" transparent :auto-back="false" fallback="/pages/workbench/no-warehouse" @back="goBack" />

		<view class="illustration">
			<image class="glow" src="/static/warehouse-unopened/glow.svg" mode="aspectFit" />
			<image class="warehouse-image" src="/static/warehouse-unopened/warehouse.png" mode="aspectFill" />
		</view>

		<text class="empty-title">仓库尚未开通</text>
		<text class="empty-description">尚未开通专属仓库，无法查看库存。</text>

		<view class="guide-card">
			<image src="/static/warehouse-unopened/tip.svg" mode="aspectFit" />
			<view><text class="guide-title">开通方式：</text><text class="guide-content">采购时选择“入我的仓库”，提交后自动开通。</text></view>
		</view>

		<button class="purchase-button" @tap="purchase">去采购</button>
		<text class="later" @tap="goBack">稍后再说</text>
	</view>
</template>

<script>
	import PageNav from '@/components/page-nav/page-nav.vue'
	import { navigateBack } from '@/utils/nav'
	export default {
		components: { PageNav },
		methods: {
			goBack() { navigateBack('/pages/workbench/no-warehouse') },
			purchase() { uni.navigateTo({ url: '/pages/product/index' }) }
		}
	}
</script>

<style scoped>
	.unopened-page { position: relative; box-sizing: border-box; width: 100%; min-height: 1624rpx; overflow: hidden; color: #1a1c1c; background: linear-gradient(180deg,#fffaf2 1.014%,#f9f9f9 18.132%); font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.header-bg { position: absolute; top: 0; left: 0; width: 750rpx; height: 418rpx; opacity: .13; transform: scaleY(-1); }
	.page-nav-abs { position: absolute; top: 0; left: 0; z-index: 10; width: 100%; }
	.illustration { position: absolute; top: 162rpx; left: 0; width: 100%; height: 382rpx; }
	.glow { position: absolute; top: 104rpx; left: 50%; width: 398rpx; height: 338rpx; transform: translateX(-50%); }
	.warehouse-image { position: absolute; top: 0; left: 50%; width: 494rpx; height: 494rpx; opacity: .4; transform: translateX(-50%); }
	.empty-title { position: absolute; top: 574rpx; left: 0; width: 100%; color: #000; font-size: 40rpx; font-weight: 500; line-height: 56rpx; text-align: center; }
	.empty-description { position: absolute; top: 656rpx; left: 67rpx; width: 616rpx; color: #414755; font-size: 28rpx; line-height: 44rpx; text-align: center; }
	.guide-card { position: absolute; top: 730rpx; left: 30rpx; display: flex; align-items: flex-start; box-sizing: border-box; width: 690rpx; min-height: 182rpx; padding: 32rpx; background: rgba(255,255,255,.85); border: 2rpx solid rgba(255,255,255,.3); border-radius: 24rpx; box-shadow: 0 8rpx 60rpx rgba(0,0,0,.05); backdrop-filter: blur(12rpx); }
	.guide-card > image { flex: 0 0 auto; width: 30rpx; height: 48rpx; margin-right: 16rpx; }
	.guide-card > view { display: flex; flex: 1; flex-direction: column; }
	.guide-title { color: #1a1c1c; font-size: 24rpx; line-height: 32rpx; }
	.guide-content { margin-top: 8rpx; color: #414755; font-size: 28rpx; line-height: 39rpx; }
	.purchase-button { position: absolute; top: 1012rpx; left: 30rpx; display: flex; align-items: center; justify-content: center; width: 690rpx; height: 96rpx; margin: 0; padding: 0; color: #fff; font-size: 32rpx; font-weight: 500; line-height: 48rpx; background: linear-gradient(90deg,#fb3b19,#f97316); border: 0; border-radius: 200rpx; }
	.purchase-button::after { border: 0; }
	.purchase-button:active { opacity: .9; }
	.later { position: absolute; top: 1160rpx; left: 0; width: 100%; color: rgba(0,0,0,.45); font-size: 28rpx; line-height: 48rpx; text-align: center; }
</style>
