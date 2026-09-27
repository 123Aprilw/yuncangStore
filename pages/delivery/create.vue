<template>
	<view class="create-page">
		<page-nav title="云仓发货" back-icon="/static/delivery-create/back.svg" fallback="/pages/workbench/warehouse-opened">
			<template #right>
				<text class="step">1/3</text>
			</template>
		</page-nav>

		<view class="recipient-list">
			<view v-if="!recipients.length" class="empty-state" @tap="addRecipient">
				<text class="empty-title">暂无收货人</text>
				<text class="empty-desc">点击下方「添加收货人」开始云仓发货</text>
			</view>
			<view v-for="item in recipients" :key="item.id" class="recipient-card" @tap="selectRecipient(item.id)">
				<image class="select-icon" :src="selectedId === item.id ? '/static/delivery-create/selected.svg' : '/static/delivery-create/unselected.svg'" mode="aspectFit" />
				<view class="person-line">
					<text class="name">{{ item.name }}</text>
					<text class="phone">{{ item.phone }}</text>
				<text v-if="item.is_default || item.isDefault" class="default-tag">默认</text>
				</view>
				<text class="address">{{ item.addressText }}</text>
				<image class="edit-icon" src="/static/delivery-create/edit.svg" mode="aspectFit" @tap.stop="editRecipient(item.id)" />
			</view>
		</view>

		<view class="bottom-bar">
			<button class="secondary-button" @tap="addRecipient">添加收货人</button>
			<button class="primary-button" @tap="nextStep">下一步</button>
		</view>
	</view>
</template>

<script>
	import { addressApi } from '@/api/index'
	import PageNav from '@/components/page-nav/page-nav.vue'
	export default {
		components: { PageNav },
		data() {
			return {
				selectedId: 0,
				recipients: []
			}
		},
		onShow() { this.loadRecipients() },
		methods: {
			async loadRecipients() {
				try {
					const data = await addressApi.lists()
					this.recipients = (data.list || []).map(item => ({
						...item,
						phone: String(item.mobile || '').replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2'),
						addressText: item.full_address || [item.province, item.city, item.district, item.address].filter(Boolean).join('')
					}))
					if (!this.recipients.some(item => Number(item.id) === Number(this.selectedId))) {
						const defaultItem = this.recipients.find(item => Number(item.is_default || item.isDefault)) || this.recipients[0]
						this.selectedId = defaultItem ? defaultItem.id : 0
					}
				} catch (e) { this.recipients = []; this.selectedId = 0 }
			},
			selectRecipient(id) {
				this.selectedId = id
			},
			editRecipient(id) {
				uni.navigateTo({ url: `/pages/recipient/add?id=${id}` })
			},
			addRecipient() {
				uni.navigateTo({ url: '/pages/recipient/add' })
			},
			nextStep() {
				if (!this.selectedId) {
					uni.showToast({ title: '请选择收货人', icon: 'none' })
					return
				}
				const recipient = this.recipients.find(item => Number(item.id) === Number(this.selectedId))
				uni.setStorageSync('delivery_recipient', recipient)
				uni.navigateTo({ url: '/pages/delivery/products' })
			}
		}
	}
</script>

<style scoped>
	.create-page { box-sizing: border-box; min-height: 100vh; padding-bottom: 186rpx; color: #1a1c1c; background: #f9f9f9; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.step { color: rgba(0,0,0,.45); font-size: 28rpx; line-height: 44rpx; }
	.recipient-list { padding: 24rpx 30rpx 40rpx; }
	.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; min-height: 520rpx; margin-top: 80rpx; padding: 48rpx 40rpx; color: #a89587; letter-spacing: 1rpx; background: linear-gradient(135deg, #fffaf5, #fff5ed); border: 2rpx dashed #f6d4bd; border-radius: 20rpx; }
	.empty-state:before { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; margin-bottom: 24rpx; color: #f1844d; font-size: 44rpx; line-height: 88rpx; content: '✦'; background: #fff; border-radius: 50%; box-shadow: 0 8rpx 18rpx rgba(237,130,67,.12); }
	.empty-title { color: #8a6f5c; font-size: 30rpx; font-weight: 500; line-height: 42rpx; }
	.empty-desc { margin-top: 12rpx; color: #a89587; font-size: 26rpx; line-height: 36rpx; text-align: center; }
	.recipient-card { position: relative; box-sizing: border-box; width: 100%; height: 172rpx; margin-bottom: 24rpx; background: #fff; border-radius: 20rpx; }
	.select-icon { position: absolute; top: 68rpx; left: 24rpx; width: 36rpx; height: 36rpx; }
	.person-line { position: absolute; top: 30rpx; left: 84rpx; display: flex; align-items: center; height: 40rpx; }
	.name { color: rgba(0,0,0,.85); font-size: 34rpx; font-weight: 500; line-height: 40rpx; }
	.phone { margin-left: 14rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 40rpx; }
	.default-tag { display: flex; align-items: center; justify-content: center; width: 74rpx; height: 36rpx; margin-left: 20rpx; color: #ff0707; font-size: 20rpx; line-height: 36rpx; text-align: center; background: rgba(255,163,163,.2); border-radius: 30rpx; }
	.address { position: absolute; top: 98rpx; left: 84rpx; width: 486rpx; overflow: hidden; color: rgba(0,0,0,.85); font-size: 28rpx; line-height: 40rpx; white-space: nowrap; text-overflow: ellipsis; }
	.edit-icon { position: absolute; top: 68rpx; right: 24rpx; width: 36rpx; height: 36rpx; }
	.bottom-bar { position: fixed; z-index: 10; bottom: 0; left: 0; display: flex; gap: 34rpx; box-sizing: border-box; width: 100%; height: 186rpx; padding: 36rpx 30rpx 54rpx; background: #fff; border-top: 2rpx solid rgba(0,0,0,.06); }
	.secondary-button, .primary-button { display: flex; flex: 1; align-items: center; justify-content: center; height: 96rpx; margin: 0; padding: 0; font-size: 32rpx; font-weight: 500; line-height: 48rpx; border: 0; border-radius: 60rpx; }
	.secondary-button { color: #656565; background: #f7f7f7; }
	.primary-button { color: #fff; background: linear-gradient(90deg, #fb3b19, #f97316); }
	.secondary-button::after, .primary-button::after { border: 0; }
	.secondary-button:active, .primary-button:active { opacity: .9; }
</style>
