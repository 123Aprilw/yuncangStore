<template>
	<view class="login-page">
		<view class="login-shell">
			<image class="brand" src="/static/figma-login/brand.png" mode="aspectFit" />

			<text class="welcome">欢迎使用循禾熙云仓商城系统</text>

			<view class="form">
				<view class="field">
					<input
						v-model="phone"
						@input="onPhoneInput"
						@blur="validatePhone"
						class="field-input"
						type="number"
						maxlength="11"
						placeholder="请输入手机号"
						placeholder-class="field-placeholder"
					/>
				</view>
				<text v-if="phoneError" class="field-error">{{ phoneError }}</text>

				<view class="field code-field">
					<input
						v-model="code"
						class="field-input"
						type="number"
						maxlength="6"
						placeholder="请输入验证码"
						placeholder-class="field-placeholder"
					/>
					<text
						class="code-button"
						:class="{ 'code-button--disabled': countdown > 0 }"
						@tap="getVerificationCode"
					>{{ codeButtonText }}</text>
				</view>

				<button class="login-button" @tap="login">登录</button>
			</view>

			<view class="agreement" @tap="agreed = !agreed">
				<view class="agreement-check" :class="{ checked: agreed }"><text v-if="agreed">✓</text></view>
				<text>登录前请先阅读 </text>
				<text class="agreement-link" @tap="openAgreement('user')">《经销协议》</text>
				<text> 和 </text>
				<text class="agreement-link" @tap="openAgreement('privacy')">《隐私政策》</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { sendSms, mobileLogin, workbenchApi, ensureWxOpenid } from '@/api/index'
	import { setToken } from '@/utils/request'

	export default {
		onLoad() {
			this.restoreSession()
		},
		data() {
			return {
				phone: '',
				phoneError: '',
				code: '',
				agreed: false,
				countdown: 0,
				timer: null
			}
		},
		computed: {
			codeButtonText() {
				return this.countdown > 0 ? `${this.countdown}s后重试` : '获取验证码'
			}
		},
		onUnload() {
			if (this.timer) clearInterval(this.timer)
		},
		methods: {
			async restoreSession() {
				const token = uni.getStorageSync('token') || ''
				if (!token) return
				try {
					await ensureWxOpenid()
					const dashboard = await workbenchApi.index()
					this.goWorkbench(dashboard)
				} catch (e) {
					setToken('')
				}
			},
			goWorkbench(dashboard = {}) {
				uni.reLaunch({ url: dashboard.has_warehouse ? '/pages/workbench/warehouse-opened' : '/pages/workbench/no-warehouse' })
			},
			onPhoneInput(e) {
				this.phone = String(e.detail.value || '').replace(/\D/g, '').slice(0, 11)
				if (this.phoneError) this.validatePhone()
			},
			validatePhone() {
				if (!this.phone) {
					this.phoneError = '请输入手机号'
					return false
				}
				if (!/^1[3-9]\d{9}$/.test(this.phone)) {
					this.phoneError = '请输入正确的 11 位手机号'
					return false
				}
				this.phoneError = ''
				return true
			},
			async getVerificationCode() {
				if (this.countdown > 0) return
				if (!this.validatePhone()) return
				if (!/^1\d{10}$/.test(this.phone)) {
					uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
					return
				}
				try {
					await sendSms(this.phone, 'mobilelogin')
					uni.showToast({ title: '验证码已发送', icon: 'none' })
					this.countdown = 60
					this.timer = setInterval(() => {
						this.countdown -= 1
						if (this.countdown <= 0) {
							clearInterval(this.timer)
						this.timer = null
					}
				}, 1000)
				} catch (e) {
					// request.js 已 toast 服务端文案（含未注册/未绑定）
				}
			},
			async login() {
				if (!this.agreed) {
					uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
					return
				}
				if (!this.validatePhone()) return
				if (!/^1\d{10}$/.test(this.phone) || !/^\d{6}$/.test(this.code)) {
					uni.showToast({ title: '请填写手机号和验证码', icon: 'none' })
					return
				}
				try {
					await mobileLogin(this.phone, this.code)
					// 静默 wx.login → 绑定 openid，供 JSAPI 支付使用
					await ensureWxOpenid()
					const dashboard = await workbenchApi.index()
					this.goWorkbench(dashboard)
				} catch (e) {}
			},
			openAgreement(type) {
				uni.navigateTo({ url: '/pages/profile/agreement-detail?type=' + type })
			}
		}
	}
