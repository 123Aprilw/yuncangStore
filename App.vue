<script>
	import { ensureWxOpenid } from '@/api/index'

	export default {
		onLaunch: function() {
			// 已登录时静默刷新 openid，避免换机/清缓存后无法微信支付
			ensureWxOpenid()
		},
		onShow: function() {},
		onHide: function() {}
	}
</script>

<style>
	/*每个页面公共css */
	/* H5 预览默认 body margin 会让页面四周出现空白。 */
	html,
	body,
	#app {
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
	}

	/* H5 设备预览不显示浏览器滚动条，保留触摸滚动。 */
	::-webkit-scrollbar {
		display: none;
		width: 0;
		height: 0;
	}

	/* #ifdef MP-WEIXIN */
	/* 仅隐藏假状态栏占位；业务文案 .status 不要全局隐藏。 */
	.status-space {
		display: none !important;
		height: 0 !important;
		min-height: 0 !important;
		margin: 0 !important;
		padding: 0 !important;
		overflow: hidden !important;
		pointer-events: none !important;
	}

	/* #endif */

	/* Ensure mini-program button text is centred despite platform default padding. */
	.submit {
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
		padding: 0 !important;
		text-align: center !important;
	}

	/* Keep the binding instruction icon at its intended fixed size in flex rows. */
	.tip > image {
		flex: none !important;
		flex-shrink: 0 !important;
	}
</style>
