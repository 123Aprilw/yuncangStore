<template>
  <view class="page">
    <view class="hero"/>
    <page-nav title="我的团队" fallback="/pages/distribution/index" transparent @layout="onNavLayout" />
    <view class="search">
      <view class="search-input">
        <image src="/static/product/search.svg"/>
        <input v-model="keyword" placeholder="搜索成员昵称或手机号" confirm-type="search" @confirm="refreshMembers"/>
      </view>
      <view class="filter-button" :class="{active: filterActive}" @tap="openFilter">
        <image src="/static/distribution/filter.svg"/>
      </view>
    </view>
    <view class="filter-tags-wrap" :class="{ show: filterBarVisible }">
      <view class="filter-tags">
        <view v-if="filterBarTags.scopeText" class="filter-tag" @tap="openFilter">
          <text class="filter-tag-label">类型</text>
          <text class="filter-tag-text">{{ filterBarTags.scopeText }}</text>
        </view>
        <view v-if="filterBarTags.levelText" class="filter-tag" @tap="openFilter">
          <text class="filter-tag-label">星级</text>
          <text class="filter-tag-text">{{ filterBarTags.levelText }}</text>
        </view>
        <text v-if="filterBarVisible" class="filter-tag-clear" @tap.stop="clearFilter">清除</text>
      </view>
    </view>
    <view class="stats">
      <view class="stat">
        <text>总人数</text>
        <view class="stat-value">
          <b :class="{ accent: isAgent }">{{ overview.team_total || 0 }}</b>
          <small>人</small>
        </view>
      </view>
      <view class="stat-divider"/>
      <view class="stat">
        <text>{{ isAgent ? '已升级货代' : '星级人数' }}</text>
        <view class="stat-value">
          <b class="accent">{{ overview.star_count || 0 }}</b>
          <small>人</small>
        </view>
      </view>
      <view class="stat-divider"/>
      <view class="stat">
        <text>消费者</text>
        <view class="stat-value">
          <b>{{ overview.consumer_count || 0 }}</b>
          <small>人</small>
        </view>
      </view>
    </view>
    <order-list-loader
      class="team-loader"
      :style="{ top: listTop, bottom: '0' }"
      refresh-name="团队"
      :loading="loading"
      :has-more="hasMore"
      :show-footer="members.length > 0"
      @refresh="refreshMembers"
      @loadmore="loadMore"
    >
      <view v-for="member in members" :key="member.user_id" class="member">
        <view class="person">
          <view v-if="!memberAvatar(member)" class="avatar" :style="avatarStyle(member)">{{ avatarText(member) }}</view>
          <image v-else class="avatar-img" :src="memberAvatar(member)" @error="onMemberAvatarError(member)"/>
          <view class="info">
            <view class="name-row">
              <b>{{ member.nickname || '暂无' }}</b>
              <text class="mobile">{{ maskMobile(member.mobile) }}</text>
              <text class="relation" :class="member.relation">{{ member.relation_text || relationText(member) }}</text>
            </view>
            <em :style="levelTagStyle(member.level_color, member.level)">{{ member.level_title || '暂无' }}</em>
          </view>
        </view>
        <view class="line"/>
        <text class="joined">加入时间：{{ formatDate(member.createtime) }}</text>
        <view v-if="isAgent" class="metrics" :class="{ dual: hasContribution(member) }">
          <template v-if="hasContribution(member)">
            <view class="metric">
              <text>采购总额</text>
              <b>¥{{ formatMoney(member.purchase_amount) }}</b>
            </view>
            <view class="metric">
              <text>分销贡献</text>
              <b class="accent">+¥{{ formatMoney(member.contribution_amount) }}</b>
            </view>
          </template>
          <template v-else>
            <text>采购总额</text>
            <b :class="{ accent: Number(member.level) >= 2 }">¥{{ formatMoney(member.purchase_amount) }}</b>
          </template>
        </view>
      </view>
      <view v-if="!loading && !members.length" class="empty">
        <view class="empty-icon">✦</view>
        <text class="empty-title">暂无团队成员</text>
        <text class="empty-desc">{{ emptyDesc }}</text>
      </view>
    </order-list-loader>

    <view v-if="filterVisible" class="filter-layer">
      <view class="filter-mask" @tap="closeFilter"/>
      <view class="filter-sheet" @tap.stop>
        <view class="filter-handle"/>
        <text class="filter-title">筛选团队成员</text>
        <view class="filter-section">
          <text class="filter-label">成员类型</text>
          <view class="filter-presets">
            <text
              v-for="item in scopeOptions"
              :key="item.value"
              :class="{active: draftScope === item.value}"
              @tap="draftScope = item.value"
            >{{ item.label }}</text>
          </view>
        </view>
        <view class="filter-section">
          <text class="filter-label">星级</text>
          <view class="filter-presets wrap">
            <text
              v-for="item in levelOptions"
              :key="item.value"
              :class="{active: draftLevel === item.value}"
              @tap="draftLevel = item.value"
            >{{ item.label }}</text>
          </view>
        </view>
        <view class="filter-actions">
          <button class="filter-reset" @tap="resetDraftFilter">重置</button>
          <button class="filter-confirm" @tap="confirmFilter">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import OrderListLoader from '../../components/order-list-loader/order-list-loader.vue'
