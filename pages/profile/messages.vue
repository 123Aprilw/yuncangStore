<template>
  <view class="page">
    <page-nav fallback="/pages/profile/index" transparent @layout="onNavLayout">
      <template #title>
        <text class="nav-title">消息中心</text>
      </template>
      <template #right>
        <view class="clear" hover-class="clear-pressed" @tap.stop="clearAll">
          <image src="/static/profile/clear.svg" mode="aspectFit" />
        </view>
      </template>
    </page-nav>

    <view class="categories">
      <view
        v-for="c in categories"
        :key="c.type"
        class="category"
        :class="{ active: activeType === c.type }"
        hover-class="category-pressed"
        @tap="switchType(c.type)"
      >
        <view class="category-icon" :class="'tone-' + c.type">
          <image :src="c.icon" mode="aspectFit" />
          <view v-if="unreadCount(c.type)" class="category-badge">{{ badgeText(unreadCount(c.type)) }}</view>
        </view>
        <text class="category-label">{{ c.text }}</text>
      </view>
    </view>

    <order-list-loader
      class="message-loader"
      :top="listTop"
      bottom="0"
      refresh-name="消息"
      :loading="loading"
      :has-more="hasMore"
      :show-footer="messages.length > 0"
      @refresh="refreshMessages"
      @loadmore="loadMore"
    >
      <view class="list">
        <view
          v-for="m in messages"
          :key="m.id"
          class="message"
          hover-class="message-pressed"
          @tap="readMessage(m)"
        >
          <view class="msg-icon" :class="'tone-' + (m.type === 'stock' ? 'system' : m.type)">
            <image :src="iconFor(m.type)" mode="aspectFit" />
          </view>
          <view class="msg-body">
            <view class="msg-head">
              <text class="msg-title">{{ m.title }}</text>
              <text class="msg-time">{{ formatTime(m.createtime) }}</text>
            </view>
            <view class="msg-foot">
              <text class="msg-preview">{{ m.content }}</text>
              <view v-if="!Number(m.is_read)" class="unread-dot" />
            </view>
          </view>
        </view>
        <view v-if="!loading && !messages.length" class="empty">暂无消息</view>
      </view>
    </order-list-loader>
  </view>
</template>

