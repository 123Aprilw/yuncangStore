<template>
	<view class="page">
		<page-nav title="商品" :show-back="false" transparent />
		<view class="search-row">
			<view class="search-box">
				<image src="/static/product/search.svg" mode="aspectFit" />
				<input v-model="keyword" placeholder="搜索商品名称" confirm-type="search" @confirm="loadGoods" />
			</view>
		</view>
		<view class="main">
			<scroll-view v-if="categories.length" class="category-sidebar" scroll-y>
				<view
					v-for="(category, index) in categories"
					:key="category.id"
					class="category-item"
					:class="{ active: index === activeCategory }"
					@tap="selectCategory(index)"
				>{{ category.name }}</view>
			</scroll-view>
			<scroll-view class="product-list" scroll-y :show-scrollbar="false">
				<view v-if="subCategories.length" class="sub-categories">
					<view
						v-for="item in subCategories"
						:key="item.id"
						class="sub-item"
						:class="{ active: activeSubId === item.id }"
						@tap="selectSubCategory(item.id)"
					>
						<image class="sub-icon" :src="item.image || '/static/common/product-placeholder.png'" mode="aspectFill" />
						<text class="sub-name">{{ item.name }}</text>
					</view>
				</view>
				<view v-for="product in products" :key="product.id" class="product-card" @tap="openDetail(product.id)">
					<image class="product-picture" :src="product.icon || '/static/common/product-placeholder.png'" mode="aspectFill" />
					<view class="product-info">
						<text class="product-name">{{ product.name }}</text>
						<view class="product-meta">
							<text class="price">¥{{ product.price }}</text>
							<text class="stock">{{ product.stock_text || ('库存:' + (product.stock ?? 0) + '盒') }}</text>
						</view>
					</view>
				</view>
				<view class="empty-state" :class="{ 'is-end': products.length }">
					<image v-if="!products.length" src="/static/product/empty.png" mode="aspectFit" />
					<text>{{ products.length ? '更多品类即将上架...' : '暂无商品' }}</text>
				</view>
			</scroll-view>
		</view>
		<bottom-tabbar :items="tabs" />
	</view>
</template>

<script>
import { goodsApi } from '@/api/index'
import BottomTabbar from '@/components/bottom-tabbar/bottom-tabbar.vue'
import PageNav from '@/components/page-nav/page-nav.vue'

export default {
	components: { BottomTabbar, PageNav },
	data() {
		return {
			keyword: '',
			products: [],
			categories: [],
			activeCategory: 0,
			activeSubId: 0,
			tabs: [
				{ label: '工作台', icon: '/static/product/tab-workbench.svg', route: '/pages/workbench/no-warehouse' },
				{ label: '商品', icon: '/static/product/tab-product-active.svg', active: true },
				{ label: '订单', icon: '/static/product/tab-order.svg', route: '/pages/order/index' },
				{ label: '分销', icon: '/static/product/tab-distribution.svg', route: '/pages/distribution/index' },
				{ label: '我的', icon: '/static/product/tab-profile.svg', route: '/pages/profile/index' }
			]
		}
	},
	computed: {
		currentCategory() {
			return this.categories[this.activeCategory] || null
		},
		subCategories() {
			const children = (this.currentCategory && this.currentCategory.children) || []
			if (!children.length) return []
			return [{ id: 0, name: '全部', image: this.currentCategory.image || '' }].concat(children)
		}
	},
	onLoad() {
		this.loadCategories()
	},
	methods: {
		async loadCategories() {
			try {
				const data = await goodsApi.categories()
				const list = data.list || []
				// 侧栏只展示一级；「全部」放最前
				const tops = list.filter(item => Number(item.pid || 0) === 0)
				const hasAll = tops.some(item => item.name === '全部')
				this.categories = hasAll
					? tops
					: [{ id: 0, name: '全部', image: '', children: [] }].concat(tops)
			} catch (e) {
				this.categories = [{ id: 0, name: '全部', image: '', children: [] }]
			}
			this.activeCategory = 0
			this.activeSubId = 0
			this.loadGoods()
		},
		async loadGoods() {
			const keyword = String(this.keyword || '').trim()
			const category = this.currentCategory
			let categoryId = 0
			// 有关键词时跨分类搜索，避免侧栏分类把结果滤空
			if (!keyword) {
				if (this.activeSubId > 0) {
					categoryId = this.activeSubId
				} else if (category && category.name !== '全部' && category.id) {
					categoryId = category.id
				}
			}
			try {
				const data = await goodsApi.lists({
					page: 1,
					limit: 50,
					keyword,
					category_id: categoryId
				})
				this.products = data.list || []
			} catch (e) {
				this.products = []
			}
		},
		selectCategory(index) {
			this.activeCategory = index
			this.activeSubId = 0
			this.loadGoods()
		},
		selectSubCategory(id) {
			this.activeSubId = Number(id) || 0
			this.loadGoods()
		},
		openDetail(id) {
			uni.navigateTo({ url: '/pages/product/detail?id=' + id })
		}
	}
}
</script>

