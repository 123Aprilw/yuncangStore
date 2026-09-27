<template>
 <view class="page">
 <page-nav title="消费者绑定" />
 <scroll-view class="body" scroll-y>
  <view class="form">
   <view class="label"><text>手机号</text><text>*</text></view>
   <input v-model="phone" class="phone-input" :class="{'input-error': phoneError}" type="number" maxlength="11" placeholder="请输入消费者手机号" @input="onPhoneInput" @blur="checkPhoneBound"/>
   <text v-if="phoneError" class="field-error">{{phoneError}}</text>
   <view class="label second"><text>验证码</text><text>*</text></view>
   <view class="code"><input v-model="code" maxlength="6" type="number" placeholder="请输入验证码"/><button :disabled="!!phoneError||countDown>0||sending" :class="{disabled:!!phoneError||countDown>0||sending}" @tap="getCode">{{countDown?countDown+'s':(sending?'发送中':'获取验证码')}}</button></view>
   <button class="submit" :disabled="submitting" :class="{disabled:submitting}" @tap="bind">确认绑定</button>
  </view>
  <view class="separator"><view/><text>已绑定的消费者</text><view/></view>
  <view v-for="u in users" :key="u.id" class="user"><view class="person"><view class="avatar"><image :src="u.avatar || '/static/distribution/figma-consumer.svg'" mode="aspectFill"/></view><view><text class="name">{{u.name||'消费者'}}</text><text class="mobile">{{maskMobile(u.mobile)}}</text></view><text class="unbind" @tap="unbind(u)">解绑</text></view><view class="line"/><text>{{formatDate(u.createtime)}}</text></view>
  <view v-if="!users.length" class="empty">暂无已绑定消费者</view>
 </scroll-view>
 </view>
</template>
<script>
import {distributionApi, sendSms, post} from '../../api'
import PageNav from '@/components/page-nav/page-nav.vue'
import {toast, confirm, dismissAllToasts} from '../../utils/app-dialog'

const BOUND_MSG = '该手机号已被绑定'
const SELF_MSG = '不能绑定自己'
const BIND_BLOCK_RE = /已被绑定|不能绑定自己|已有.*推荐人|无法绑定|不可绑定|团队成员|二星|三星|四星/
const BIND_ROUTE = 'pages/distribution/binding'