import PageNav from '@/components/page-nav/page-nav.vue'
import { distributionApi } from '../../api'
import { getCapsuleLayout, pxToRpx } from '@/utils/capsule'
import { navigateBack } from '@/utils/nav'
import { levelTagStyle } from '../../utils/level-color'
import { applyLevelsToOptions } from '../../utils/level-options'
import { resolveAvatar } from '@/utils/avatar'

const AVATAR_COLORS = ['#006EF2', '#27C7EB', '#FF8D1A', '#7B8CFF', '#E2E2E2', '#45B26B']

export default {
  components: { OrderListLoader, PageNav },
  data() {
    return {
      navBarHeight: getCapsuleLayout().navBarHeight,
      mode: 'star',
      keyword: '',
      overview: {},
      members: [],
      page: 1,
      hasMore: true,
      loading: false,
      scope: 'all',
      level: 0,
      filterVisible: false,
      draftScope: 'all',
      draftLevel: 0,
      filterBarVisible: false,
      filterBarTags: { scopeText: '', levelText: '' },
      filterBarTimer: null,
      scopeOptions: [
        { value: 'all', label: '全部' },
        { value: 'direct', label: '直招' },
        { value: 'team', label: '团队' }
      ],
      levelOptions: [
        { value: 0, label: '全部' }
      ]
    }
  },
  computed: {
    isAgent() { return this.mode === 'agent' },
    filterActive() { return this.scope !== 'all' || this.level > 0 },
    scopeLabel() {
      const hit = this.scopeOptions.find(item => item.value === this.scope)
      return hit ? hit.label : '全部'
    },
    levelLabel() {
      const hit = this.levelOptions.find(item => item.value === this.level)
      return hit ? hit.label : '全部'
    },
    listTop() {
      const navRpx = pxToRpx(this.navBarHeight)
      const base = navRpx + 300
      return (this.filterBarVisible ? base + 72 : base) + 'rpx'
    },
    emptyDesc() {
      if (this.filterActive || this.keyword) return '没有符合筛选条件的成员'
      return '绑定消费者或发展下级后，将在此展示'
    }
  },
  onLoad(options) {
    if (options.mode) this.mode = options.mode
    if (options.scope && ['all', 'direct', 'team'].includes(options.scope)) this.scope = options.scope
    if (options.level) this.level = Math.max(0, Number(options.level) || 0)
    this.syncFilterBar()
    this.loadOverview()
    this.refreshMembers()
  },
  beforeDestroy() {
    if (this.filterBarTimer) clearTimeout(this.filterBarTimer)
  },
  methods: {
    syncFilterBar() {
      const scopeText = this.scope !== 'all' ? this.scopeLabel : ''
      const levelText = this.level > 0 ? this.levelLabel : ''
      this.filterBarTags = { scopeText, levelText }
      this.filterBarVisible = !!(scopeText || levelText)
    },
    hideFilterBar() {
      this.filterBarVisible = false
      if (this.filterBarTimer) clearTimeout(this.filterBarTimer)
      this.filterBarTimer = setTimeout(() => {
        this.filterBarTags = { scopeText: '', levelText: '' }
        this.filterBarTimer = null
      }, 220)
    },
    onNavLayout(layout) {
      this.navBarHeight = layout.navBarHeight
    },
    async loadOverview() {
      try {
        this.overview = await distributionApi.index() || {}
        if (this.overview.levels) applyLevelsToOptions(this.levelOptions, this.overview.levels)
      } catch (e) {}
    },
    async loadMembers(reset) {
      if (this.loading || (!reset && !this.hasMore)) return
      this.loading = true
      const nextPage = reset ? 1 : this.page + 1
      try {
        const data = await distributionApi.team({
          page: nextPage,
          limit: 20,
          keyword: (this.keyword || '').trim(),
          scope: this.scope,
          level: this.level || ''
        })
        const list = data.list || []
        this.members = reset ? list : this.members.concat(list)
        if (data.levels) applyLevelsToOptions(this.levelOptions, data.levels)
        this.page = nextPage
        this.hasMore = this.members.length < Number(data.total || 0)
      } catch (e) {
        if (reset) this.members = []
      } finally {
        this.loading = false
      }
    },
    refreshMembers() {
      this.loadOverview()
      return this.loadMembers(true)
    },
    loadMore() { this.loadMembers(false) },
    openFilter() {
      this.draftScope = this.scope
      this.draftLevel = this.level
      this.filterVisible = true
    },
    closeFilter() { this.filterVisible = false },
    resetDraftFilter() {
      this.draftScope = 'all'
      this.draftLevel = 0
    },
    confirmFilter() {
      this.scope = this.draftScope
      this.level = this.draftLevel
      this.filterVisible = false
      this.syncFilterBar()
      this.refreshMembers()
    },
    async clearFilter() {
      if (!this.filterBarVisible && !this.filterActive) return
      this.scope = 'all'
      this.level = 0
      await this.refreshMembers()
      this.hideFilterBar()
    },
    relationText(member) {
      return member && member.relation === 'direct' ? '直招' : '团队'
    },
    maskMobile(mobile) {
      const value = String(mobile || '')
      return /^1\d{10}$/.test(value) ? value.slice(0, 3) + '****' + value.slice(-4) : (value || '暂无')
    },
    formatDate(timestamp) {
      if (!timestamp) return '暂无'
      const date = new Date(Number(timestamp) * 1000)
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
    },
    formatMoney(value) {
      const amount = Number(value)
      if (!Number.isFinite(amount)) return '0'
      const fixed = amount.toFixed(2).replace(/\.00$/, '')
      const parts = fixed.split('.')
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return parts.join('.')
    },
    hasContribution(member) {
      return Number(member && member.contribution_amount) > 0
    },
    avatarText(member) {
      const name = String((member && member.nickname) || '').trim()
      if (!name || name === '暂无') return '团'
      return name.slice(0, 1)
    },
    memberAvatar(member) {
      if (!member || member._avatarBroken) return ''
      return resolveAvatar(member.avatar)
    },
    onMemberAvatarError(member) {
      if (member) this.$set(member, '_avatarBroken', true)
    },
    avatarStyle(member) {
      const seed = String((member && (member.user_id || member.nickname)) || '0')
      let hash = 0
      for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
      const background = AVATAR_COLORS[hash % AVATAR_COLORS.length]
      return { background, color: background === '#E2E2E2' ? '#414755' : '#fff' }
    },
    levelTagStyle
  }
}
</script>

