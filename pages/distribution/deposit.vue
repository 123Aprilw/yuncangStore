<template>
	<view class="page">
		<page-nav title="缴纳保证金" fallback="/pages/distribution/index" />
		<scroll-view scroll-y class="content">
			<view class="notice">
				<b>保证金说明</b>
				<text>升级 <strong>三星经销商</strong> 需缴纳保证金 <em>¥{{ depositAmountText }}</em></text>
				<text>后台确认「已缴」后，满足金额条件即可自动升级</text>
			</view>
			<view class="pay-info">
				<b>缴纳信息</b>
				<view class="line"/>
				<view><text>缴纳金额</text><strong>¥{{ depositAmountText }}</strong></view>
				<view><text>当前状态</text><text>{{ statusText }}</text></view>
				<view><text>缴纳方式</text><text>对公转账</text></view>
			</view>
			<view v-if="bank.company_name" class="pay-info">
				<b>收款账户</b>
				<view class="line"/>
				<view><text>企业全称</text><text>{{ bank.company_name }}</text></view>
				<view><text>银行账号</text><text>{{ bank.bank_account || '—' }}</text></view>
				<view><text>开户行</text><text>{{ bank.bank_name || '—' }}</text></view>
			</view>
			<view class="upload-card">
				<view class="upload-heading">
					<text class="upload-title">上传转账凭证</text>
					<text v-if="status !== 'paid'" class="required">必选</text>
				</view>
				<view v-if="status !== 'paid'" class="upload-tip">
					<image src="/static/delivery-confirm/notice-figma.svg" mode="aspectFit"/>
					<text>仅支持图片，不超过30M</text>
				</view>
				<view v-if="!voucherUrl" class="uploader" :class="{ error: voucherError }" @tap="uploadVoucher">
					<text>{{ voucherUploading ? '上传中…' : (status === 'paid' ? '暂无凭证' : '点击上传凭证') }}</text>
				</view>
				<view v-else class="voucher-list">
					<view class="voucher-thumb">
						<image class="voucher-image" :src="voucherUrl" mode="aspectFill" @tap="previewVoucher"/>
						<view v-if="status !== 'paid'" class="voucher-cover">
							<text @tap.stop="deleteVoucher">删除</text>
						</view>
					</view>
					<view v-if="status !== 'paid'" class="voucher-add" @tap="uploadVoucher">
						<text class="plus">+</text>
						<text>重传</text>
					</view>
				</view>
				<text v-if="voucherError && !voucherUrl" class="upload-error">请上传转账凭证</text>
			</view>
			<view style="height: 220rpx"></view>
		</scroll-view>
		<view class="footer">
			<button :disabled="submitting || status === 'paid'" @tap="submit">{{ status === 'paid' ? '已缴纳' : (status === 'pending' ? '重新提交审核' : '提交凭证') }}</button>
		</view>
	</view>
</template>

<script>
import { distributionApi, profileApi } from '../../api'
import PageNav from '@/components/page-nav/page-nav.vue'
import { getBaseUrl, getUploadUrl, getCurrentRoute, isActiveRoute } from '../../utils/request'
import { navigateBack } from '@/utils/nav'

export default {
	components: { PageNav },
	data() {
		return {
			depositAmount: '1000.00',
			status: 'none',
			bank: {},
			voucherUrl: '',
			voucherUploading: false,
			voucherError: false,
			submitting: false
		}
	},
	computed: {
		depositAmountText() {
			const n = Number(this.depositAmount)
			return Number.isFinite(n) ? n.toFixed(2) : '1000.00'
		},
		statusText() {
			return ({ none: '未缴', pending: '审核中', paid: '已缴' })[this.status] || '未缴'
		}
	},
	onLoad() {
		this.load()
	},
	methods: {
		async load() {
			try {
				const [rule, dist, bank] = await Promise.all([
					distributionApi.upgradeRule().catch(() => null),
					distributionApi.index().catch(() => null),
					profileApi.bank().catch(() => ({}))
				])
				if (rule) {
					this.depositAmount = rule.level3_deposit_amount || rule.deposit_amount || this.depositAmount
				}
				if (dist) {
					this.status = dist.deposit_status || 'none'
					if (dist.deposit_amount && Number(dist.deposit_amount) > 0) {
						this.depositAmount = dist.deposit_amount
					}
					if (dist.deposit_voucher) {
						this.voucherUrl = this.normalizeUrl(dist.deposit_voucher)
					}
				}
				this.bank = bank || {}
			} catch (e) {}
		},
		normalizeUrl(url) {
			if (!url) return ''
			if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('wxfile:') || url.startsWith('file:')) {
				return url
			}
			return getBaseUrl() + (url.startsWith('/') ? url : '/' + url)
		},
		uploadVoucher() {
			if (this.voucherUploading || this.status === 'paid') return
			const startRoute = getCurrentRoute()
			const maxSize = 30 * 1024 * 1024
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const file = (res.tempFiles && res.tempFiles[0]) || {}
					if (file.size > maxSize) {
						uni.showToast({ title: '文件不能超过30M', icon: 'none' })
						return
					}
					const localPath = res.tempFilePaths[0]
					// 先本地回显，再替换为服务器地址
					this.voucherUrl = localPath
					this.voucherError = false
					this.voucherUploading = true
					uni.uploadFile({
						url: getUploadUrl(),
						filePath: localPath,
						name: 'file',
						header: { token: uni.getStorageSync('token') || '' },
						success: (r) => {
							const alive = isActiveRoute(startRoute)
							try {
								const body = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
								const data = body.data || {}
								if (body.code === 1) {
									const remote = data.fullurl || data.url || ''
									if (alive && remote) this.voucherUrl = this.normalizeUrl(remote)
									if (alive) this.voucherError = false
									if (alive) uni.showToast({ title: '上传成功', icon: 'success' })
								} else {
									if (alive) this.voucherUrl = ''
									if (alive) uni.showToast({ title: body.msg || '上传失败', icon: 'none' })
								}
							} catch (e) {
								if (alive) this.voucherUrl = ''
								if (alive) uni.showToast({ title: '上传失败', icon: 'none' })
							}
						},
						fail: () => {
							if (!isActiveRoute(startRoute)) return
							this.voucherUrl = ''
							uni.showToast({ title: '上传失败', icon: 'none' })
						},
						complete: () => { this.voucherUploading = false }
					})
				}
			})
		},
		previewVoucher() {
			if (!this.voucherUrl) return
			uni.previewImage({ urls: [this.voucherUrl], current: this.voucherUrl })
		},
		deleteVoucher() {
			if (this.status === 'paid') return
			this.voucherUrl = ''
		},
		async submit() {
			if (this.status === 'paid') return
			if (this.voucherUploading) {
				uni.showToast({ title: '凭证上传中，请稍候', icon: 'none' })
				return
			}
			if (!this.voucherUrl) {
				this.voucherError = true
				uni.showToast({ title: '请先上传转账凭证', icon: 'none' })
				return
			}
			if (this.submitting) return
			this.submitting = true
			try {
				await distributionApi.deposit({
					voucher: this.voucherUrl,
					amount: this.depositAmount
				})
				this.status = 'pending'
				uni.showToast({ title: '已提交，等待审核', icon: 'none' })
				setTimeout(() => navigateBack('/pages/distribution/index'), 800)
			} catch (e) {
			} finally {
				this.submitting = false
			}
		}
	}
}
</script>

