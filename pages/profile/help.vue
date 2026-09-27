<template>
  <view class="page">
    <page-nav title="帮助中心" transparent fallback="/pages/profile/index" />

    <view v-if="!loading" class="body">
      <view v-if="list.length" class="card">
        <view class="section-head">
          <view class="accent"/>
          <text class="heading">联系客服</text>
        </view>
        <view class="cs-list" :class="layoutClass">
          <view
            v-for="(item, index) in list"
            :key="'cs-' + item.id"
            class="cs-item"
          >
            <text class="cs-title">{{ item.title || '官方客服' }}</text>

            <view v-if="item.phone" class="phone-block" @tap.stop="call(item.phone)">
              <text class="phone">{{ item.phone }}</text>
              <view class="call">
                <text class="call-icon">☎</text>
                <text>拨打</text>
              </view>
            </view>

            <view v-if="item.qrcode" class="qr-block" @tap="preview(index)">
              <view class="qr-frame">
                <image :src="item.qrcode" mode="aspectFit"/>
              </view>
              <text class="tip">点击放大查看</text>
            </view>
          </view>
        </view>
      </view>

      <view v-else class="card empty-card">
        <text class="empty">暂无客服信息</text>
      </view>
    </view>
  </view>
</template>
<script>
import { helpApi } from '@/api/index'
import PageNav from '@/components/page-nav/page-nav.vue'

export default {
  components: { PageNav },
  data() {
    return {
      list: [],
      loading: true
    }
  },
  computed: {
    layoutClass() {
      const n = this.list.length
      if (n <= 1) return 'single'
      if (n === 2) return 'pair'
      return 'grid'
    }
  },
  onLoad() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const data = await helpApi.info()
        this.list = Array.isArray(data && data.list) ? data.list : []
      } catch (e) {
        this.list = []
      } finally {
        this.loading = false
      }
    },
    call(phone) {
      if (phone) uni.makePhoneCall({ phoneNumber: String(phone) })
    },
    preview(index) {
      const urls = this.list.map((item) => item.qrcode).filter(Boolean)
      if (!urls.length) return
      const current = this.list[index] && this.list[index].qrcode
      uni.previewImage({
        current: current || urls[0],
        urls
      })
    }
  }
}
</script>
<style scoped>
.page {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffedd3 0%, #f5f5f5 28%);
  color: #1f2937;
  font-family: "PingFang SC", sans-serif;
}
.body {
  padding: 8rpx 30rpx 48rpx;
}
.card {
  margin-bottom: 24rpx;
  padding: 32rpx 28rpx 12rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 140, 60, 0.06);
}
.section-head {
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  padding-bottom: 20rpx;
}
.accent {
  width: 8rpx;
  height: 28rpx;
  margin-right: 14rpx;
  background: linear-gradient(180deg, #fb3b19, #f97316);
  border-radius: 8rpx;
}
.heading {
  font-size: 32rpx;
  font-weight: 600;
  color: #111827;
}
.cs-list {
  display: flex;
  flex-wrap: wrap;
  padding-bottom: 20rpx;
}
.cs-list.single {
  justify-content: center;
}
.cs-list.pair,
.cs-list.grid {
  justify-content: space-between;
}
.cs-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  background: linear-gradient(180deg, #fffaf5, #fff);
  border: 2rpx solid #ffe8d6;
  border-radius: 20rpx;
}
.cs-list.single .cs-item {
  width: 100%;
  padding: 28rpx 24rpx 20rpx;
}
.cs-list.pair .cs-item,
.cs-list.grid .cs-item {
  width: 48%;
  margin-bottom: 20rpx;
  padding: 20rpx 12rpx 16rpx;
}
.cs-title {
  max-width: 100%;
  margin-bottom: 16rpx;
  padding: 0 4rpx;
  overflow: hidden;
  color: #6b7280;
  font-size: 26rpx;
  line-height: 36rpx;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.phone-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 16rpx;
}
.phone {
  max-width: 100%;
  margin-bottom: 12rpx;
  padding: 0 4rpx;
  overflow: hidden;
  color: #111827;
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
  line-height: 40rpx;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cs-list.single .phone {
  font-size: 34rpx;
}
.call {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  padding: 0 24rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 500;
  background: linear-gradient(90deg, #fb3b19, #f97316);
  border-radius: 56rpx;
  box-shadow: 0 8rpx 16rpx rgba(249, 115, 22, 0.28);
}
.cs-list.single .call {
  height: 60rpx;
  padding: 0 26rpx;
  font-size: 26rpx;
}
.call-icon {
  margin-right: 8rpx;
  font-size: 22rpx;
  line-height: 1;
}
.qr-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.qr-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 280rpx;
  height: 280rpx;
  padding: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: inset 0 0 0 2rpx rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}
.cs-list.pair .qr-frame,
.cs-list.grid .qr-frame {
  width: 240rpx;
  height: 240rpx;
  padding: 12rpx;
}
.qr-frame image {
  width: 100%;
  height: 100%;
}
.tip {
  margin-top: 14rpx;
  color: #c4c4c4;
  font-size: 22rpx;
  line-height: 32rpx;
}
.empty-card {
  padding: 80rpx 28rpx;
}
.empty {
  display: block;
  color: #9ca3af;
  font-size: 28rpx;
  text-align: center;
}
</style>