export default {
	components: { PageNav },
	data() {
		return {phone: '', code: '', countDown: 0, phoneError: '', users: [], sending: false, submitting: false, _timer: null, _checking: false, _pageActive: false}
	},
	onShow() { this._pageActive = true; this.ensureBindEnabled(); this.load() },
	onHide() { this._pageActive = false; dismissAllToasts() },
	onUnload() {
		this._pageActive = false
		dismissAllToasts()
		if (this._timer) clearInterval(this._timer)
	},
	methods: {
		/** 仅在本页前台时反馈，避免返回分销中心后提示落到上一页 */
		isBindPage() {
			if (!this._pageActive) return false
			try {
				const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
				const cur = pages.length ? pages[pages.length - 1] : null
				const route = String((cur && (cur.route || cur.$page && cur.$page.fullPath)) || '')
				return route.indexOf(BIND_ROUTE) >= 0
			} catch (e) {
				return false
			}
		},
		pageToast(message, type) {
			if (!this.isBindPage()) return Promise.resolve()
			return toast(message, type)
		},
		showBindBlock(msg) {
			const text = String(msg || '暂时无法绑定该用户')
			this.phoneError = text
			if (!this.isBindPage()) return Promise.resolve()
			return confirm({title: '无法绑定', content: text, showCancel: false, confirmText: '我知道了'})
		},
		async ensureBindEnabled() {
			try {
				const data = await distributionApi.index()
				if (!this.isBindPage()) return
				const enabled = data && (Number(data.level) > 1 || Number(data.bind_enabled))
				if (!enabled) {
					await this.pageToast('当前等级暂不可绑定消费者')
					if (this.isBindPage()) setTimeout(() => uni.navigateBack(), 500)
				}
			} catch (e) {}
		},
		async load() {
			try {
				const data = await distributionApi.binds()
				if (!this.isBindPage()) return
				this.users = (data && data.list) || []
			} catch (e) {}
		},
		onPhoneInput(e) {
			this.phone = String((e && e.detail && e.detail.value) || this.phone || '').replace(/\D/g, '').slice(0, 11)
			this.phoneError = ''
			if (this.phone.length === 11) this.checkPhoneBound()
		},
		async checkPhoneBound(opts) {
			const notify = !!(opts && opts.notify)
			const mobile = this.phone
			if (!mobile) {
				this.phoneError = ''
				return true
			}
			if (!/^1\d{10}$/.test(mobile)) {
				this.phoneError = '请输入正确手机号'
				return false
			}
			if (this._checking) return !this.phoneError
			this._checking = true
			try {
				const res = await distributionApi.checkBind(mobile)
				if (!this.isBindPage()) return false
				if (res && (Number(res.self) || Number(res.bound))) {
					const msg = (res.message && String(res.message)) || (Number(res.self) ? SELF_MSG : BOUND_MSG)
					this.phoneError = msg
					if (notify) await this.showBindBlock(msg)
					return false
				}
				this.phoneError = ''
				return true
			} catch (e) {
				return !this.phoneError
			} finally {
				this._checking = false
			}
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
			if (!/^1\d{10}$/.test(this.phone)) return this.pageToast('请输入正确手机号')
			const ok = await this.checkPhoneBound({notify: true})
			if (!ok || this.phoneError) return
			this.sending = true
			try {
				await sendSms(this.phone, 'bindconsumer', { silent: true })
				if (!this.isBindPage()) return
				await this.pageToast('验证码已发送', 'success')
				this.startCountDown()
			} catch (e) {
				if (!this.isBindPage()) return
				const msg = (e && e.msg) || '发送失败'
				if (BIND_BLOCK_RE.test(msg)) await this.showBindBlock(msg)
				else await this.pageToast(msg)
			} finally {
				this.sending = false
			}
		},
		async bind() {
			if (this.submitting) return
			if (!/^1\d{10}$/.test(this.phone)) return this.pageToast('请输入正确手机号')
			if (!/^\d{6}$/.test(String(this.code || ''))) return this.pageToast('请输入6位验证码')
			const ok = await this.checkPhoneBound({notify: true})
			if (!ok || this.phoneError) return
			this.submitting = true
			try {
				await post('/api/distribution/bind', {mobile: this.phone, captcha: this.code}, {loading: true, silent: true})
				if (!this.isBindPage()) return
				await this.pageToast('绑定成功', 'success')
				this.phone = ''
				this.code = ''
				this.phoneError = ''
				this.load()
			} catch (e) {
				if (!this.isBindPage()) return
				const msg = (e && e.msg) || '绑定失败'
				if (BIND_BLOCK_RE.test(msg)) await this.showBindBlock(msg)
				else await this.pageToast(msg)
			} finally {
				this.submitting = false
			}
		},
		unbind(u) {
			if (!this.isBindPage()) return
			confirm({title: '解除绑定', content: '确认解除该消费者绑定吗？'}).then(async (r) => {
				if (!r || !this.isBindPage()) return
				try {
					await distributionApi.unbind(u.id)
					if (!this.isBindPage()) return
					this.load()
					if (this.phone && this.phone === u.mobile) {
						this.phoneError = ''
						this.checkPhoneBound()
					}
				} catch (e) {
					if (this.isBindPage()) this.pageToast((e && e.msg) || '解绑失败')
				}
			})
		},
		maskMobile(v) {
			v = String(v || '')
			return /^1\d{10}$/.test(v) ? v.slice(0, 3) + '****' + v.slice(-4) : v
		},
		formatDate(v) {
			if (!v) return '暂无'
			const d = new Date(+v * 1000)
			return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
		}
	}
}
</script>
<style scoped>
.code button{display:flex;align-items:center;justify-content:center;font-size:28rpx;line-height:1}
.code button:after{border:0}
.code button.disabled,.submit.disabled{opacity:.45}
.page{display:flex;flex-direction:column;height:100vh;background:#f9f9f9}
.body{flex:1;height:0;width:100%}
.form,.user{box-sizing:border-box;width:690rpx;margin:20rpx 30rpx;padding:24rpx;background:#fff;border-radius:20rpx}
.label{display:flex;gap:10rpx;margin:0 8rpx 14rpx;font-size:30rpx}
.label text:last-child{color:red}
.second{margin-top:26rpx}
.form input{box-sizing:border-box;height:104rpx;padding:0 36rpx;border:2rpx solid #7a7485;border-radius:16rpx;font-size:30rpx}
.form>.phone-input,.form>input{width:630rpx}
.phone-input.input-error{border-color:#ba1a1a}
.field-error{display:block;margin:12rpx 8rpx 0;color:#ba1a1a;font-size:24rpx;line-height:36rpx}
.code{display:flex;gap:16rpx}
.code input{flex:1;min-width:0}
.code button{width:214rpx;height:104rpx;margin:0;padding:0;color:#fff;background:linear-gradient(90deg,#fb3b19,#f97316);border:0;border-radius:16rpx}
.submit{display:flex;align-items:center;justify-content:center;width:630rpx;height:96rpx;margin-top:34rpx;padding:0;color:#fff;background:linear-gradient(90deg,#fb3b19,#f97316);border:0;border-radius:100rpx}
.separator{display:flex;align-items:center;margin:22rpx 30rpx}
.separator view{flex:1;height:2rpx;background:#c1c6d7}
.separator text{margin:0 32rpx;color:#414755;font-size:24rpx}
.user{margin-top:0}
.person{display:flex;align-items:center}
.avatar{display:flex;align-items:center;justify-content:center;width:96rpx;height:96rpx;background:#006ef2;border-radius:24rpx}
.avatar image{display:block;width:96rpx;height:96rpx;border-radius:24rpx}
.person>view:nth-child(2){display:flex;flex:1;flex-direction:column;margin-left:24rpx}
.name{font-size:32rpx}
.mobile,.user>text{margin-top:8rpx;color:#414755;font-size:28rpx}
.unbind{margin-left:auto;color:#ba1a1a}
.line{height:2rpx;margin:30rpx 0;background:#e2e2e2}
.empty{text-align:center;color:#999;padding:80rpx}
</style>
