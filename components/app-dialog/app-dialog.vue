<template>
	<view class="app-dialog">
		<view v-if="toastVisible" class="dialog-mask" @tap="dismissToast">
			<view class="dialog-card toast-dialog" @tap.stop>
				<text class="dialog-title">{{ toastType === 'success' ? '操作成功' : '提示' }}</text>
				<text class="dialog-content">{{ toastMessage }}</text>
				<view class="dialog-actions">
					<button class="dialog-button dialog-button--primary" @tap="dismissToast">我知道了</button>
				</view>
			</view>
		</view>
		<view v-if="loadingVisible" class="loading-mask">
			<view class="loading-card"><view class="spinner"/><text>{{ loadingMessage }}</text></view>
		</view>
		<view v-if="confirmVisible" class="dialog-mask">
			<view class="dialog-card" @tap.stop>
				<text class="dialog-title">{{ confirmOptions.title || '提示' }}</text>
				<text class="dialog-content">{{ confirmOptions.content || '' }}</text>
				<view class="dialog-actions">
					<button
						v-if="confirmOptions.showCancel !== false"
						class="dialog-button dialog-button--secondary"
						@tap="closeConfirm(false)"
					>{{ confirmOptions.cancelText || '取消' }}</button>
					<button class="dialog-button dialog-button--primary" @tap="closeConfirm(true)">{{ confirmOptions.confirmText || '确定' }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { setDialogHost, clearDialogHost, setConfirmBlocking } from '@/utils/app-dialog'

export default {
	data() {
		return {
			toastVisible: false,
			toastMessage: '',
			toastType: 'error',
			toastTimer: null,
			toastResolve: null,
			loadingVisible: false,
			loadingMessage: '加载中',
			confirmVisible: false,
			confirmOptions: {},
			confirmResolve: null
		}
	},
	mounted() {
		setDialogHost(this)
	},
	activated() {
		setDialogHost(this)
	},
	beforeDestroy() {
		this.teardown()
	},
	destroyed() {
		this.teardown()
	},
	methods: {
		teardown() {
			clearTimeout(this.toastTimer)
			if (this.toastResolve) {
				const resolve = this.toastResolve
				this.toastResolve = null
				resolve()
			}
			if (this.confirmVisible) {
				this.confirmVisible = false
				setConfirmBlocking(false)
				const resolve = this.confirmResolve
				this.confirmResolve = null
				if (resolve) resolve(false)
			}
			clearDialogHost(this)
		},
		showToast(message, type, duration, resolve) {
			if (!message) {
				if (resolve) resolve()
				return
			}
			if (this.toastResolve) {
				const prev = this.toastResolve
				this.toastResolve = null
				prev()
			}
			this.toastMessage = String(message)
			this.toastType = type === 'success' ? 'success' : 'error'
			this.toastVisible = true
			this.toastResolve = typeof resolve === 'function' ? resolve : null
			clearTimeout(this.toastTimer)
			this.toastTimer = setTimeout(() => this.dismissToast(), duration)
		},
		dismissToast() {
			if (!this.toastVisible && !this.toastResolve) return
			this.toastVisible = false
			clearTimeout(this.toastTimer)
			this.toastTimer = null
			const resolve = this.toastResolve
			this.toastResolve = null
			if (resolve) resolve()
		},
		showLoading(message) {
			this.loadingMessage = message || '加载中'
			this.loadingVisible = true
		},
		hideLoading() {
			this.loadingVisible = false
		},
		showConfirm(options, resolve) {
			this.confirmOptions = options || {}
			this.confirmResolve = resolve
			this.confirmVisible = true
			setConfirmBlocking(true)
		},
		closeConfirm(result) {
			if (!this.confirmVisible) return
			this.confirmVisible = false
			setConfirmBlocking(false)
			const resolve = this.confirmResolve
			this.confirmResolve = null
			if (resolve) resolve(result)
		}
	}
}
</script>

<style scoped>
.app-dialog{position:relative;z-index:9999}
.loading-mask,.dialog-mask{position:fixed;z-index:9999;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.42)}
.loading-card{display:flex;flex-direction:column;align-items:center;gap:20rpx;box-sizing:border-box;width:250rpx;padding:36rpx 32rpx;color:#6b7280;font-size:26rpx;background:#fff;border-radius:28rpx;box-shadow:0 24rpx 64rpx rgba(0,0,0,.2)}
.spinner{width:44rpx;height:44rpx;border:5rpx solid rgba(249,115,22,.2);border-top-color:#f97316;border-radius:50%;animation:app-dialog-spin .75s linear infinite}
.dialog-card{box-sizing:border-box;width:610rpx;padding:42rpx 36rpx 30rpx;background:#fff;border-radius:28rpx;box-shadow:0 24rpx 64rpx rgba(0,0,0,.2)}
.dialog-title{display:block;color:#1f2937;font-size:34rpx;font-weight:600;line-height:48rpx;text-align:center}
.dialog-content{display:block;min-height:64rpx;margin-top:24rpx;color:#6b7280;font-size:28rpx;line-height:42rpx;text-align:center;word-break:break-all}
.dialog-actions{display:flex;gap:20rpx;margin-top:34rpx}
.dialog-button{flex:1;height:80rpx;margin:0;font-size:28rpx;line-height:80rpx;border-radius:40rpx}
.dialog-button::after{border:0}
.dialog-button--secondary{color:#6b7280;background:#f5f5f5}
.dialog-button--primary{color:#fff;background:linear-gradient(90deg,#ff8a37,#fa3b19)}
@keyframes app-dialog-spin{to{transform:rotate(360deg)}}
</style>