<style scoped>
.page{display:flex;flex-direction:column;height:100vh;background:#f9f9f9;font-family:"PingFang SC",sans-serif}
.content{flex:1;height:0}
.notice,.pay-info,.upload-card{display:flex;flex-direction:column;box-sizing:border-box;width:690rpx;margin:20rpx 30rpx 0;padding:28rpx;background:#fff;border-radius:24rpx}
.notice{color:#414755;background:rgba(249,115,22,.07);border:2rpx solid #ff641f}
.notice b{color:#ff641f;font-size:32rpx;font-weight:400}
.notice text{margin-top:18rpx;font-size:28rpx;line-height:40rpx}
.notice em{color:#ff641f;font-size:36rpx;font-style:normal;font-weight:600}
.pay-info>b,.upload-title{font-size:32rpx;font-weight:500}
.upload-heading{display:flex;align-items:center}
.required{margin-left:16rpx;padding:4rpx 16rpx;color:#f97316;font-size:24rpx;background:rgba(249,115,22,.08);border-radius:999rpx}
.upload-tip{display:flex;align-items:center;box-sizing:border-box;margin-top:20rpx;padding:16rpx 20rpx;color:#f97316;font-size:24rpx;line-height:36rpx;background:rgba(249,115,22,.08);border-radius:16rpx}
.upload-tip image{width:28rpx;height:32rpx;margin-right:16rpx;flex-shrink:0}
.line{height:2rpx;margin:24rpx 0;background:#ddd}
.pay-info>view:not(.line){display:flex;justify-content:space-between;gap:24rpx;margin-bottom:22rpx;color:#414755;font-size:28rpx}
.pay-info>view:not(.line) text:last-child{flex:1;text-align:right;word-break:break-all}
.pay-info strong{color:#ff641f;font-size:36rpx}
.uploader{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;height:220rpx;margin-top:20rpx;color:#f97316;border:3rpx dashed rgba(249,115,22,.4);border-radius:24rpx;font-size:28rpx}
.uploader.error{border-color:#fb3b19;color:#fb3b19;background:rgba(251,59,25,.04)}
.upload-error{margin-top:16rpx;color:#fb3b19;font-size:24rpx;line-height:34rpx}
.voucher-list{display:flex;flex-direction:row;align-items:center;gap:20rpx;margin-top:20rpx}
.voucher-thumb,.voucher-add{position:relative;box-sizing:border-box;width:220rpx;height:220rpx;overflow:hidden;border-radius:16rpx}
.voucher-image{width:220rpx;height:220rpx;background:#f5f5f5}
.voucher-cover{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:28rpx;background:rgba(0,0,0,.55)}
.voucher-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8rpx;color:#f97316;font-size:24rpx;border:3rpx dashed rgba(249,115,22,.4)}
.voucher-add .plus{font-size:48rpx;line-height:1}
.footer{position:fixed;right:0;bottom:0;left:0;box-sizing:border-box;height:196rpx;padding:34rpx 30rpx;background:#fff;border-top:2rpx solid #eee}
.footer button{width:690rpx;height:96rpx;margin:0;color:#fff;font-size:32rpx;background:linear-gradient(90deg,#ff381d,#ff7414);border:0;border-radius:100rpx}
.footer button[disabled]{opacity:.55}
.footer button:after{border:0}
</style>
