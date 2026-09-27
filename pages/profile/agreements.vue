<template>
  <view class="page">
    <common-header title="我的协议"/>
    <view v-for="item in agreements" :key="item.type" class="card">
      <template v-if="!needSign(item) || item.signed || !canSign(item)">
        <view class="body">
          <view class="left">
            <b class="head-title">《{{ typeTitle(item) }}》</b>
            <text class="foot-title">{{ item.title || typeTitle(item) }}</text>
          </view>
          <view class="right">
            <em v-if="!needSign(item)" class="signed" style="color:#f97316;background:#fff3eb">已同意</em>
            <em v-else-if="item.sign_status === 'pending_party_a'" class="signed" style="color:#3578c8;background:#edf5ff">待甲方签名</em>
            <em v-else-if="item.signed" class="signed" style="color:#f97316;background:#fff3eb">已签署</em>
            <em v-else>待签署</em>
            <text class="foot-link" @tap="openAgreement(item.type)">查看协议 ›</text>
          </view>
          <view class="line"/>
        </view>
      </template>
      <template v-else>
        <view class="head">
          <b class="head-title">《{{ typeTitle(item) }}》</b>
          <em>待签署</em>
        </view>
        <view class="line solid"/>
        <button @tap="openAgreement(item.type)">去签署</button>
      </template>
    </view>
  </view>
</template>

<script>
import CommonHeader from './header.vue'
import { profileApi } from '@/api/index'

const TYPE_TITLE = { user: '经销协议', privacy: '隐私政策', distribution: '分销协议' }

export default {
  components: { CommonHeader },
  data() { return { agreements: [] } },
  onShow() { this.load() },
  methods: {
    needSign(item) {
      if (typeof item.need_sign === 'boolean') return item.need_sign
      return Number(item.sign_level || 0) > 0
    },
    canSign(item) {
      if (typeof item.can_sign === 'boolean') return item.can_sign
      return this.needSign(item)
    },
    typeTitle(item) {
      return item.type_text || TYPE_TITLE[item.type] || item.title || '协议'
    },
    async load() {
      try {
        const data = await profileApi.agreements()
        this.agreements = (data && data.list) ? data.list : []
      } catch (error) { this.agreements = [] }
    },
    openAgreement(type) { uni.navigateTo({ url: '/pages/profile/agreement-detail?type=' + type }) }
  }
}
</script>

<style scoped>
.page{height:100vh;background:#f9f9f9;font-family:"PingFang SC",sans-serif}
.card{box-sizing:border-box;width:690rpx;min-height:208rpx;margin:24rpx 30rpx 0;padding:28rpx 30rpx;background:#fff;border-radius:24rpx}
.body{position:relative;display:flex;align-items:stretch;justify-content:space-between;gap:24rpx;min-height:120rpx}
.left{display:flex;flex-direction:column;justify-content:space-between;flex:0 1 auto;max-width:calc(100% - 180rpx);min-width:0}
.head-title{display:block;font-size:36rpx;font-weight:400;line-height:50rpx}
.foot-title{display:block;box-sizing:border-box;width:0;min-width:100%;overflow:hidden;color:#1b1c1c;font-size:28rpx;line-height:40rpx;text-overflow:ellipsis;white-space:nowrap}
.right{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end;flex:none}
.head{display:flex;align-items:center;justify-content:space-between}
.card em{padding:8rpx 14rpx;color:#3578c8;font-size:24rpx;font-style:normal;line-height:34rpx;background:#edf5ff}
.card em.signed{color:#f97316;background:#fff3eb}
.line{position:absolute;left:0;right:0;top:50%;height:2rpx;margin-top:-1rpx;background:#ddd;pointer-events:none}
.line.solid{position:static;margin:24rpx 0}
.foot-link{color:#f15d30;font-size:26rpx;line-height:40rpx}
.card button{width:630rpx;height:78rpx;margin:0;padding:0;color:#fff;font-size:28rpx;line-height:78rpx;background:#ff7117;border:0;border-radius:100rpx}
.card button:after{border:0}
</style>