<style scoped>
.page{position:relative;height:100vh;overflow:hidden;background:#f7f4f1;font-family:"PingFang SC",sans-serif}
.hero{position:absolute;top:0;left:0;right:0;height:420rpx;background:linear-gradient(180deg,#ffe8d2 0%,#fff3e8 48%,#f7f4f1 100%);pointer-events:none}
.search,.stats,.filter-tags-wrap{position:relative;z-index:1}
.search{display:flex;align-items:center;justify-content:space-between;width:690rpx;margin:8rpx 30rpx 20rpx}
.search-input{display:flex;align-items:center;box-sizing:border-box;width:600rpx;height:76rpx;padding:0 28rpx;background:rgba(255,255,255,.92);border:2rpx solid rgba(255,255,255,.95);border-radius:76rpx;box-shadow:0 8rpx 24rpx rgba(180,110,60,.06)}
.search-input image{width:36rpx;height:36rpx;opacity:.55}
.search-input input{flex:1;margin-left:14rpx;color:#1a1c1c;font-size:28rpx}
.filter-button{display:flex;align-items:center;justify-content:center;width:74rpx;height:74rpx;background:rgba(255,255,255,.92);border-radius:50%;box-shadow:0 8rpx 24rpx rgba(180,110,60,.06)}
.filter-button image{width:32rpx;height:30rpx}
.filter-button.active{background:rgba(249,115,22,.12);box-shadow:0 0 0 2rpx rgba(249,115,22,.35)}
.filter-tags-wrap{overflow:hidden;max-height:0;margin:0 30rpx;opacity:0;pointer-events:none;transition:max-height .2s ease,margin .2s ease,opacity .18s ease}
.filter-tags-wrap.show{max-height:120rpx;margin:-8rpx 30rpx 16rpx;opacity:1;pointer-events:auto}
.filter-tags{display:flex;align-items:center;flex-wrap:wrap;gap:12rpx;width:690rpx;min-height:56rpx}
.filter-tag{display:flex;align-items:center;box-sizing:border-box;height:56rpx;padding:0 20rpx;background:#fff7ed;border-radius:28rpx;box-shadow:inset 0 0 0 2rpx rgba(249,115,22,.25)}
.filter-tag-label{flex:none;margin-right:12rpx;color:#f97316;font-size:24rpx;font-weight:500}
.filter-tag-text{color:#666;font-size:24rpx}
.filter-tag-clear{flex:none;margin-left:8rpx;color:#999;font-size:24rpx;line-height:56rpx}
.stats{display:flex;align-items:center;box-sizing:border-box;width:690rpx;height:168rpx;margin:0 30rpx 24rpx;padding:28rpx 8rpx;background:linear-gradient(135deg,#ffffff 0%,#fff8f2 100%);border:2rpx solid rgba(255,255,255,.9);border-radius:24rpx;box-shadow:0 12rpx 32rpx rgba(180,110,60,.08)}
.stat{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center}
.stat-divider{width:2rpx;height:72rpx;background:linear-gradient(180deg,transparent,#f0d9c4,transparent)}
.stat text{color:#8a7464;font-size:24rpx}
.stat-value{display:flex;align-items:baseline;justify-content:center;margin-top:12rpx}
.stat-value b{color:#1a1c1c;font-size:44rpx;font-weight:600;line-height:1}
.stat-value b.accent{color:#ff641f}
.stat-value small{margin-left:6rpx;color:#a89587;font-size:22rpx}
.team-loader{background:transparent;transition:top .2s ease}
.team-loader :deep(.loader-shell),
.team-loader :deep(.loader){background:transparent!important}
.team-loader :deep(.load-indicator){color:#c4b5a8}
.team-loader :deep(.load-end-line){background:linear-gradient(90deg,transparent,#e8d9cb)}
.team-loader :deep(.load-end-line:last-child){background:linear-gradient(90deg,#e8d9cb,transparent)}
.team-loader :deep(.load-end-text){color:#c4b5a8}
.member{box-sizing:border-box;width:690rpx;margin:0 30rpx 20rpx;padding:28rpx;background:#fff;border-radius:24rpx;box-shadow:0 8rpx 24rpx rgba(45,35,25,.04)}
.person{display:flex;align-items:center}
.avatar,.avatar-img{width:80rpx;height:80rpx;border-radius:22rpx;flex-shrink:0}
.avatar{display:flex;align-items:center;justify-content:center;color:#fff;font-size:32rpx;font-weight:500;box-shadow:0 6rpx 16rpx rgba(0,0,0,.08)}
.avatar-img{background:#f2eee9}
.info{display:flex;flex:1;flex-direction:column;margin-left:18rpx;min-width:0}
.name-row{display:flex;align-items:center;flex-wrap:wrap}
.name-row b{font-size:32rpx;font-weight:600;color:#1a1c1c}
.name-row .mobile{margin-left:14rpx;color:#8a7464;font-size:26rpx}
.name-row .relation{margin-left:12rpx;padding:2rpx 10rpx;font-size:20rpx;border-radius:8rpx}
.name-row .relation.direct{color:#ff641f;background:#fff0e8}
.name-row .relation.team{color:#59606f;background:#f3f4f6}
.info em{align-self:flex-start;margin-top:10rpx;padding:4rpx 12rpx;font-size:20rpx;font-style:normal;border-radius:10rpx}
.line{height:2rpx;margin:24rpx 0 18rpx;background:linear-gradient(90deg,transparent,#f0e6dc,transparent)}
.joined{display:block;color:#8a7464;font-size:26rpx}
.metrics{display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;margin-top:18rpx;padding:22rpx 24rpx;background:linear-gradient(135deg,#fffaf5,#fff5ed);border:2rpx solid #ffe8d5;border-radius:16rpx}
.metrics>text{color:#8a7464;font-size:26rpx}
.metrics>b{color:#1a1c1c;font-size:32rpx;font-weight:600}
.metrics>b.accent{color:#ff641f}
.metrics.dual{padding:20rpx 24rpx}
.metric{display:flex;flex:1;flex-direction:column}
.metric+ .metric{align-items:flex-end}
.metric text{color:#8a7464;font-size:24rpx}
.metric b{margin-top:8rpx;color:#1a1c1c;font-size:32rpx;font-weight:600}
.metric b.accent{color:#ff641f}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;width:630rpx;min-height:280rpx;margin:80rpx auto 0;padding:40rpx 36rpx;background:linear-gradient(135deg,#fffaf5,#fff5ed);border:2rpx dashed #f6d4bd;border-radius:24rpx}
.empty-icon{display:flex;align-items:center;justify-content:center;width:80rpx;height:80rpx;margin-bottom:20rpx;color:#f1844d;font-size:40rpx;line-height:80rpx;background:#fff;border-radius:50%;box-shadow:0 10rpx 24rpx rgba(237,130,67,.14)}
.empty-title{color:#7b5135;font-size:28rpx;font-weight:600}
.empty-desc{margin-top:10rpx;color:#a89587;font-size:24rpx;line-height:36rpx;text-align:center}
.filter-layer{position:fixed;z-index:2000;top:0;right:0;bottom:0;left:0}
.filter-mask{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.filter-sheet{position:absolute;bottom:0;left:0;box-sizing:border-box;width:100%;padding:28rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#fffaf2 0%,#fff 28%);border-radius:36rpx 36rpx 0 0;box-shadow:0 -16rpx 40rpx rgba(0,0,0,.1)}
.filter-handle{width:72rpx;height:8rpx;margin:0 auto 28rpx;background:#e5e7eb;border-radius:8rpx}
.filter-title{display:block;margin-bottom:36rpx;color:#1f2937;font-size:34rpx;font-weight:600;line-height:48rpx;text-align:center}
.filter-section{margin-bottom:36rpx}
.filter-label{display:block;margin-bottom:20rpx;color:#6b7280;font-size:26rpx;line-height:36rpx}
.filter-presets{display:flex;gap:16rpx}
.filter-presets.wrap{flex-wrap:wrap}
.filter-presets text{flex:1;height:64rpx;color:#666;font-size:26rpx;line-height:64rpx;text-align:center;background:#f5f5f5;border-radius:32rpx}
.filter-presets.wrap text{flex:none;min-width:120rpx;padding:0 20rpx;font-size:24rpx}
.filter-presets text.active{color:#f97316;font-weight:500;background:#fff7ed;box-shadow:inset 0 0 0 2rpx #fdba74}
.filter-actions{display:flex;gap:20rpx}
.filter-actions button{flex:1;height:88rpx;margin:0;padding:0;font-size:30rpx;line-height:88rpx;border-radius:44rpx}
.filter-actions button::after{border:0}
.filter-reset{color:#666;background:#f3f4f6}
.filter-confirm{color:#fff;background:linear-gradient(90deg,#ff8a37,#fa3b19)}
</style>
