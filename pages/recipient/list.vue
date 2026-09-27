<template>
	<view class="address-page">
		<page-nav title="收货人地址" back-icon="/static/recipient-list/back.svg" fallback="/pages/workbench/warehouse-opened" @layout="onNavLayout" />

		<view class="search-section">
			<view class="search-box">
				<image src="/static/recipient-list/search.svg" mode="aspectFit" />
				<input v-model="keyword" placeholder="搜索收货人姓名" placeholder-class="search-placeholder" />
			</view>
		</view>

		<order-list-loader class="address-loader" :top="listTop" bottom="196rpx" refresh-name="收货人地址" :loading="loading" :has-more="false" :show-footer="false" @refresh="refreshAddresses">
		<view class="address-list">
			<view v-for="item in filteredAddresses" :key="item.id" class="address-card" @tap="selectAddress(item)">
				<view class="person-line">
					<text class="name">{{ item.name }}</text>
					<text class="phone">{{ maskMobile(item.mobile) }}</text>
					<text v-if="item.is_default" class="default-tag">默认</text>
				</view>
				<text class="address">{{ item.full_address }}</text>
				<image class="divider" src="/static/recipient-list/divider.svg" mode="scaleToFill" />
				<view class="card-actions">
					<view v-if="!item.is_default" class="set-default" @tap.stop="setDefault(item.id)">
						<image src="/static/recipient-list/radio.svg" mode="aspectFit" />
						<text>设为默认</text>
					</view>
					<view class="right-actions">
						<text class="edit" @tap.stop="editAddress(item.id)">编辑</text>
						<text class="delete" @tap.stop="deleteAddress(item.id)">删除</text>
					</view>
				</view>
			</view>
			<view v-if="!filteredAddresses.length" class="empty">暂无收货人</view>
		</view>
		</order-list-loader>

		<view class="bottom-bar">
			<button class="add-button" @tap="addAddress">添加收货人</button>
		</view>
	</view>
</template>

<script>
	import { addressApi } from '@/api/index'
	import OrderListLoader from '@/components/order-list-loader/order-list-loader.vue'
	import PageNav from '@/components/page-nav/page-nav.vue'
	import { getCapsuleLayout, pxToRpx } from '@/utils/capsule'
	import { navigateBack } from '@/utils/nav'

	export default {
		components: { OrderListLoader, PageNav },
		data() {
			return {
				navBarHeight: getCapsuleLayout().navBarHeight,
				keyword: '',
				addresses: [],
				fromConfirm: false,
				loading: false
			}
		},
		computed: {
			listTop() {
				return (pxToRpx(this.navBarHeight) + 108) + 'rpx'
			},
			filteredAddresses() {
				const keyword = this.keyword.trim()
				const list = keyword
					? this.addresses.filter(item => String(item.name || '').includes(keyword))
					: this.addresses.slice()
				// 默认地址始终排在第一位
				return list.sort((a, b) => (Number(b.is_default) - Number(a.is_default)) || (b.id - a.id))
			}
		},
		onLoad(options) {
			this.fromConfirm = options.from === 'confirm'
		},
		onShow() {
			this.loadAddresses()
		},
		methods: {
			onNavLayout(layout) {
				this.navBarHeight = layout.navBarHeight
			},
			refreshAddresses() { return this.loadAddresses() },
			async loadAddresses() {
				if (this.loading) return
				this.loading = true
				try {
					const data = await addressApi.lists()
					this.addresses = data.list || []
				} catch (e) { this.addresses = [] } finally { this.loading = false }
			},
			maskMobile(mobile) {
				return String(mobile || '').replace(/(\d{3})\d{4}(\d{4})/, '$1 **** $2')
			},
			goBack() {
				navigateBack('/pages/workbench/warehouse-opened')
			},
			addAddress() {
				uni.navigateTo({ url: '/pages/recipient/add' })
			},
			editAddress(id) {
				uni.navigateTo({ url: `/pages/recipient/add?id=${id}` })
			},
			setDefault(id) {
				addressApi.setDefault(id).then(() => {
					this.addresses = this.addresses
						.map(item => ({ ...item, is_default: item.id === id ? 1 : 0 }))
						.sort((a, b) => (Number(b.is_default) - Number(a.is_default)) || (b.id - a.id))
					uni.showToast({ title: '已设为默认地址', icon: 'success' })
				})
			},
			deleteAddress(id) {
				uni.showModal({
					title: '删除收货人',
					content: '确定删除这条收货地址吗？',
					confirmColor: '#ff5f4e',
					success: result => {
					if (result.confirm) addressApi.del(id).then(() => {
						this.addresses = this.addresses.filter(item => item.id !== id)
						uni.showToast({ title: '已删除', icon: 'success' })
					})
				}
			})
			},
			selectAddress(item) {
				if (!this.fromConfirm) return
				this.getOpenerEventChannel().emit('selectAddress', item)
				navigateBack('/pages/delivery/confirm')
			}
		}
	}
