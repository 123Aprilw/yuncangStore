<template>
	<view class="recipient-page">
		<page-nav :title="editId ? '编辑收货人' : '添加收货人'" back-icon="/static/recipient/back.svg" fallback="/pages/recipient/list">
			<template #right>
				<text class="list-link" @tap="openList">列表</text>
			</template>
		</page-nav>

		<view class="content">
			<view class="card basic-card">
				<text class="card-title">基本信息</text>
				<view class="field">
					<text class="label">姓名 <text class="required">*</text></text>
					<input v-model="form.name" class="input" placeholder="请输入姓名" placeholder-class="placeholder" />
				</view>
				<view class="field">
					<text class="label">手机号 <text class="required">*</text></text>
					<input v-model="form.phone" class="input" :class="{ 'input-error': phoneError }" type="number" maxlength="11" placeholder="请输入手机号" placeholder-class="placeholder" @input="phoneError = ''" />
					<text v-if="phoneError" class="field-error">{{ phoneError }}</text>
				</view>
			</view>

			<view class="card address-card">
				<text class="card-title">收货地址</text>
				<view class="field">
					<text class="label">所在地区</text>
					<picker mode="region" :value="form.region" @change="onRegionChange">
						<view class="input region-input">
							<text class="region-text" :class="{ placeholder: !form.region.length }">{{ regionText }}</text>
							<image src="/static/recipient/chevron.svg" mode="aspectFit" />
						</view>
					</picker>
				</view>
				<view class="field field-address">
					<text class="label">详细地址</text>
					<view class="textarea-wrap">
						<textarea
							v-model="form.address"
							class="textarea"
							maxlength="120"
							:fixed="false"
							:adjust-position="true"
							:show-confirm-bar="false"
							placeholder="请输入详细地址"
							placeholder-class="placeholder"
						/>
					</view>
				</view>
				<view class="default-row">
					<text class="default-label">设为默认地址</text>
					<switch :key="'default-' + switchKey" :checked="!!form.isDefault" color="#ff7e33" @change="changeDefault" />
				</view>
			</view>
		</view>

		<view class="bottom-bar">
			<button class="submit-button" :loading="submitting" :disabled="submitting" @tap="submit">{{ editId ? '保存修改' : '确认添加' }}</button>
		</view>
	</view>
</template>

<script>
	import { addressApi } from '@/api/index'
	import PageNav from '@/components/page-nav/page-nav.vue'
	import { navigateBack } from '@/utils/nav'

	export default {
		components: { PageNav },
		data() {
			return {
				form: {
					name: '',
					phone: '',
					region: [],
					address: '',
					isDefault: true
				},
				editId: 0,
				fromWorkbench: false,
				phoneError: '',
				submitting: false,
				switchKey: 0,
				ignoreSwitchChange: false
			}
		},
		computed: {
			regionText() {
				if (!this.form.region[0]) return '请选择所在地区'
				const parts = []
				this.form.region.forEach((name) => {
					if (!name) return
					if (parts.length && parts[parts.length - 1] === name) return
					parts.push(name)
				})
				return parts.join(' ') || '请选择所在地区'
			}
		},
		async onLoad(options) {
			this.editId = Number(options.id || 0)
			this.fromWorkbench = options.from === 'workbench'
			if (this.editId) await this.loadAddress()
		},
		methods: {
			async loadAddress() {
				try {
					const address = await addressApi.detail(this.editId)
					this.form.name = address.name || ''
					this.form.phone = address.mobile || ''
					this.form.address = address.address || ''
					this.form.isDefault = Number(address.is_default) === 1
					const province = address.province || ''
					const city = address.city || province
					const district = address.district || ''
					this.form.region = province && district ? [province, city, district] : []
					this.switchKey += 1
				} catch (e) {
					uni.showToast({ title: '地址加载失败', icon: 'none' })
				}
			},
			onRegionChange(event) {
				const keepDefault = !!this.form.isDefault
				const value = (event.detail && event.detail.value) || []
				this.form.region = value.length === 3 ? value : []
				this.ignoreSwitchChange = true
				this.form.isDefault = keepDefault
				this.switchKey += 1
				setTimeout(() => {
					this.form.isDefault = keepDefault
					this.ignoreSwitchChange = false
				}, 400)
			},
			openList() {
				uni.navigateTo({ url: '/pages/recipient/list' })
			},
			changeDefault(event) {
				if (this.ignoreSwitchChange) {
					const keep = !!this.form.isDefault
					this.switchKey += 1
					this.$nextTick(() => {
						this.form.isDefault = keep
					})
					return
				}
				this.form.isDefault = !!(event.detail && event.detail.value)
			},
			async submit() {
				this.phoneError = ''
				if (!this.form.name.trim()) {
					uni.showToast({ title: '请输入姓名', icon: 'none' })
					return
				}
				if (!/^1\d{10}$/.test(this.form.phone)) {
					this.phoneError = '请输入 11 位有效手机号'
					uni.showToast({ title: this.phoneError, icon: 'none' })
					return
				}
				if (!this.form.region[0] || !this.form.region[2] || !this.form.address.trim()) {
					uni.showToast({ title: '请完善收货地址', icon: 'none' })
					return
				}
				const [province = '', city = '', district = ''] = this.form.region
				const payload = {
					name: this.form.name.trim(),
					mobile: this.form.phone.trim(),
					province,
					city,
					district,
					address: this.form.address.trim(),
					is_default: this.form.isDefault ? 1 : 0
				}
				this.submitting = true
				try {
					if (this.editId) await addressApi.edit({ ...payload, id: this.editId })
					else await addressApi.add(payload)
					uni.showToast({ title: this.editId ? '保存成功' : '添加成功', icon: 'success' })
					setTimeout(() => {
						if (this.fromWorkbench && !this.editId) uni.redirectTo({ url: '/pages/recipient/list' })
						else navigateBack('/pages/recipient/list')
					}, 500)
				} catch (e) {
					// request.js 已 toast
				} finally {
					this.submitting = false
				}
			}
		}
	}
