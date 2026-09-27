<template>
<view class="page">
  <page-nav title="订单明细" fallback="/pages/distribution/index" @layout="onNavLayout" />
  <view class="summary">
    <text>顶顶那总金额</text>
    <text class="total">¥{{ formatAmount(summary.total_amount) }}</text>
    <view class="line"/>
    <view class="split">
      <view class="split-item">
        <text>云仓订单:</text>
        <text class="amt">¥{{ formatAmount(summary.purchase_amount) }}</text>
      </view>
      <view class="split-item">
        <text>发货订单:</text>
        <text class="amt">¥{{ formatAmount(summary.delivery_amount) }}</text>
      </view>
    </view>
  </view>
  <view class="tabs"><text v-for="(t,i) in tabs" :key="t" :class="{active:typeIndex===i}" @tap="changeType(i)">{{t}}</text></view>
  <view class="search">
    <view class="search-input">
      <image src="/static/product/search.svg"/>
      <input
        v-model="keyword"
        confirm-type="search"
        placeholder="搜索姓名或手机号"
        @confirm="refresh"
      />
    </view>
    <view class="filter-button" :class="{active: filterActive}" @tap="openFilter">
      <image src="/static/distribution/filter.svg"/>
    </view>
  </view>
  <view class="filter-tags-wrap" :class="{ show: filterBarVisible }">
    <view class="filter-tags">
      <view v-if="filterBarTags.dateText" class="filter-tag" @tap="openFilter">
        <text class="filter-tag-label">下单时间</text>
        <text class="filter-tag-text">{{ filterBarTags.dateText }}</text>
      </view>
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
  <scroll-view class="list" :style="{ top: listTop }" scroll-y @scrolltolower="loadMore">
    <view v-for="item in rows" :key="item.id" class="row">
      <view>
        <text class="name">{{ item.from_name || '用户' }}</text>
        <text class="level" :style="levelTagStyle(item.level_color, item.from_level)">{{ item.level_title || '暂无等级' }}</text>
        <text>尾号:{{ item.mobile_tail || mobileTail(item.from_mobile) }}</text>
      </view>
      <view>
        <text>类型: {{ typeLabel(item.order_type) }}　 金额:¥{{ formatAmount(item.amount) }}</text>
        <text>{{ item.createtime_text || formatDate(item.createtime) }}</text>
      </view>
    </view>
    <view v-if="!loading && !rows.length" class="empty">
      <view class="empty-icon"><view class="empty-doc"><view/><view/><view class="short"/></view></view>
      <text class="empty-title">暂无分销明细</text>
      <text class="empty-desc">{{ emptyDesc }}</text>
    </view>
  </scroll-view>

  <view v-if="filterVisible" class="filter-layer">
    <view class="filter-mask" @tap="closeFilter"/>
    <view class="filter-sheet" @tap.stop>
      <view class="filter-handle"/>
      <text class="filter-title">筛选分销明细</text>
      <view class="filter-section">
        <text class="filter-label">分销时间</text>
        <view class="filter-presets">
          <text
            v-for="item in datePresets"
            :key="item.key"
            :class="{active: draftPreset === item.key}"
            @tap="applyPreset(item.key)"
          >{{ item.label }}</text>
        </view>
        <view class="filter-date-row">
          <picker mode="date" :value="draftStartDate" @change="changeDraftDate('start', $event)">
            <view class="filter-date-box"><text :class="{placeholder: !draftStartDate}">{{ draftStartDate || '开始日期' }}</text></view>
          </picker>
          <text class="filter-date-sep">至</text>
          <picker mode="date" :value="draftEndDate" :start="draftStartDate" @change="changeDraftDate('end', $event)">
            <view class="filter-date-box"><text :class="{placeholder: !draftEndDate}">{{ draftEndDate || '结束日期' }}</text></view>
          </picker>
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
      <view class="filter-section">
        <text class="filter-label">团队/直招</text>
        <view class="filter-presets">
          <text
            v-for="item in scopeOptions"
            :key="item.value"
            :class="{active: draftScope === item.value}"
            @tap="draftScope = item.value"
          >{{ item.label }}</text>
        </view>
      </view>
      <view class="filter-actions">
        <button class="filter-reset" @tap="resetFilter">重置</button>
        <button class="filter-confirm" @tap="confirmFilter">确定</button>
      </view>
    </view>
  </view>
