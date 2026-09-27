<template>
  <view class="page">
    <common-header :title="pageTitle" :fallback="fallback"/>
    <scroll-view class="scroll" scroll-y>
      <view class="doc-head">
        <image src="/static/profile/agreement-doc.svg"/>
        <view class="doc-meta">
          <view class="doc-title"><text>《{{ agreement.title || pageTitle }}》</text></view>
          <view class="doc-status">
            <em v-if="needSign" :class="{ signed: signed }" :style="statusEmStyle">{{ statusLabel }}</em>
            <text v-if="statusTime">{{ statusTime }}</text>
          </view>
        </view>
      </view>
      <view class="article"><rich-text :nodes="agreement.content"/></view>
      <view v-if="needSign && signed && signaturePath" class="signer"><text>签署人</text><image :src="signaturePath" mode="aspectFit"/></view>
      <view v-else-if="needSign && agreement.sign_status === 'pending_party_a'" class="signed-tip"><text>您已签署，等待平台甲方签名</text></view>
      <view v-else-if="needSign && signed" class="signed-tip"><text>协议已完成签署</text></view>
      <view v-if="showSignAction" class="agree" @tap="checked=!checked">
        <view :class="{checked}"><image v-if="checked" src="/static/profile/check-small.svg"/></view>
        <text>我已阅读并同意以上协议条款</text>
      </view>
      <button v-if="showSignAction" :class="['sign',{enabled:checked}]" @tap="sign">确认签署</button>
      <view v-else class="footer-space"/>
    </scroll-view>
  </view>
</template>

<script>
import CommonHeader from './header.vue'
import { profileApi } from '@/api/index'

const TYPE_TITLE = { user: '经销协议', privacy: '隐私政策', distribution: '分销协议' }
const VIEW_ONLY = ['user', 'privacy']

export default {
  components: { CommonHeader },
  data() {
    return {
      type: 'user',
      signed: false,
      checked: false,
      signaturePath: '',
      agreement: { title: '', content: '' },
      fallback: '/pages/profile/agreements'
    }
  },
  computed: {
    needSign() {
      if (typeof this.agreement.need_sign === 'boolean') {
        return this.agreement.need_sign
      }
      return !VIEW_ONLY.includes(this.type)
    },
    canSign() {
      if (typeof this.agreement.can_sign === 'boolean') {
        return this.agreement.can_sign
      }
      return this.needSign
    },
    showSignAction() {
      return this.needSign && !this.signed && this.canSign
    },
    statusLabel() {
      if (!this.needSign) return ''
      if (this.agreement.sign_status === 'pending_party_a') return '待甲方签名'
      if (this.signed) return '已签署'
      return '未签署'
    },
    statusEmStyle() {
      if (this.agreement.sign_status === 'pending_party_a') {
        return { color: '#3578c8', background: '#edf5ff' }
      }
      if (this.signed) {
        return { color: '#f97316', background: '#fff3eb' }
      }
      return {}
    },
    pageTitle() {
      return this.agreement.type_text || this.agreement.title || TYPE_TITLE[this.type] || '协议详情'
    },
    statusTime() {
      if (this.needSign && this.signed && this.agreement.signed_at) {
        return this.agreement.signed_at
      }
      return this.agreement.published_at || ''
    }
  },
  onLoad(options) {
    this.type = options.type || 'user'
    if (VIEW_ONLY.includes(this.type)) {
      this.fallback = '/pages/index/index'
    } else if (this.type === 'distribution') {
      this.fallback = '/pages/distribution/index'
    }
    this.loadAgreement()
  },
  onShow() {
    if (this.type === 'distribution') this.loadAgreement()
  },
  methods: {
    async loadAgreement() {
      try {
        const agreement = await profileApi.agreement(this.type)
        this.agreement = agreement || {}
        this.signed = !!this.agreement.signed
        this.signaturePath = uni.getStorageSync('agreementSignature_' + this.type) || this.agreement.sign_image || ''
      } catch (error) {
        uni.showToast({ title: '协议加载失败', icon: 'none' })
      }
    },
    sign() {
      if (!this.checked || !this.showSignAction) return
      uni.navigateTo({
        url: '/pages/profile/signature?type=distribution',
        events: {
          signatureSaved: ({ path }) => {
            this.signaturePath = path
            this.signed = true
            this.checked = false
            this.agreement.signed = true
            this.agreement.sign_status = 'pending_party_a'
            this.agreement.need_sign = true
            this.agreement.can_sign = false
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page{height:100vh;overflow:hidden;background:#f9f9f9;font-family:"PingFang SC",sans-serif}
.scroll{position:absolute;top:196rpx;bottom:0;width:100%}
.doc-head{display:flex;align-items:center;box-sizing:border-box;width:690rpx;min-height:158rpx;margin:24rpx 30rpx 0;padding:32rpx;background:#fff;border-radius:16rpx}
.doc-head>image{width:80rpx;height:80rpx}
.doc-meta{flex:1;min-width:0;margin-left:24rpx}
.doc-title{display:flex;align-items:center;justify-content:space-between;height:48rpx;color:#1b1c1c;font-size:36rpx;line-height:48rpx}
.doc-title text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.doc-status{display:flex;align-items:center;gap:16rpx;margin-top:8rpx}
.doc-status em{padding:8rpx 16rpx;color:#2e4c7d;font-size:20rpx;font-style:normal;line-height:24rpx;background:#e8f0f5;border-radius:4rpx}
.doc-status em.signed{color:#f97316;background:#fff3eb}
.doc-status text{color:#414754;font-size:24rpx;line-height:32rpx}
.article{box-sizing:border-box;width:690rpx;margin:32rpx 30rpx 40rpx;padding:38rpx 40rpx 40rpx;color:#414754;font-size:26rpx;line-height:42rpx;background:#fff;border-radius:16rpx}
.article :deep(p){margin:0 0 30rpx}
.article :deep(p:last-child){margin-bottom:0}
.agree{display:flex;align-items:center;box-sizing:border-box;height:56rpx;margin:36rpx 30rpx 0;padding:16rpx;color:#1b1c1c;font-size:26rpx}
.agree>view{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:40rpx;height:40rpx;margin-right:24rpx;border:4rpx solid #717786;border-radius:4rpx}
.agree>view.checked{background:linear-gradient(90deg,#fb3b19,#f97316);border:0;border-radius:10rpx}
.agree image{width:48rpx;height:48rpx}
.sign{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:690rpx;height:96rpx;margin:32rpx 30rpx;padding:0;color:#fff;font-size:28rpx;line-height:1;background:linear-gradient(90deg,#fb3b19,#f97316);border:0;border-radius:100rpx;opacity:.5}
.sign.enabled{opacity:1}
.sign:after{border:0}
.signer{display:flex;flex-direction:column;box-sizing:border-box;width:690rpx;margin:28rpx 30rpx 36rpx;padding:30rpx 40rpx;background:#fff;border-radius:16rpx}
.signer>text{color:#1b1c1c;font-size:28rpx;font-weight:500}
.signer>image{width:100%;height:150rpx;margin-top:18rpx;background:#fafafa;border-radius:10rpx}
.signed-tip{box-sizing:border-box;width:690rpx;margin:28rpx 30rpx 0;padding:28rpx 40rpx;color:#f97316;font-size:26rpx;line-height:36rpx;text-align:center;background:#fff7ed;border-radius:16rpx}
.footer-space{height:40rpx}
</style>