</script>

<style>
	page {
		min-height: 100%;
		background: #ffffff;
	}

	.login-page {
		width: 100%;
		min-height: 100vh;
		background: linear-gradient(180deg, #ffeed2 0%, #ffffff 36.145%);
		font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
	}

	.login-shell {
		position: relative;
		width: 100%;
		max-width: 750rpx;
		height: 100vh;
		min-height: 1334rpx;
		margin: 0 auto;
		overflow: hidden;
	}

	.brand {
		position: absolute;
		top: 262rpx;
		left: 50%;
		width: 402rpx;
		height: 152rpx;
		transform: translateX(-50%);
	}

	.welcome {
		position: absolute;
		top: 490rpx;
		left: 0;
		width: 100%;
		font-size: 40rpx;
		font-weight: 500;
		line-height: 40rpx;
		color: #000000;
		text-align: center;
	}

	.form {
		position: absolute;
		top: 612rpx;
		left: 30rpx;
		width: calc(100% - 60rpx);
	}

	.field {
		display: flex;
		align-items: center;
		box-sizing: border-box;
		width: 100%;
		height: 112rpx;
		padding: 0 24rpx;
		background: #f9f9f9;
		border-radius: 16rpx;
	}

	.code-field {
		margin-top: 56rpx;
	}

	.field-input {
		flex: 1;
		height: 112rpx;
		min-width: 0;
		font-size: 28rpx;
		line-height: 112rpx;
		color: rgba(0, 0, 0, 0.88);
	}

	.field-placeholder {
		font-size: 28rpx;
		color: rgba(0, 0, 0, 0.35);
	}

	.field-error {
		display: block;
		margin: 12rpx 0 -32rpx 24rpx;
		font-size: 24rpx;
		line-height: 32rpx;
		color: #e43d30;
	}

	.code-button,
	.agreement-link {
		color: #fb4f18;
		background-image: linear-gradient(90deg, #fb3b19, #f97316);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.code-button {
		flex-shrink: 0;
		width: 176rpx;
		margin-left: 24rpx;
		font-size: 32rpx;
		line-height: 48rpx;
		text-align: right;
		white-space: nowrap;
	}

	.code-button--disabled {
		color: rgba(0, 0, 0, 0.35);
		background-image: none;
		-webkit-text-fill-color: rgba(0, 0, 0, 0.35);
		pointer-events: none;
	}

	.login-button {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 100%;
		height: 104rpx;
		margin-top: 52rpx;
		padding: 0;
		font-size: 32rpx;
		font-weight: 500;
		line-height: 48rpx;
		color: rgba(255, 255, 255, 0.93);
		background: linear-gradient(90deg, #fb3b19, #f97316);
		border: 0;
		border-radius: 200rpx;
		box-shadow: 0 20rpx 60rpx -20rpx rgba(0, 0, 0, 0.04);
	}

	.login-button::after {
		border: 0;
	}

	.login-button:active {
		opacity: 0.9;
	}

	.agreement {
		position: absolute;
		top: 1544rpx;
		left: 0;
		width: 100%;
		font-size: 24rpx;
		line-height: 32rpx;
		letter-spacing: 0.24rpx;
		color: #5b403e;
		text-align: center;
		white-space: nowrap;
	}

	.agreement-check {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 30rpx;
		height: 30rpx;
		line-height: 26rpx;
		font-size: 20rpx;
		margin-right: 10rpx;
		vertical-align: middle;
		border: 2rpx solid #b8aaa6;
		border-radius: 50%;
	}

	.agreement-check text {
		display: block;
		line-height: 26rpx;
		transform: translateY(-2rpx);
	}

	.agreement-check.checked {
		color: #fff;
		background: #fb4f18;
		border-color: #fb4f18;
	}

	@media screen and (max-height: 760px) {
		.agreement {
			top: auto;
			bottom: calc(52rpx + env(safe-area-inset-bottom));
		}
	}
</style>
