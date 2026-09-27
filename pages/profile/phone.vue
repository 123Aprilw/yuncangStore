<template>
	<view class="page">
		<common-header title="修改手机号" fallback="/pages/profile/edit" />
		<view class="form">
			<b>更换手机号</b>
			<view class="current">
				<text>当前手机号：</text>
				<strong>{{ maskedMobile }}</strong>
			</view>
			<label>新手机号</label>
			<input
				v-model="phone"
				class="phone-input"
				:class="{ 'input-error': phoneError }"
				type="number"
				maxlength="11"
				placeholder="请输入新手机号"
				@input="onPhoneInput"
				@blur="validatePhone"
			/>
			<text v-if="phoneError" class="field-error">{{ phoneError }}</text>
			<label>验证码</label>
			<view class="code">
				<input v-model="code" type="number" maxlength="6" placeholder="请输入验证码" />
				<button
					:disabled="!!phoneError || countDown > 0 || sending"
					:class="{ disabled: !!phoneError || countDown > 0 || sending }"
					@tap="getCode"
				>{{ countDown ? countDown + 's' : (sending ? '发送中' : '获取验证码') }}</button>
			</view>
			<button class="submit" :disabled="submitting" :class="{ disabled: submitting }" @tap="submit">确认更换</button>
		</view>
	</view>
</template>

<script>
import CommonHeader from './header.vue'
import { profileApi, sendSms } from '@/api/index'
import { navigateBack } from '@/utils/nav'

export default {
	components: { CommonHeader },
	data() {
		return {
			phone: '',
			code: '',
			mobile: '',
			phoneError: '',
			countDown: 0,
			sending: false,
			submitting: false,
			_timer: null
		}
	},
	computed: {
		maskedMobile() {
			return this.mobile
				? String(this.mobile).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
				: '未绑定'
		}
	},
	onLoad() {
		this.loadProfile()
	},
	onUnload() {
		if (this._timer) clearInterval(this._timer)
	},
	methods: {
		async loadProfile() {
			try {
				const profile = await profileApi.index()
				this.mobile = profile.mobile || ''
			} catch (e) {
				uni.showToast({ title: '当前手机号加载失败', icon: 'none' })
			}
		},
		onPhoneInput(e) {
			this.phone = String((e && e.detail && e.detail.value) || this.phone || '')
				.replace(/\D/g, '')
				.slice(0, 11)
			if (this.phoneError) this.validatePhone()
		},
		validatePhone() {
			const mobile = String(this.phone || '').trim()
			if (!mobile) {
				this.phoneError = '请输入新手机号'
				return false
			}
			if (!/^1[3-9]\d{9}$/.test(mobile)) {
				this.phoneError = '请输入正确的 11 位手机号'
				return false
			}
			if (this.mobile && mobile === String(this.mobile)) {
				this.phoneError = '新手机号不能与当前相同'
				return false
			}
			this.phoneError = ''
			return true
		},
		startCountDown() {
			this.countDown = 60
			if (this._timer) clearInterval(this._timer)
			this._timer = setInterval(() => {
				if (--this.countDown <= 0) {
					clearInterval(this._timer)
					this._timer = null
				}
			}, 1000)
		},
		async getCode() {
			if (this.countDown > 0 || this.sending) return
			if (!this.validatePhone()) return
			this.sending = true
			try {
				await sendSms(this.phone, 'changemobile')
				uni.showToast({ title: '验证码已发送', icon: 'none' })
				this.startCountDown()
			} catch (e) {
				// request.js 已 toast
			} finally {
				this.sending = false
			}
		},
		async submit() {
			if (this.submitting) return
			if (!this.validatePhone()) return
			if (!/^\d{6}$/.test(String(this.code || ''))) {
				uni.showToast({ title: '请输入6位验证码', icon: 'none' })
				return
			}
			this.submitting = true
			try {
				await profileApi.changeMobile(this.phone, this.code)
				uni.showToast({ title: '修改成功', icon: 'success' })
				this.mobile = this.phone
				this.phone = ''
				this.code = ''
				this.phoneError = ''
				setTimeout(() => navigateBack('/pages/profile/edit'), 500)
			} catch (e) {
				// request.js 已 toast
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style scoped>
.page {
	height: 100vh;
	background: #f9f9f9;
	font-family: "PingFang SC", sans-serif;
}
.form {
	box-sizing: border-box;
	width: 690rpx;
	min-height: 756rpx;
	margin: 20rpx 30rpx;
	padding: 30rpx;
	background: #fff;
	border-radius: 20rpx;
}
.form > b {
	font-size: 32rpx;
}
.current {
	display: flex;
	align-items: center;
	height: 106rpx;
	margin-top: 24rpx;
	padding: 0 24rpx;
	background: #f9f9f9;
	border-radius: 14rpx;
}
.current text {
	color: #999;
	font-size: 28rpx;
}
.form label {
	display: block;
	margin: 28rpx 8rpx 14rpx;
	font-size: 30rpx;
}
.form > input,
.phone-input,
.code input {
	box-sizing: border-box;
	height: 104rpx;
	padding: 0 36rpx;
	font-size: 30rpx;
	border: 2rpx solid #777;
	border-radius: 14rpx;
}
.form > input,
.phone-input {
	width: 630rpx;
}
.phone-input.input-error {
	border-color: #ff3e20;
}
.field-error {
	display: block;
	margin: 10rpx 8rpx 0;
	color: #ff3e20;
	font-size: 24rpx;
}
.code {
	display: flex;
	gap: 16rpx;
}
.code input {
	width: 400rpx;
}
.code button {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 214rpx;
	height: 104rpx;
	margin: 0;
	padding: 0;
	color: #fff;
	font-size: 28rpx;
	line-height: 1;
	background: linear-gradient(90deg, #ff3e20, #ff7415);
	border: 0;
	border-radius: 14rpx;
}
.code button.disabled,
.submit.disabled {
	opacity: 0.55;
}
.submit {
	width: 630rpx;
	height: 96rpx;
	margin: 36rpx 0 0;
	color: #fff;
	font-size: 32rpx;
	background: linear-gradient(90deg, #ff3e20, #ff7415);
	border: 0;
	border-radius: 100rpx;
}
.code button:after,
.submit:after {
	border: 0;
}
</style>