<script>
import { profileApi } from '@/api/index'
import OrderListLoader from '@/components/order-list-loader/order-list-loader.vue'
import PageNav from '@/components/page-nav/page-nav.vue'
import { getCapsuleLayout, pxToRpx } from '@/utils/capsule'
export default {
  components: { OrderListLoader, PageNav },
  data() {
    return {
      navBarHeight: getCapsuleLayout().navBarHeight,
      activeType: 'all',
      categories: [
        { type: 'all', text: '全部消息', icon: '/static/profile/msg-all.svg' },
        { type: 'order', text: '订单消息', icon: '/static/profile/msg-order.svg' },
        { type: 'review', text: '审核结果', icon: '/static/profile/msg-review.svg' },
        { type: 'system', text: '系统消息', icon: '/static/profile/msg-system.svg' }
      ],
      messages: [],
      unreadCounts: { all: 0, order: 0, review: 0, system: 0 },
      page: 1,
      total: 0,
      hasMore: true,
      loading: false
    }
  },
  computed: {
    listTop() {
      return pxToRpx(this.navBarHeight) + 196 + 'rpx'
    }
  },
  onLoad(options) {
    if (options.type && this.categories.some(item => item.type === options.type)) this.activeType = options.type
  },
  onShow() {
    this.refreshMessages()
  },
  methods: {
    onNavLayout(layout) {
      this.navBarHeight = layout.navBarHeight
    },
    switchType(type) {
      if (this.activeType === type) return
      this.activeType = type
      this.refreshMessages()
    },
    async loadMessages(reset) {
      if (this.loading || (!reset && !this.hasMore)) return
      this.loading = true
      const nextPage = reset ? 1 : this.page + 1
      try {
        const data = await profileApi.messages({ type: this.activeType, page: nextPage, limit: 20 })
        const list = data.list || []
        this.messages = reset ? list : this.messages.concat(list)
        this.unreadCounts = data.unread_counts || this.unreadCounts
        this.page = nextPage
        this.total = Number(data.total || 0)
        this.hasMore = this.messages.length < this.total
      } catch (e) {
        if (reset) {
          this.messages = []
          this.total = 0
          this.hasMore = false
        }
      } finally {
        this.loading = false
      }
    },
    refreshMessages() {
      return this.loadMessages(true)
    },
    loadMore() {
      return this.loadMessages(false)
    },
    unreadCount(type) {
      return Number(this.unreadCounts[type] || 0)
    },
    badgeText(count) {
      return count > 99 ? '99+' : String(count)
    },
    iconFor(type) {
      if (type === 'stock') return '/static/profile/msg-system.svg'
      const category = this.categories.find(c => c.type === type)
      return category ? category.icon : '/static/profile/msg-system.svg'
    },
    formatTime(value) {
      if (!value) return ''
      const date = new Date(Number(value) * 1000)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      if (date.toDateString() === now.toDateString()) {
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
      }
      return String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    },
    async readMessage(message) {
      try {
        if (!Number(message.is_read)) {
          await profileApi.readMessage(message.id)
          message.is_read = 1
        }
        uni.navigateTo({ url: '/pages/profile/message-detail?id=' + message.id })
      } catch (e) {}
    },
    clearAll() {
      if (!this.messages.some(m => !Number(m.is_read))) return
      uni.showModal({
        title: '清空未读',
        content: '确认全部标为已读？',
        success: async r => {
          if (!r.confirm) return
          try {
            await profileApi.readMessage()
            await this.refreshMessages()
            uni.showToast({ title: '已全部标记为已读', icon: 'none' })
          } catch (e) {}
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #feeed7 0.9%, #fff 13.2%);
  font-family: "PingFang SC", sans-serif;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
}
.clear image {
  width: 36rpx;
  height: 36rpx;
}
.clear-pressed {
  background: rgba(0, 0, 0, 0.04);
}

.categories {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 40rpx 28rpx;
}
.category {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
}
.category-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96rpx;
  height: 96rpx;
  margin-bottom: 12rpx;
  border-radius: 28rpx;
  border: 3rpx solid transparent;
  box-sizing: border-box;
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.category-icon image {
  width: 48rpx;
  height: 48rpx;
}
.tone-all { background: #f9ecff; }
.tone-order { background: #ddfffb; }
.tone-review { background: #fcf0f0; }
.tone-system { background: #ecf4ff; }

.category-label {
  color: rgba(0, 0, 0, 0.55);
  font-size: 24rpx;
  line-height: 34rpx;
}
.category.active .category-label {
  color: #f97316;
  font-weight: 600;
}
.category.active .category-icon {
  border-color: #f97316;
  box-shadow: 0 8rpx 20rpx rgba(249, 115, 22, 0.18);
}
.category-pressed {
  opacity: 0.78;
}
.category-pressed .category-icon {
  transform: scale(0.94);
}

.category-badge {
  position: absolute;
  z-index: 2;
  top: -10rpx;
  right: -10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  color: #fff;
  font-size: 18rpx;
  font-weight: 600;
  line-height: 32rpx;
  background: #ff3b30;
  border: 2rpx solid #fff;
  border-radius: 32rpx;
}

.message-loader {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  box-shadow: 0 -8rpx 24rpx rgba(255, 180, 100, 0.08);
}
.message-loader :deep(.list),
.message-loader :deep(.loader) {
  background: #fff;
}
.message-loader :deep(.loader-shell) {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
}

.list {
  padding: 8rpx 0 24rpx;
  min-height: 100%;
  box-sizing: border-box;
  background: #fff;
}

.message {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}
.message-pressed {
  background: #fafafa;
}

.msg-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
}
.msg-icon image {
  width: 44rpx;
  height: 44rpx;
}

.msg-body {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
}
.msg-head,
.msg-foot {
  display: flex;
  align-items: center;
}
.msg-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: rgba(0, 0, 0, 0.85);
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.msg-time {
  flex: none;
  margin-left: 16rpx;
  color: #b0b0b0;
  font-size: 22rpx;
  line-height: 32rpx;
}
.msg-foot {
  margin-top: 8rpx;
}
.msg-preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #999;
  font-size: 24rpx;
  line-height: 34rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.unread-dot {
  flex: none;
  width: 14rpx;
  height: 14rpx;
  margin-left: 16rpx;
  background: #e71927;
  border-radius: 50%;
}

.empty {
  padding: 160rpx 0;
  color: #b0b0b0;
  font-size: 28rpx;
  text-align: center;
}
</style>