</script>

<style>
	page { min-height: 100%; background: #f7f7f7; }
</style>
<style scoped>
	.recipient-page { box-sizing: border-box; min-height: 100vh; padding-bottom: calc(196rpx + env(safe-area-inset-bottom)); color: #1a1c1c; background: #f7f7f7; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.list-link { color: #f97316; font-size: 28rpx; font-weight: 500; line-height: 44rpx; }
	.content { padding: 20rpx 30rpx 30rpx; }
	.card { box-sizing: border-box; width: 100%; padding: 30rpx; background: #fff; border-radius: 24rpx; overflow: hidden; }
	.address-card { margin-top: 20rpx; }
	.card-title { display: block; color: #111; font-size: 32rpx; font-weight: 600; line-height: 44rpx; }
	.field { display: flex; flex-direction: column; width: 100%; margin-top: 24rpx; }
	.field-address { position: relative; z-index: 1; }
	.label { display: block; width: 100%; color: #666; font-size: 28rpx; line-height: 40rpx; white-space: nowrap; }
	.required { color: #ff3b30; }
	.input { box-sizing: border-box; width: 100%; height: 88rpx; margin-top: 14rpx; padding: 0 28rpx; color: rgba(0,0,0,.75); font-size: 28rpx; line-height: 88rpx; background: #f9f9f9; border: 2rpx solid #eee; border-radius: 16rpx; }
	.input-error { border-color: #ff3b30; }
	.field-error { display: block; margin: 8rpx 4rpx 0; color: #ff3b30; font-size: 24rpx; line-height: 32rpx; }
	.textarea-wrap { box-sizing: border-box; position: relative; z-index: 1; width: 100%; height: 186rpx; margin-top: 14rpx; overflow: hidden; background: #f9f9f9; border: 2rpx solid #eee; border-radius: 16rpx; }
	.textarea { box-sizing: border-box; display: block; width: 100%; height: 186rpx; margin: 0; padding: 24rpx 28rpx; color: rgba(0,0,0,.75); font-size: 28rpx; line-height: 40rpx; background: transparent; border: 0; }
	.placeholder { color: rgba(0,0,0,.35); }
	.region-input { display: flex; align-items: center; justify-content: space-between; }
	.region-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.region-input image { flex: 0 0 auto; width: 28rpx; height: 28rpx; margin-left: 12rpx; opacity: .45; transform: rotate(-90deg); }
	.default-row { display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; width: 100%; min-height: 64rpx; margin-top: 12rpx; padding-top: 20rpx; }
	.default-label { flex: 1; min-width: 0; color: #1a1c1c; font-size: 28rpx; line-height: 44rpx; white-space: nowrap; }
	.default-row switch { flex: 0 0 auto; margin-left: 16rpx; transform: scale(.78); transform-origin: right center; }
	.bottom-bar { position: fixed; z-index: 10; bottom: 0; left: 0; box-sizing: border-box; width: 100%; padding: 24rpx 30rpx calc(34rpx + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -4rpx 20rpx rgba(0,0,0,.03); }
	.submit-button { display: flex; align-items: center; justify-content: center; width: 100%; height: 96rpx; margin: 0; padding: 0; color: #ff641f; font-size: 32rpx; font-weight: 600; line-height: 48rpx; background: #fff0e8; border: 0; border-radius: 200rpx; }
	.submit-button[disabled] { opacity: .65; }
	.submit-button::after { border: 0; }
	.submit-button:active { opacity: .9; }
</style>
