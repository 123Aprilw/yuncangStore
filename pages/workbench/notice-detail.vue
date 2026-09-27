<template>
  <view class="page">
    <page-nav title="公告详情" fallback="/pages/workbench/warehouse-opened" />
    <view v-if="notice" class="card"><text class="title">{{ notice.title || '系统公告' }}</text><text class="time">系统公告</text><view class="line"/><rich-text v-if="notice.content" class="content" :nodes="notice.content"/><text v-else class="content">暂无公告内容</text></view>
    <view v-else class="empty">暂无公告内容</view>
  </view>
</template>

<script>
import PageNav from '@/components/page-nav/page-nav.vue'

export default {
  components: { PageNav },
  data(){return{notice:null}},
  onLoad(){this.notice=uni.getStorageSync('workbench_notice')||null}
}
</script>

<style scoped>
.page{min-height:100vh;color:#1f2937;background:#f8f8f8}.card{margin:24rpx 30rpx;padding:32rpx;background:#fff;border-radius:24rpx}.title{display:block;font-size:34rpx;font-weight:600;line-height:50rpx}.time{display:block;margin-top:12rpx;color:#9ca3af;font-size:24rpx}.line{height:2rpx;margin:28rpx 0;background:#f1f1f1}.content{display:block;color:#4b5563;font-size:28rpx;line-height:48rpx;word-break:break-word}.empty{padding-top:220rpx;color:#9ca3af;font-size:28rpx;text-align:center}
</style>
