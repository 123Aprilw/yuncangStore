<template>
  <view class="page">
    <page-nav title="消息详情" fallback="/pages/profile/messages" />
    <view v-if="message" class="detail-card">
      <view class="detail-head">
        <image :src="iconFor(message.type)" mode="aspectFit" />
        <view><text class="message-title">{{ message.title }}</text><text class="message-time">{{ formatTime(message.createtime) }}</text></view>
      </view>
      <view class="divider" />
      <text class="message-content">{{ message.content || '暂无消息内容' }}</text>
    </view>
    <view v-else-if="!loading" class="empty">消息不存在</view>
  </view>
</template>

<script>
import { profileApi } from '@/api/index'
import PageNav from '@/components/page-nav/page-nav.vue'

export default {
  components: { PageNav },
  data(){ return { id:0, message:null, loading:true } },
  onLoad(options){ this.id=Number(options.id||0); this.load() },
  methods:{
    async load(){ if(!this.id){this.loading=false;return} try{this.message=await profileApi.messageDetail(this.id)}catch(e){}finally{this.loading=false} },
    iconFor(type){const icons={order:'/static/profile/msg-order.svg',review:'/static/profile/msg-review.svg',stock:'/static/profile/msg-system.svg',system:'/static/profile/msg-system.svg'};return icons[type]||icons.system},
    formatTime(value){if(!value)return'';const date=new Date(Number(value)*1000);if(Number.isNaN(date.getTime()))return'';return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+' '+String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0')}
  }
}
</script>

<style scoped>
.page{min-height:100vh;background:#f8f8f8;color:#1f2937}.detail-card{margin:0 30rpx 24rpx;padding:30rpx;background:#fff;border-radius:24rpx}.detail-head{display:flex;align-items:center}.detail-head image{width:64rpx;height:64rpx;margin-right:20rpx}.detail-head view{display:flex;flex:1;flex-direction:column;min-width:0}.message-title{font-size:32rpx;font-weight:600;line-height:44rpx}.message-time{margin-top:8rpx;color:#9ca3af;font-size:24rpx;line-height:34rpx}.divider{height:2rpx;margin:28rpx 0;background:#f0f0f0}.message-content{display:block;color:#4b5563;font-size:28rpx;line-height:48rpx;white-space:pre-wrap;word-break:break-all}.empty{padding-top:220rpx;color:#9ca3af;font-size:28rpx;text-align:center}
</style>
