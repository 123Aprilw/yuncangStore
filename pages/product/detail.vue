<template>
  <view class="page">
    <scroll-view scroll-y class="content" :show-scrollbar="false">
      <view class="hero" :style="{ paddingTop: heroTop }">
        <swiper v-if="carouselImages.length" class="hero-swiper" :current="activeImage" circular @change="activeImage=$event.detail.current">
          <swiper-item v-for="image in carouselImages" :key="image"><image :src="image" mode="aspectFit"/></swiper-item>
        </swiper>
        <view v-else class="hero-placeholder"/>
        <view v-if="carouselImages.length>1" class="dots"><i v-for="(_,index) in carouselImages" :key="index" :class="{active:activeImage===index}"/></view>
      </view>
      <view class="goods-card">
        <scroll-view class="thumbs" scroll-x :show-scrollbar="false"><image v-for="(image,index) in carouselImages" :key="image+index" :class="{active:activeImage===index}" :src="image" mode="aspectFill" @tap="selectImage(image,index)"/></scroll-view>
        <view class="price-row"><text class="currency">¥</text><text class="price">{{ currentPrice }}</text><text v-if="product.market_price" class="market">¥{{ product.market_price }}</text></view>
        <text class="name">{{ product.name }}</text>
        <text v-if="product.subtitle" class="subtitle">{{ product.subtitle }}</text>
        <view class="meta"><text>最小起订量: {{ minBuy }}盒</text><text>库存: {{ currentStock || 0 }}盒</text></view>
      </view>
      <view class="intro-section"><view class="intro-heading"><i/><text>产品介绍</text><i/></view><view class="rich-shell"><rich-text class="rich-content" :nodes="product.content"/></view></view>
    </scroll-view>
    <page-nav class="page-nav-overlay" title="商品详情" fallback="/pages/product/index" @layout="onNavLayout" />
    <view class="bar"><button @tap="openBuy">立即购买</button></view>
    <view v-if="showSku" class="layer"><view class="mask" @tap="showSku=false"/><view class="sheet"><text class="close" @tap="showSku=false">×</text><view class="sheet-head"><image :src="selectedSkuImage" mode="aspectFill"/><view><text class="sheet-name">{{ product.name }}</text><text class="sheet-price">¥{{ currentPrice }}</text></view></view><view class="count"><text>数量{{ minBuy > 1 ? '（起订' + minBuy + '盒）' : '' }}</text><view class="quantity-stepper"><image src="/static/product-detail/minus.svg" mode="aspectFit" @tap="decQty"/><picker mode="selector" :range="qtyLabels" :value="qtyIndex" @change="onQtyPick"><view class="qty-picker"><text>{{ quantity }}</text><text class="qty-arrow">▼</text></view></picker><image src="/static/product-detail/plus-circle.svg" mode="aspectFit" @tap="incQty"/></view></view><button @tap="buy">确定</button></view></view>
  </view>
</template>

