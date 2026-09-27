<template>
 <view class="page">
  <common-header class="signature-header" title="签署分销协议" fallback="/pages/distribution/index"/>
  <view class="hint"><text>请横屏手写签名</text></view>
  <view id="canvasWrap" class="canvas-wrap">
   <view class="canvas-guide"><view class="watermark"><view>签</view><view>字</view><view>范</view><view>围</view></view></view>
   <canvas id="signatureCanvas" canvas-id="signatureCanvas" class="signature-canvas" :disable-scroll="true" @touchstart.stop.prevent="touchStart" @touchmove.stop.prevent="touchMove" @touchend.stop.prevent="touchEnd" @touchcancel.stop.prevent="touchEnd"></canvas>
  </view>
  <view class="side"><text v-for="(char,index) in sideText" :key="index">{{char}}</text></view>
  <view class="buttons"><button @tap="clearCanvas">清空</button><button @tap="saveSignature">保存</button></view>
 </view>
</template>

<style scoped>
.canvas-guide{z-index:0!important;pointer-events:none}.signature-canvas{z-index:1!important}
</style>

<script>
import CommonHeader from './header.vue'
import { distributionApi } from '@/api/index'
import { getUploadUrl, getCurrentRoute, isActiveRoute } from '@/utils/request'
import { navigateBack } from '@/utils/nav'
export default {
 components: { CommonHeader },
 data() { return { ctx: null, canvasRect: null, drawing: false, lastPoint: null, hasInk: false, signatureType: 'distribution', sideText: '请字迹清晰，尽量写满签字区'.split('') } },
 onLoad(options) {
  const type = options.type || 'distribution'
  if (type !== 'distribution') {
   uni.showToast({ title: '该协议无需签署', icon: 'none' })
   setTimeout(() => navigateBack('/pages/profile/agreement-detail?type=' + type), 400)
   return
  }
  this.signatureType = 'distribution'
 },
 onReady() { this.$nextTick(() => this.initCanvas()) },
 onResize() { this.$nextTick(() => this.initCanvas()) },
 methods: {
  initCanvas() {
   uni.createSelectorQuery().in(this).select('#signatureCanvas').boundingClientRect(rect => {
    this.canvasRect = rect
    this.ctx = uni.createCanvasContext('signatureCanvas', this)
    this.ctx.setStrokeStyle('#111111')
    this.ctx.setLineWidth(3)
    this.ctx.setLineCap('round')
    this.ctx.setLineJoin('round')
   }).exec()
  },
  pointFromEvent(event) {
   const touch = event.touches[0] || event.changedTouches[0]
   if (!touch) return null
   if (typeof touch.x === 'number' && typeof touch.y === 'number') return { x: touch.x, y: touch.y }
   const rect = this.canvasRect || { left: 0, top: 0 }
   return { x: (touch.clientX || touch.pageX) - rect.left, y: (touch.clientY || touch.pageY) - rect.top }
  },
  touchStart(event) {
   const point = this.pointFromEvent(event)
   if (!point) return
   this.drawing = true
   this.lastPoint = point
  },
  touchMove(event) {
   if (!this.drawing || !this.ctx) return
   const point = this.pointFromEvent(event)
   if (!point || !this.lastPoint) return
   this.ctx.beginPath()
   this.ctx.moveTo(this.lastPoint.x, this.lastPoint.y)
   this.ctx.lineTo(point.x, point.y)
   this.ctx.stroke()
   this.ctx.draw(true)
   this.lastPoint = point
   this.hasInk = true
  },
  touchEnd(event) {
   if (this.drawing && !this.hasInk && this.ctx && this.lastPoint) {
    const point = this.pointFromEvent(event) || this.lastPoint
    this.ctx.beginPath()
    this.ctx.moveTo(point.x, point.y)
    this.ctx.lineTo(point.x + 0.1, point.y + 0.1)
    this.ctx.stroke()
    this.ctx.draw(true)
    this.hasInk = true
   }
   this.drawing = false
   this.lastPoint = null
  },
  clearCanvas() {
   if (!this.ctx || !this.canvasRect) return
   this.ctx.clearRect(0, 0, this.canvasRect.width, this.canvasRect.height)
   this.ctx.draw()
   this.hasInk = false
  },
  uploadSignature(filePath) {
   return new Promise((resolve, reject) => {
    uni.uploadFile({
     url: getUploadUrl(),
     filePath,
     name: 'file',
     header: { token: uni.getStorageSync('token') || '' },
     success: response => {
      try {
       const body = JSON.parse(response.data || '{}')
       const path = body && body.code === 1 && body.data && (body.data.fullurl || body.data.url)
       if (path) resolve(path)
       else reject(new Error((body && body.msg) || '上传失败'))
      } catch (error) { reject(error) }
     },
     fail: reject
    })
   })
  },
  async saveSignature() {
   if (!this.hasInk) { uni.showToast({ title: '请先完成签名', icon: 'none' }); return }
   const startRoute = getCurrentRoute()
   const pixelRatio = uni.getSystemInfoSync().pixelRatio || 1
   uni.canvasToTempFilePath({
    canvasId: 'signatureCanvas',
    destWidth: Math.round(this.canvasRect.width * pixelRatio),
    destHeight: Math.round(this.canvasRect.height * pixelRatio),
    fileType: 'png',
    quality: 1,
    success: async result => {
     try {
      const signImage = await this.uploadSignature(result.tempFilePath)
      await distributionApi.signAgreement(signImage)
      if (!isActiveRoute(startRoute)) return
      uni.setStorageSync('agreementSignature_distribution', signImage)
      const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
      if (eventChannel) eventChannel.emit('signatureSaved', { path: signImage })
      uni.showToast({ title: '签名已保存', icon: 'success' })
      setTimeout(() => {
       if (isActiveRoute(startRoute)) navigateBack('/pages/distribution/index')
      }, 500)
     } catch (error) {
      if (!isActiveRoute(startRoute)) return
      uni.showToast({ title: (error && error.message) || '签署失败，请重试', icon: 'none' })
      return
     }
    },
    fail: () => {
     if (isActiveRoute(startRoute)) uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
   }, this)
  }
 }
}
</script>

<style scoped>
.page{position:relative;height:100vh;overflow:hidden;background:#fff;font-family:"PingFang SC",sans-serif;touch-action:none}.hint{display:flex;flex-direction:column;align-items:center;margin-top:34rpx;color:#444;font-size:30rpx}.hint small{margin-top:8rpx;color:#777;font-size:26rpx}.canvas-wrap{position:absolute;top:420rpx;left:96rpx;box-sizing:border-box;width:552rpx;height:990rpx;overflow:hidden;border:4rpx dashed #ddd}.signature-canvas{position:absolute;top:0;left:0;z-index:1;width:100%;height:100%;background:transparent}.canvas-guide{position:absolute;top:0;right:0;bottom:0;left:0;z-index:2;pointer-events:none}.watermark{position:absolute;top:50%;left:50%;color:#f0f0f0;font-size:86rpx;line-height:1.15;text-align:center;transform:translate(-50%,-50%)}.side{position:absolute;top:842rpx;right:54rpx;display:flex;width:30rpx;flex-direction:column;align-items:center;color:#111;font-size:24rpx;line-height:26rpx}.side text{display:block;height:26rpx;white-space:nowrap}.buttons{position:absolute;bottom:34rpx;left:32rpx;z-index:3;display:flex;gap:32rpx}.buttons button{width:80rpx;height:160rpx;margin:0;padding:0;color:#fff;font-size:28rpx;line-height:160rpx;background:#e83237;border:0;border-radius:10rpx}.buttons button:after{border:0}
@media (orientation:landscape){.signature-header{display:none}.hint{position:absolute;top:18rpx;left:30rpx;margin:0;align-items:flex-start}.canvas-wrap{top:90rpx;bottom:30rpx;left:180rpx;width:calc(100% - 380rpx);height:auto}.watermark{display:flex;font-size:64rpx;line-height:1.2}.side{top:110rpx;right:130rpx;width:34rpx}.buttons{right:24rpx;bottom:30rpx;left:auto;flex-direction:column}.buttons button{width:92rpx;height:92rpx;line-height:92rpx}}
</style>