<style scoped>
.page{display:flex;flex-direction:column;height:100vh;background:linear-gradient(180deg,#fffbf3 0%,#f9f9f9 38.855%);font-family:"PingFang SC","Microsoft YaHei",sans-serif}
.search-row{display:flex;align-items:center;flex-shrink:0;padding:16rpx 30rpx}
.search-box{flex:1;height:76rpx;display:flex;align-items:center;padding:0 20rpx;background:#fff;border-radius:100rpx}
.search-box image{width:36rpx;height:36rpx;margin-right:14rpx}
.search-box input{flex:1;font-size:28rpx}
.main{display:flex;flex:1;min-height:0;margin-bottom:calc(110rpx + constant(safe-area-inset-bottom));margin-bottom:calc(110rpx + env(safe-area-inset-bottom))}
.category-sidebar{width:180rpx;height:100%;background:#fff}
.category-item{box-sizing:border-box;height:100rpx;padding:30rpx 34rpx;font-size:28rpx;color:rgba(0,0,0,.65)}
.category-item.active{color:#f97316;background:rgba(249,115,22,.07);border-left:4rpx solid #f97316}
.product-list{flex:1;height:100%;padding:14rpx 20rpx 24rpx;box-sizing:border-box;scrollbar-width:none}
.product-list::-webkit-scrollbar{display:none}
.sub-categories{display:flex;flex-wrap:wrap;gap:16rpx 12rpx;margin-bottom:20rpx;padding:8rpx 4rpx 4rpx}
.sub-item{display:flex;flex-direction:column;align-items:center;width:148rpx}
.sub-icon{width:96rpx;height:96rpx;border-radius:20rpx;background:#f2f2f2}
.sub-item.active .sub-icon{box-sizing:border-box;border:3rpx solid #f97316}
.sub-name{margin-top:10rpx;max-width:140rpx;overflow:hidden;color:rgba(0,0,0,.65);font-size:22rpx;line-height:32rpx;text-align:center;white-space:nowrap;text-overflow:ellipsis}
.sub-item.active .sub-name{color:#f97316;font-weight:500}
.product-card{overflow:hidden;margin-bottom:24rpx;background:#fff;border-radius:24rpx}
.product-picture{display:block;width:100%;height:330rpx;background:#f2f2f2}
.product-info{padding:20rpx}
.product-name{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:28rpx}
.product-meta{display:flex;align-items:center;margin-top:10rpx}
.price{font-size:40rpx;font-weight:700;color:#ff6a00}
.stock{flex:none;margin-left:auto;color:rgba(0,0,0,.55);font-size:24rpx;line-height:40rpx}
.empty-state{display:flex;flex-direction:column;align-items:center;padding:70rpx 0 40rpx;color:rgba(0,0,0,.45);font-size:24rpx}
.empty-state.is-end{padding:24rpx 0 40rpx}
.empty-state image{width:304rpx;height:216rpx;opacity:.15}
.empty-state text{margin-top:20rpx}
.empty-state.is-end text{margin-top:0}
</style>