<script>
import { goodsApi } from '@/api/index'
import { getBaseUrl } from '@/utils/request'
import PageNav from '@/components/page-nav/page-nav.vue'
import { getCapsuleLayout } from '@/utils/capsule'
export default {
  components: { PageNav },
  data() {
    return {
      navBarHeight: getCapsuleLayout().navBarHeight,
      product: { images: [], skus: [], price: '0.00', min_buy: 1 },
      selectedSku: null,
      quantity: 1,
      showSku: false,
      activeImage: 0
    }
  },
  computed: {
    // 与订单页同高导航 + 与主图保留间距
    heroTop() {
      return (this.navBarHeight + uni.upx2px(16)) + 'px'
    },
    minBuy() {
      return Math.max(1, Number(this.product.min_buy) || 1)
    },
    // 按起订量生成可选数量：20、40、60…
    qtyOptions() {
      const step = this.minBuy
      const stock = Number(this.currentStock) || 0
      const maxByStock = stock > 0 ? Math.floor(stock / step) * step : step * 50
      const max = Math.max(step, maxByStock)
      const list = []
      for (let n = step; n <= max; n += step) {
        list.push(n)
        if (list.length >= 50) break
      }
      return list.length ? list : [step]
    },
    qtyLabels() {
      return this.qtyOptions.map(n => n + '盒')
    },
    qtyIndex() {
      const i = this.qtyOptions.indexOf(this.quantity)
      return i >= 0 ? i : 0
    },
    carouselItems() {
      const images = this.product.images
      const list = Array.isArray(images) ? images.filter(Boolean) : (images ? String(images).split(',').filter(Boolean) : [])
      return list.length
        ? list.map(item => typeof item === 'string' ? { url: item, sku_id: null } : item)
        : (this.product.icon ? [{ url: this.product.icon, sku_id: null }] : [{ url: '/static/common/product-placeholder.png', sku_id: null }])
    },
    carouselImages() {
      return this.carouselItems.map(item => item.url)
    },
    selectedSkuImage() {
      const selectedId = this.selectedSku && this.selectedSku.id
      const mapped = this.carouselItems.find(item => Number(item.sku_id) === Number(selectedId))
      return (mapped && mapped.url) || (this.selectedSku && this.selectedSku.image) || this.product.icon
    },
    currentPrice() {
      return this.selectedSku && this.selectedSku.price ? this.selectedSku.price : this.product.price
    },
    currentStock() {
      return this.product.stock
    }
  },
  onLoad(o) {
    this.navBarHeight = getCapsuleLayout(true).navBarHeight
    this.load(o.id)
  },
  methods: {
    onNavLayout(layout) {
      if (layout && layout.navBarHeight) this.navBarHeight = layout.navBarHeight
    },
    async load(id) {
      try {
        const data = await goodsApi.detail(id)
        this.product = data || this.product
        this.product.content = this.normalizeContent(this.product.content)
        this.selectSku(this.product.skus[0] || null)
        this.quantity = this.alignQty(this.minBuy)
      } catch (e) {
        uni.showToast({ title: '商品加载失败', icon: 'none' })
      }
    },
    // 数量对齐为起订量的整数倍
    alignQty(qty) {
      const step = this.minBuy
      const n = Math.max(step, Number(qty) || step)
      return Math.round(n / step) * step || step
    },
    openBuy() {
      this.quantity = this.alignQty(this.quantity)
      if (!this.qtyOptions.includes(this.quantity)) {
        this.quantity = this.qtyOptions[0] || this.minBuy
      }
      this.showSku = true
    },
    onQtyPick(e) {
      const i = Number(e.detail.value)
      this.quantity = this.qtyOptions[i] || this.minBuy
    },
    decQty() {
      if (this.quantity <= this.minBuy) {
        uni.showToast({ title: '起订量最少' + this.minBuy + '盒', icon: 'none' })
        return
      }
      this.quantity = Math.max(this.minBuy, this.quantity - this.minBuy)
    },
    incQty() {
      const next = this.quantity + this.minBuy
      const stock = Number(this.currentStock) || 0
      if (stock > 0 && next > stock) {
        uni.showToast({ title: '库存不足', icon: 'none' })
        return
      }
      this.quantity = next
    },
    selectImage(image, index) {
      this.activeImage = index
      const skus = this.product.skus || []
      if (!skus.length) return
      const skuId = this.carouselItems[index] && this.carouselItems[index].sku_id
      this.selectedSku = skus.find(item => Number(item.id) === Number(skuId)) || skus[index % skus.length]
    },
    selectSku(sku) {
      this.selectedSku = sku
      if (!sku) return
      const imageIndex = this.carouselItems.findIndex(item => Number(item.sku_id) === Number(sku.id))
      if (imageIndex >= 0) this.activeImage = imageIndex
    },
    normalizeContent(content) {
      return String(content || '')
        .replace(/(src=["'])\/(?!\/)/gi, '$1' + getBaseUrl() + '/')
        .replace(/<strong([^>]*)>/gi, '<strong$1 style="color:#1f2937;font-size:18px;line-height:1.6;">')
        .replace(/<p([^>]*)>/gi, '<p$1 style="margin:0 0 10px;color:#4b5563;font-size:14px;line-height:1.75;">')
        .replace(/<img\b(?![^>]*\bstyle=)([^>]*)>/gi, '<img$1 style="display:block;width:100%;height:auto;margin:16px 0 8px;border-radius:12px;">')
    },
    buy() {
      if (!this.selectedSku && this.product.skus.length) {
        uni.showToast({ title: '请选择规格', icon: 'none' })
        return
      }
      const qty = this.alignQty(this.quantity)
      this.quantity = qty
      const items = encodeURIComponent(JSON.stringify([{
        goods_id: this.product.id,
        // 已取消多规格库存逻辑，统一按商品主库存下单
        sku_id: 0,
        qty
      }]))
      uni.navigateTo({ url: '/pages/delivery/confirm?items=' + items })
    }
  }
}
</script>

<style scoped>
.page{position:relative;height:100vh;overflow:hidden;background:#f5f5f5;font-family:"PingFang SC",sans-serif}.content{height:calc(100vh - 138rpx)}.hero{position:relative;box-sizing:border-box;background:#fff}.hero-swiper,.hero-placeholder{position:relative;width:100%;height:750rpx;background:#fff}.hero-swiper image{width:100%;height:100%}.dots{position:absolute;bottom:12rpx;left:50%;display:flex;gap:8rpx;transform:translateX(-50%)}.dots i{width:10rpx;height:10rpx;background:rgba(0,0,0,.22);border-radius:10rpx}.dots i.active{width:34rpx;background:#f97316}.goods-card{position:relative;z-index:1;box-sizing:border-box;padding:40rpx 30rpx 0;background:#fff;border-radius:24rpx 24rpx 0 0}.thumbs{width:100%;height:96rpx;white-space:nowrap}.thumbs image{width:96rpx;height:96rpx;margin-right:14rpx;border-radius:20rpx}.thumbs image.active{box-sizing:border-box;border:3rpx solid #f97316}.price-row{display:flex;align-items:baseline;height:66rpx;margin-top:26rpx;color:#f97316}.currency{font-size:28rpx}.price{margin-left:4rpx;font-family:DIN,"Arial",sans-serif;font-size:52rpx;font-weight:500}.market{margin-left:24rpx;color:#414755;font-size:24rpx;text-decoration:line-through}.name{display:block;min-height:86rpx;margin-top:18rpx;color:rgba(0,0,0,.85);font-size:32rpx;line-height:43rpx}.meta{display:flex;justify-content:space-between;margin-top:16rpx;padding:16rpx 0;color:#3f4a36;font-size:26rpx}.selection{display:flex;align-items:center;height:88rpx;border-top:2rpx solid #eee;color:rgba(0,0,0,.85);font-size:28rpx}.selection-label{color:rgba(0,0,0,.45)}.selection-value{margin-left:24rpx}.arrow{margin-left:auto;color:#999;font-size:44rpx}.intro{height:112rpx;margin-top:20rpx;line-height:112rpx;text-align:center;background:#fff;font-size:32rpx;font-weight:500}.rich-content{display:block;background:#fff}.page-nav-overlay{position:absolute;top:0;left:0;z-index:20;width:100%}.bar{position:absolute;right:0;bottom:0;left:0;z-index:20;box-sizing:border-box;height:138rpx;padding:20rpx 30rpx;background:#fff;border-top:2rpx solid rgba(0,0,0,.06)}.bar button,.sheet button{height:96rpx;color:#fff;font-size:32rpx;font-weight:500;background:#f97316;border:0;border-radius:100rpx}.bar button:after,.sheet button:after{border:0}.layer{position:fixed;top:0;right:0;bottom:0;left:0;z-index:999;display:flex;flex-direction:column;justify-content:flex-end}.mask{position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.45)}.sheet{position:relative;z-index:1;box-sizing:border-box;padding:40rpx 30rpx calc(40rpx + env(safe-area-inset-bottom));background:#fff;border-radius:32rpx 32rpx 0 0}.close{float:right;color:#777;font-size:48rpx}.sheet-name{display:block;width:82%;font-size:30rpx;line-height:42rpx}.sheet-price{display:block;margin:16rpx 0;color:#f97316;font-size:40rpx}.sku-list{display:flex;flex-wrap:wrap;gap:16rpx}.sku{padding:12rpx 20rpx;background:#f5f5f5;border-radius:30rpx}.sku.active{color:#f97316;border:1rpx solid #f97316;background:#fff4ed}.count{display:flex;justify-content:space-between;margin:32rpx 0}.count view{display:flex;gap:30rpx}
/* Figma-style product introduction card */
.intro-card{margin:20rpx 24rpx 28rpx;padding:28rpx 20rpx 24rpx;overflow:hidden;background:#fff;border-radius:28rpx}.intro-title{display:block;margin-bottom:22rpx;color:#111;font-size:30rpx;font-weight:600;line-height:42rpx;text-align:center}.rich-content{overflow:hidden;border-radius:20rpx;background:#fafafa}.selection-arrow{margin-left:auto;color:#999;font-size:42rpx;font-weight:300}.sheet-head{display:flex;align-items:center;min-height:128rpx;margin-bottom:26rpx}.sheet-head image{width:128rpx;height:128rpx;margin-right:22rpx;border-radius:16rpx;background:#f5f5f5}.sheet-head>view{flex:1}.sheet-name{width:auto}.sheet-price{margin:12rpx 0 0}.sku-label{display:block;margin-bottom:18rpx;color:#333;font-size:28rpx;font-weight:500}.sku-list{margin-bottom:4rpx}.sku{min-width:112rpx;padding:14rpx 20rpx;box-sizing:border-box;text-align:center;border-radius:12rpx}.count{align-items:center;padding-top:28rpx;border-top:1rpx solid #eee}.count view{align-items:center;gap:0;border:1rpx solid #eee;border-radius:8rpx;overflow:hidden}.count view text{display:flex;align-items:center;justify-content:center;width:58rpx;height:52rpx;border-right:1rpx solid #eee}.count view text:last-child{border-right:0}.intro,.rich-content{display:none}
.intro-card .rich-content{display:block}
/* Node 38:11265: 44px status bar, 54px navigation and a 93px purchase area. */
.content{height:calc(100vh - 186rpx)}.hero-swiper image{object-fit:contain}.intro{display:block;height:132rpx;margin-top:12rpx;line-height:132rpx;text-align:center;background:#fff;font-size:32rpx;font-weight:500}.rich-content{display:block;background:#fff;border-radius:0}.bar{height:186rpx;padding:24rpx 30rpx 0}.bar button{height:96rpx}.intro-card{display:none}
.intro-section{margin:20rpx 0 32rpx;padding:28rpx 30rpx 24rpx;background:linear-gradient(180deg,#fff 0%,#fffaf4 100%);border:1rpx solid rgba(249,115,22,.08);border-right:0;border-left:0;border-radius:0;box-shadow:0 10rpx 26rpx rgba(80,45,12,.06)}.intro-heading{display:flex;align-items:center;justify-content:center;gap:16rpx;margin-bottom:26rpx;color:#1f2937;font-size:30rpx;font-weight:600;letter-spacing:2rpx}.intro-heading i{width:42rpx;height:2rpx;background:linear-gradient(90deg,transparent,#f97316)}.intro-heading i:last-child{transform:rotate(180deg)}.rich-shell{padding:22rpx 20rpx 8rpx;background:#fff;border-radius:20rpx}.intro-section .rich-content{display:block;overflow:visible;background:transparent;border-radius:0}
.subtitle{display:block;margin-top:10rpx;color:#727786;font-size:26rpx;line-height:38rpx}
.quantity-stepper{display:flex;align-items:center;gap:30rpx!important;border:0!important;border-radius:0!important;overflow:visible!important}.quantity-stepper image{width:44rpx;height:44rpx}.quantity-stepper text{display:block!important;width:auto!important;height:auto!important;color:#000;font-size:32rpx;font-weight:500;line-height:44rpx;border:0!important}.qty-picker{display:flex;align-items:center;gap:8rpx;min-width:80rpx;justify-content:center}.qty-picker text{display:block!important;width:auto!important;height:auto!important;color:#000;font-size:32rpx;font-weight:500;line-height:44rpx;border:0!important}.qty-arrow{color:#999!important;font-size:20rpx!important;line-height:1!important}
.bar button,.sheet button{display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:0;line-height:1}
</style>