</script>

<style scoped>
	.address-page { box-sizing: border-box; min-height: 100vh; padding-bottom: 196rpx; color: #1a1c1c; background: #f9f9f9; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.search-section { box-sizing: border-box; height: 108rpx; padding: 16rpx 30rpx; background: #fff; }
	.search-box { display: flex; align-items: center; box-sizing: border-box; width: 100%; height: 76rpx; padding: 0 20rpx; background: #f5f5f5; border-radius: 200rpx; }
	.search-box image { flex: 0 0 auto; width: 36rpx; height: 36rpx; }
	.search-box input { flex: 1; height: 76rpx; margin-left: 16rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 76rpx; }
	.search-placeholder { color: rgba(0,0,0,.45); }
	.address-loader { background: #f9f9f9; }
	.address-list { box-sizing: border-box; min-height: 100%; padding: 24rpx 30rpx 40rpx; }
	.address-card { position: relative; box-sizing: border-box; width: 100%; height: 258rpx; margin-bottom: 24rpx; padding: 34rpx 30rpx 0; background: #fff; border-radius: 20rpx; }
	.person-line { display: flex; align-items: center; height: 40rpx; }
	.name { color: rgba(0,0,0,.85); font-size: 34rpx; font-weight: 500; line-height: 40rpx; }
	.phone { margin-left: 14rpx; color: rgba(0,0,0,.65); font-size: 28rpx; line-height: 40rpx; }
	.default-tag { display: flex; align-items: center; justify-content: center; width: 74rpx; height: 36rpx; margin-left: 20rpx; color: #ff0707; font-size: 20rpx; line-height: 36rpx; text-align: center; background: rgba(255,163,163,.2); border-radius: 30rpx; }
	.address { position: absolute; top: 100rpx; left: 30rpx; display: block; width: 630rpx; overflow: hidden; color: rgba(0,0,0,.85); font-size: 28rpx; line-height: 40rpx; white-space: nowrap; text-overflow: ellipsis; }
	.divider { position: absolute; top: 172rpx; left: 30rpx; width: 630rpx; height: 2rpx; }
	.card-actions { position: absolute; top: 196rpx; left: 30rpx; display: flex; align-items: center; justify-content: space-between; width: 630rpx; height: 32rpx; }
	.set-default { display: flex; align-items: center; color: rgba(0,0,0,.45); font-size: 24rpx; line-height: 32rpx; letter-spacing: 1.2rpx; }
	.set-default image { width: 30rpx; height: 30rpx; margin-right: 8rpx; }
	.right-actions { display: flex; align-items: center; margin-left: auto; font-size: 24rpx; line-height: 32rpx; letter-spacing: 1.2rpx; }
	.edit { color: rgba(0,0,0,.65); }
	.delete { margin-left: 24rpx; color: #ff5f4e; }
	.empty { padding-top: 120rpx; color: rgba(0,0,0,.35); font-size: 28rpx; text-align: center; }
	.bottom-bar { position: fixed; z-index: 10; bottom: 0; left: 0; box-sizing: border-box; width: 100%; height: 196rpx; padding: 34rpx 30rpx 66rpx; background: #fff; border-top: 2rpx solid rgba(0,0,0,.06); }
	.add-button { display: flex; align-items: center; justify-content: center; width: 100%; height: 96rpx; margin: 0; padding: 0; color: #ff641f; font-size: 32rpx; font-weight: 500; line-height: 48rpx; background: #fff0e8; border: 0; border-radius: 200rpx; }
	.add-button::after { border: 0; }
	.add-button:active { opacity: .9; }
</style>
