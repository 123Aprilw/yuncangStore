<template>
	<view class="page">
		<common-header title="编辑"/>
		<view class="avatar-card">
			<view class="avatar-wrap">
				<image mode="aspectFill" :src="avatarSrc" @error="onAvatarError"/>
			</view>
			<button @tap="chooseAvatar" style="display:flex;align-items:center;justify-content:center;padding:0;line-height:1">更换头像</button>
			<text class="upload-tip">仅支持图片，不超过30M</text>
		</view>
		<view class="info-card">
			<b>个人信息</b>
			<label>昵称 <em>*</em></label>
			<view class="field">
				<input v-model="form.nickname" maxlength="20" placeholder="请输入昵称"/>
				<image src="/static/profile/edit.svg"/>
			</view>
			<label>手机号</label>
			<view class="field">
				<text>{{ maskedMobile }}</text>
				<text class="change" @tap="phone">更改手机号</text>
			</view>
		</view>
		<button class="save" @tap="save">保存修改</button>
	</view>
</template>
<script>
import CommonHeader from './header.vue'
import { profileApi } from '@/api/index'
import { getUploadUrl } from '@/utils/request'
import { displayAvatar, avatarPlaceholder, resolveAvatar } from '@/utils/avatar'
import { navigateBack } from '@/utils/nav'
export default {
	components: { CommonHeader },
	data() {
		return {
			form: { nickname: '', mobile: '', avatar: '' },
			avatarBroken: false
		}
	},
	computed: {
		maskedMobile() {
			return this.form.mobile ? this.form.mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2') : ''
		},
		avatarSrc() {
			if (this.avatarBroken) return avatarPlaceholder()
			return displayAvatar(this.form.avatar)
		}
	},
	onLoad() { this.load() },
	methods: {
		async load() {
			try {
				this.avatarBroken = false
				this.form = Object.assign(this.form, await profileApi.index())
			} catch (e) {
				uni.showToast({ title: '资料加载失败', icon: 'none' })
			}
		},
		onAvatarError() { this.avatarBroken = true },
		phone() { uni.navigateTo({ url: '/pages/profile/phone' }) },
		chooseAvatar() {
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
					uni.showLoading({ title: '上传中' })
					uni.uploadFile({
						url: getUploadUrl(),
						filePath: res.tempFilePaths[0],
						name: 'file',
						header: { token: uni.getStorageSync('token') || '' },
						success: (r) => {
							try {
								const body = JSON.parse(r.data)
								if (body.code === 1) {
									this.avatarBroken = false
									this.form.avatar = body.data.fullurl || body.data.url
								} else {
									uni.showToast({ title: body.msg || '上传失败', icon: 'none' })
								}
							} catch (e) {
								uni.showToast({ title: '上传失败', icon: 'none' })
							}
						},
						fail: () => uni.showToast({ title: '上传失败', icon: 'none' }),
						complete: () => uni.hideLoading()
					})
				}
			})
		},
		async save() {
			if (!this.form.nickname.trim()) {
				uni.showToast({ title: '请输入昵称', icon: 'none' })
				return
			}
			const data = { nickname: this.form.nickname }
			const avatar = resolveAvatar(this.form.avatar)
			if (avatar && avatar.length <= 255) data.avatar = avatar
			try {
				await profileApi.update(data)
				uni.showToast({ title: '保存成功', icon: 'success' })
				setTimeout(() => navigateBack('/pages/profile/index'), 500)
			} catch (e) {}
		}
	}
}
</script>
<style scoped>
.page{height:100vh;background:#f9f9f9;font-family:"PingFang SC",sans-serif}
.avatar-card{display:flex;flex-direction:column;align-items:center;box-sizing:border-box;width:690rpx;height:304rpx;margin:20rpx 30rpx;padding:20rpx;background:#fff;border-radius:20rpx}
.avatar-wrap{width:160rpx;height:160rpx;border-radius:50%;overflow:hidden;flex-shrink:0}
.avatar-wrap image{width:100%;height:100%;display:block}
.avatar-card button{width:218rpx;height:78rpx;margin:20rpx 0 0;color:#ff641f;font-size:26rpx;background:#fff;border:2rpx solid #ff641f;border-radius:14rpx}
.avatar-card .upload-tip{margin-top:12rpx;color:rgba(0,0,0,.45);font-size:22rpx;line-height:32rpx}
.avatar-card button:after,.save:after{border:0}
.info-card{box-sizing:border-box;width:690rpx;margin:20rpx 30rpx;padding:30rpx 30rpx 40rpx;background:#fff;border-radius:20rpx}
.info-card>b{display:block;font-size:32rpx}
.info-card label{display:flex;align-items:center;white-space:nowrap;margin:26rpx 0 14rpx;font-size:28rpx}
.info-card em{display:inline-block;margin-left:6rpx;color:red;font-style:normal;line-height:1}
.field{display:flex;align-items:center;box-sizing:border-box;width:630rpx;height:94rpx;padding:0 24rpx;background:#f9f9f9;border-radius:14rpx}
.field input{flex:1;font-size:28rpx}
.field image{width:28rpx;height:28rpx}
.field text{font-size:28rpx}
.field .change{margin-left:auto;color:#ff641f;font-size:24rpx}
.save{display:flex;align-items:center;justify-content:center;position:fixed;bottom:124rpx;left:30rpx;width:690rpx;height:98rpx;padding:0;line-height:1;color:#ff641f;font-size:32rpx;background:#fff0e8;border:0;border-radius:100rpx}
</style>
