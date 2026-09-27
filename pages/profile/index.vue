<template>
	<view class="page">
		<page-nav title="我的" :show-back="false" transparent />
		<view class="profile" @tap="open('/pages/profile/edit')">
			<view class="avatar-wrap"><image mode="aspectFill" :src="avatarSrc" @error="onAvatarError" /></view>
			<view><b>{{profile.nickname||profile.username||'用户'}}</b><text>手机号：{{profile.mobile||'未绑定'}}</text></view>
			<text class="right-arrow">›</text>
		</view>
		<view class="menu">
			<view v-for="m in menus" :key="m.text" @tap="open(m.url)">
				<view class="menu-icon"><image :src="m.icon" /></view>
				<text>{{m.text}}</text>
				<text v-if="m.badge" class="message-badge">{{ m.badge > 99 ? '99+' : m.badge }}</text>
				<text class="right-arrow">›</text>
			</view>
		</view>
		<button class="logout" @tap="logout">退出登录</button>
		<bottom-tabbar :items="tabs" />
	</view>
</template>

<script>
	import { profileApi } from '@/api/index'
	import { setToken } from '@/utils/request'
	import { displayAvatar, avatarPlaceholder } from '@/utils/avatar'
	import BottomTabbar from '@/components/bottom-tabbar/bottom-tabbar.vue'
	import PageNav from '@/components/page-nav/page-nav.vue'
	export default {
		components: { BottomTabbar, PageNav },
		data() {
			return {
				profile: {},
				avatarBroken: false,
				menus: [
					{text:'我的协议',icon:'/static/profile/agreement.svg',url:'/pages/profile/agreements'},
					{text:'我的地址',icon:'/static/profile/address.svg',url:'/pages/recipient/list'},
					{text:'消息中心',icon:'/static/profile/message-no-dot.svg',url:'/pages/profile/messages',badge:0},
					{text:'帮助中心',icon:'/static/profile/help.svg',url:'/pages/profile/help'}
				],
				tabs: [
					{label:'工作台',icon:'/static/order/tab-workbench.svg',url:'/pages/workbench/no-warehouse'},
					{label:'商品',icon:'/static/order/tab-product.svg',url:'/pages/product/index'},
					{label:'订单',icon:'/static/product/tab-order.svg',url:'/pages/order/index'},
					{label:'分销',icon:'/static/order/tab-distribution.svg',url:'/pages/distribution/index'},
					{label:'我的',icon:'/static/profile/tab-active.svg',active:true}
				]
			}
		},
		computed: {
			avatarSrc() {
				if (this.avatarBroken) return avatarPlaceholder()
				return displayAvatar(this.profile.avatar)
			}
		},
		onShow() { this.load() },
		methods: {
			async load() {
				try {
					this.avatarBroken = false
					this.profile = await profileApi.index()
					this.menus[2].badge = this.profile.unread_message || 0
				} catch (e) {}
			},
			onAvatarError() { this.avatarBroken = true },
			open(url) { if (url) uni.navigateTo({ url }) },
			logout() { setToken(''); uni.reLaunch({ url:'/pages/index/index' }) }
		}
	}
</script>

<style scoped>
	.page{min-height:100vh;background:linear-gradient(180deg,#ffedd3 12%,#f5f5f5 36%);font-family:"PingFang SC",sans-serif}
	.profile{display:flex;align-items:center;padding:38rpx 40rpx}
	.avatar-wrap{width:112rpx;height:112rpx;border-radius:50%;overflow:hidden;flex-shrink:0}.avatar-wrap image{width:100%;height:100%;display:block}
	.profile>view{display:flex;flex-direction:column;margin-left:28rpx}
	.profile b{font-size:36rpx}.profile text{margin-top:12rpx;color:#999;font-size:24rpx}
	.right-arrow{display:flex!important;align-items:center;justify-content:center;flex:none;margin:0 0 0 auto!important;padding:0 6rpx;color:#777!important;font-size:56rpx!important;font-weight:300;line-height:56rpx!important}
	.menu{margin:0 30rpx;padding:14rpx 24rpx;background:#fff;border-radius:28rpx}
	.menu>view{display:flex;align-items:center;height:96rpx}
	.menu-icon{display:flex;align-items:center;justify-content:center;width:48rpx;height:48rpx;flex:none}
	.menu-icon image{width:48rpx;height:48rpx}
	.message-badge{display:flex;align-items:center;justify-content:center;box-sizing:border-box;min-width:32rpx;height:32rpx;padding:0 8rpx;margin:0 4rpx 0 0!important;color:#fff!important;font-size:20rpx!important;font-weight:500;line-height:32rpx!important;background:#ff3b30;border-radius:32rpx;flex:none}
	.menu>view>text:not(.right-arrow):not(.message-badge){margin-left:28rpx;font-size:30rpx;flex:1}
	.logout{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:690rpx;height:96rpx;margin:38rpx 30rpx 140rpx;padding:0;color:#ff641f;font-size:32rpx;line-height:1;background:#fff0e8;border:0;border-radius:100rpx}.logout:after{border:0}
</style>