</view>
</template>
<script>
import { distributionApi } from '../../api'
import PageNav from '@/components/page-nav/page-nav.vue'
import { getCapsuleLayout, pxToRpx } from '@/utils/capsule'
import { navigateBack } from '@/utils/nav'
import { levelTagStyle } from '../../utils/level-color'
import { applyLevelsToOptions } from '../../utils/level-options'

export default {
  components: { PageNav },
  data() {
    return {
      navBarHeight: getCapsuleLayout().navBarHeight,
      typeIndex: 0,
      tabs: ['全部', '云仓', '发货'],
      rows: [],
      summary: {},
      page: 1,
      hasMore: true,
      loading: false,
      loadSeq: 0,
      keyword: '',
      startDate: '',
      endDate: '',
      scope: 'all',
      level: 0,
      filterVisible: false,
      draftStartDate: '',
      draftEndDate: '',
      draftPreset: '',
      draftScope: 'all',
      draftLevel: 0,
      filterBarVisible: false,
      filterBarTags: { dateText: '', scopeText: '', levelText: '' },
      filterBarTimer: null,
      datePresets: [
        { key: '7d', label: '近7天' },
        { key: '30d', label: '近30天' },
        { key: 'month', label: '本月' }
      ],
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
    recordType() {
      return this.typeIndex === 1 ? 'purchase' : this.typeIndex === 2 ? 'delivery' : ''
    },
    filterActive() {
      return !!(this.startDate || this.endDate || this.scope !== 'all' || this.level > 0)
    },
    dateFilterText() {
      if (this.startDate && this.endDate) {
        return this.startDate === this.endDate
          ? this.startDate
          : this.startDate + ' 至 ' + this.endDate
      }
      if (this.startDate) return this.startDate + ' 起'
      if (this.endDate) return '至 ' + this.endDate
      return ''
    },
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
      const base = navRpx + 472
      return (this.filterBarVisible ? base + 132 : base) + 'rpx'
    },
    emptyDesc() {
      if (this.filterActive || this.keyword) return '未找到符合条件的分销明细'
      return '产生采购或代发订单后，明细将显示在这里'
    }
  },
  onLoad(query) {
    const type = (query && query.order_type) || ''
    if (type === 'purchase') this.typeIndex = 1
    else if (type === 'delivery') this.typeIndex = 2
    if (query && query.date) {
      this.startDate = String(query.date)
      this.endDate = String(query.date)
    }
    if (query && query.start_time) this.startDate = String(query.start_time)
    if (query && query.end_time) this.endDate = String(query.end_time)
    if (query && ['all', 'direct', 'team'].includes(query.scope)) this.scope = query.scope
    if (query && query.level) this.level = Math.max(0, Number(query.level) || 0)
    this.syncFilterBar()
    this.refresh()
  },
  beforeDestroy() {
    if (this.filterBarTimer) clearTimeout(this.filterBarTimer)
  },
  methods: {
    syncFilterBar() {
      const dateText = (this.startDate || this.endDate) ? this.dateFilterText : ''
      const scopeText = this.scope !== 'all' ? this.scopeLabel : ''
      const levelText = this.level > 0 ? this.levelLabel : ''
      this.filterBarTags = { dateText, scopeText, levelText }
      this.filterBarVisible = !!(dateText || scopeText || levelText)
    },
    hideFilterBar() {
      this.filterBarVisible = false
      if (this.filterBarTimer) clearTimeout(this.filterBarTimer)
      this.filterBarTimer = setTimeout(() => {
        this.filterBarTags = { dateText: '', scopeText: '', levelText: '' }
        this.filterBarTimer = null
      }, 220)
    },
    onNavLayout(layout) {
      this.navBarHeight = layout.navBarHeight
    },
    async load(reset = false) {
      if (this.loading || (!reset && !this.hasMore)) return
      const seq = ++this.loadSeq
      this.loading = true
      const page = reset ? 1 : this.page + 1
      try {
        const params = {
          page,
          limit: 20,
          order_type: this.recordType,
          keyword: (this.keyword || '').trim(),
          start_time: this.startDate || '',
          end_time: this.endDate || '',
          scope: this.scope || 'all',
          level: this.level || ''
        }
        const data = await distributionApi.records(params)
        if (seq !== this.loadSeq) return
        const list = (data && data.list) || []
        this.rows = reset ? list : this.rows.concat(list)
        this.summary = (data && data.summary) || this.summary
        if (data && data.levels) applyLevelsToOptions(this.levelOptions, data.levels)
        this.page = page
        this.hasMore = this.rows.length < Number((data && data.total) || 0)
      } catch (e) {
        if (seq !== this.loadSeq) return
        if (reset) {
          this.rows = []
          this.summary = {}
        }
      } finally {
        if (seq === this.loadSeq) this.loading = false
      }
    },
    refresh() {
      this.hasMore = true
      this.load(true)
    },
    loadMore() {
      this.load(false)
    },
    changeType(index) {
      this.typeIndex = index
      this.refresh()
    },
    formatDay(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return y + '-' + m + '-' + d
    },
    matchPreset(start, end) {
      if (!start || !end) return ''
      for (const item of this.datePresets) {
        const range = this.presetRange(item.key)
        if (range.start === start && range.end === end) return item.key
      }
      return ''
    },
    presetRange(key) {
      const end = new Date()
      const start = new Date()
      if (key === '7d') start.setDate(end.getDate() - 6)
      else if (key === '30d') start.setDate(end.getDate() - 29)
      else if (key === 'month') start.setDate(1)
      return { start: this.formatDay(start), end: this.formatDay(end) }
    },
    openFilter() {
      this.draftStartDate = this.startDate
      this.draftEndDate = this.endDate
      this.draftPreset = this.matchPreset(this.startDate, this.endDate)
      this.draftScope = this.scope
      this.draftLevel = this.level
      this.filterVisible = true
    },
    closeFilter() {
      this.filterVisible = false
    },
    applyPreset(key) {
      const range = this.presetRange(key)
      this.draftPreset = key
      this.draftStartDate = range.start
      this.draftEndDate = range.end
    },
    changeDraftDate(type, event) {
      const value = (event.detail && event.detail.value) || ''
      if (type === 'start') this.draftStartDate = value
      else this.draftEndDate = value
      this.draftPreset = this.matchPreset(this.draftStartDate, this.draftEndDate)
    },
    resetFilter() {
      this.draftStartDate = ''
      this.draftEndDate = ''
      this.draftPreset = ''
      this.draftScope = 'all'
      this.draftLevel = 0
    },
    confirmFilter() {
      if (this.draftStartDate && this.draftEndDate && this.draftStartDate > this.draftEndDate) {
        uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
        return
      }
      this.startDate = this.draftStartDate
      this.endDate = this.draftEndDate
      this.scope = this.draftScope
      this.level = this.draftLevel
      this.filterVisible = false
      this.syncFilterBar()
      this.refresh()
    },
    async clearFilter() {
      if (!this.filterBarVisible && !this.filterActive) return
      this.startDate = ''
      this.endDate = ''
      this.scope = 'all'
      this.level = 0
      this.draftStartDate = ''
      this.draftEndDate = ''
      this.draftPreset = ''
      this.draftScope = 'all'
      this.draftLevel = 0
      this.hasMore = true
      await this.load(true)
      this.hideFilterBar()
    },
    typeLabel(type) {
      return ({ purchase: '云仓', delivery: '发货' })[type] || type || '—'
    },
    formatAmount(value) {
      const amount = Number(value)
      return Number.isFinite(amount) ? amount.toFixed(2).replace(/\.00$/, '') : '0'
    },
    mobileTail(mobile) {
      const value = String(mobile || '')
      return value.length >= 4 ? value.slice(-4) : '—'
    },
    formatDate(value) {
      if (!value) return '—'
      const date = new Date(/^\d+$/.test(String(value)) ? Number(value) * 1000 : value)
      if (Number.isNaN(date.getTime())) return String(value)
      const pad = n => String(n).padStart(2, '0')
      return date.getFullYear() + '.' + pad(date.getMonth() + 1) + '.' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
    },
    levelTagStyle
  }
}
</script>
<style scoped>
.page{height:100vh;overflow:hidden;background:#f9f9f9;font-family:"PingFang SC",sans-serif}
.summary{box-sizing:border-box;width:690rpx;height:254rpx;margin:20rpx 30rpx 0;padding:28rpx;background:linear-gradient(110deg,#fff,#fff6ef);border-radius:20rpx}
.summary>text{color:#59606f;font-size:24rpx}
.summary .total{display:block;margin-top:8rpx;color:#ff641f;font-size:40rpx;font-weight:700;line-height:1.2}
.line{height:2rpx;margin:32rpx 0 24rpx;background:#ddd}
.summary .split{display:flex;justify-content:space-between;color:#59606f;font-size:24rpx}
.summary .split-item{display:flex;align-items:baseline;gap:8rpx}
.summary .amt{color:#222;font-size:30rpx;font-weight:600}
.tabs{display:flex;justify-content:space-around;width:500rpx;height:92rpx;margin:0 auto}
.tabs text{position:relative;color:#59606f;font-size:28rpx;line-height:92rpx}
.tabs .active{color:#ff641f}
.tabs .active:after{position:absolute;bottom:10rpx;left:50%;width:38rpx;height:5rpx;content:"";background:#ff641f;transform:translateX(-50%)}
.search{display:flex;align-items:center;justify-content:space-between;margin:0 30rpx 24rpx}
.search-input{display:flex;align-items:center;box-sizing:border-box;width:600rpx;height:76rpx;padding:0 22rpx;background:#fff;border-radius:76rpx}
.search-input image{width:36rpx;height:36rpx}
.search-input input{flex:1;margin-left:16rpx;font-size:28rpx}
.filter-button{display:flex;align-items:center;justify-content:center;width:74rpx;height:74rpx;background:#f5f5f5;border-radius:50%}
.filter-button image{width:32rpx;height:30rpx}
.filter-button.active{background:rgba(249,115,22,.12);box-shadow:0 0 0 2rpx rgba(249,115,22,.35)}
.filter-tags-wrap{overflow:hidden;max-height:0;margin:0 30rpx;opacity:0;pointer-events:none;transition:max-height .2s ease,margin .2s ease,opacity .18s ease}
.filter-tags-wrap.show{max-height:120rpx;margin:-8rpx 30rpx 20rpx;opacity:1;pointer-events:auto}
.filter-tags{display:flex;align-items:center;flex-wrap:wrap;gap:12rpx;width:690rpx;min-height:56rpx}
.filter-tag{display:flex;align-items:center;box-sizing:border-box;height:56rpx;padding:0 20rpx;background:#fff7ed;border-radius:28rpx;box-shadow:inset 0 0 0 2rpx rgba(249,115,22,.25)}
.filter-tag-label{flex:none;margin-right:12rpx;color:#f97316;font-size:24rpx;font-weight:500}
.filter-tag-text{color:#666;font-size:24rpx}
.filter-tag-clear{flex:none;margin-left:8rpx;color:#999;font-size:24rpx;line-height:56rpx}
.list{position:absolute;bottom:0;width:100%;transition:top .2s ease}
.list:before{position:absolute;top:0;left:30rpx;width:690rpx;height:100%;content:"";background:#fff;border-radius:20rpx}
.row{position:relative;z-index:1;box-sizing:border-box;width:630rpx;height:148rpx;margin:0 60rpx;padding:24rpx 0;border-bottom:2rpx solid rgba(0,0,0,.04)}
.row>view{display:flex;align-items:center;justify-content:space-between}
.row>view+view{margin-top:14rpx;color:#666;font-size:24rpx}
.row .name{font-size:32rpx;font-weight:700;color:#222}
.row .level{margin-right:auto;margin-left:10rpx;padding:2rpx 8rpx;font-size:20rpx;border-radius:12rpx}
.row>view:first-child>text:last-child{font-size:24rpx}
.empty{position:absolute;z-index:2;top:50%;left:0;right:0;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:40rpx 36rpx;transform:translateY(-50%)}
.empty-icon{display:flex;align-items:center;justify-content:center;width:108rpx;height:108rpx;margin-bottom:22rpx;background:linear-gradient(160deg,#fff8f1 0%,#ffe9d6 100%);border-radius:32rpx;box-shadow:0 12rpx 28rpx rgba(249,115,22,.08)}
.empty-doc{display:flex;flex-direction:column;justify-content:center;gap:10rpx;box-sizing:border-box;width:46rpx;height:56rpx;padding:10rpx 8rpx;background:#fff;border:3rpx solid #f2a06a;border-radius:10rpx}
.empty-doc view{height:4rpx;background:#f2a06a;border-radius:4rpx;opacity:.85}
.empty-doc .short{width:58%}
.empty-title{color:#7a6556;font-size:28rpx;font-weight:500;line-height:40rpx}
.empty-desc{margin-top:10rpx;color:#b09a8a;font-size:22rpx;line-height:32rpx;text-align:center}
.filter-layer{position:fixed;z-index:2000;top:0;right:0;bottom:0;left:0}
.filter-mask{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.filter-sheet{position:absolute;bottom:0;left:0;box-sizing:border-box;width:100%;padding:28rpx 36rpx calc(40rpx + env(safe-area-inset-bottom));background:linear-gradient(180deg,#fffaf2 0%,#fff 28%);border-radius:36rpx 36rpx 0 0;box-shadow:0 -16rpx 40rpx rgba(0,0,0,.1)}
.filter-handle{width:72rpx;height:8rpx;margin:0 auto 28rpx;background:#e5e7eb;border-radius:8rpx}
.filter-title{display:block;margin-bottom:36rpx;color:#1f2937;font-size:34rpx;font-weight:600;line-height:48rpx;text-align:center}
.filter-section{margin-bottom:36rpx}
.filter-label{display:block;margin-bottom:20rpx;color:#6b7280;font-size:26rpx;line-height:36rpx}
.filter-presets{display:flex;gap:16rpx;margin-bottom:24rpx}
.filter-presets.wrap{flex-wrap:wrap;margin-bottom:0}
.filter-presets text{flex:1;height:64rpx;color:#666;font-size:26rpx;line-height:64rpx;text-align:center;background:#f5f5f5;border-radius:32rpx}
.filter-presets.wrap text{flex:none;min-width:120rpx;padding:0 20rpx;font-size:24rpx}
.filter-presets text.active{color:#f97316;font-weight:500;background:#fff7ed;box-shadow:inset 0 0 0 2rpx #fdba74}
.filter-date-row{display:flex;align-items:center;gap:16rpx}
.filter-date-row picker{flex:1}
.filter-date-box{display:flex;align-items:center;justify-content:center;box-sizing:border-box;height:80rpx;padding:0 20rpx;color:#1f2937;font-size:28rpx;background:#fff;border:2rpx solid #eee;border-radius:16rpx}
.filter-date-box .placeholder{color:#999}
.filter-date-sep{flex:none;color:#999;font-size:26rpx}
.filter-actions{display:flex;gap:20rpx}
.filter-actions button{flex:1;height:88rpx;margin:0;padding:0;font-size:30rpx;line-height:88rpx;border-radius:44rpx}
.filter-actions button::after{border:0}
.filter-reset{color:#666;background:#f3f4f6}
.filter-confirm{color:#fff;background:linear-gradient(90deg,#ff8a37,#fa3b19)}
</style>
