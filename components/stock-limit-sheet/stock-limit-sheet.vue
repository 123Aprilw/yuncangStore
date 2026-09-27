<template>
	<view class="stock-limit-overlay" @tap="$emit('close')">
		<view class="stock-limit-sheet" @tap.stop>
			<view class="drag-handle" />
			<text class="sheet-title">设置库存下限</text>

			<view class="info-card">
				<view class="info-row"><text>商品名称</text><text>{{ productName }}</text></view>
				<view class="info-row inventory-row">
					<text>当前库存</text>
					<view>
						<text class="inventory-value">{{ stock }}</text>
						<text v-if="isLow" class="low-tag">库存偏低</text>
						<text v-else class="ok-tag">库存充足</text>
					</view>
				</view>
				<view class="info-row unit-row"><text>计量单位</text><view><text class="unit-text">盒</text></view></view>
			</view>

			<view class="limit-field">
				<text class="field-label">下限数量</text>
				<view class="input-wrap">
					<input v-model="localLimit" type="number" maxlength="8" />
					<text class="input-unit">盒</text>
				</view>
			</view>

			<view class="rule-tip">
				<image class="rule-tip-icon" src="/static/stock-limit/figma-tip.png" mode="scaleToFill" />
				<text>当库存低于或等于 <text class="rule-number">{{ previewLimit }}</text>盒时，系统将自动发送预警提醒</text>
			</view>

			<view class="actions">
				<button class="cancel" @tap="$emit('close')">取消</button>
				<button class="save" @tap="save">确认保存</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		props: {
			productName: { type: String, default: '商品A' },
			stock: { type: Number, default: 0 },
			limit: { type: Number, default: 0 }
		},
		data() {
			return { localLimit: this.limit > 0 ? String(this.limit) : '' }
		},
		computed: {
			previewLimit() {
				const value = Number(this.localLimit)
				return value > 0 ? value : 0
			},
			isLow() {
				const limit = this.previewLimit
				return limit > 0 && Number(this.stock) <= limit
			}
		},
		methods: {
			save() {
				const value = Number(this.localLimit)
				if (!Number.isFinite(value) || value < 1 || Math.floor(value) !== value) {
					uni.showToast({ title: '请输入正确的下限数量', icon: 'none' })
					return
				}
				this.$emit('save', value)
			}
		}
	}
</script>

<style scoped>
	.stock-limit-overlay { position: fixed; z-index: 1000; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,.82); font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
	.stock-limit-sheet { position: absolute; bottom: 0; left: 0; box-sizing: border-box; width: 100%; height: 1086rpx; overflow: hidden; background: linear-gradient(180deg,#fffaeb 0%,#fff 100%); border-radius: 48rpx 48rpx 0 0; box-shadow: 0 -20rpx 40rpx rgba(0,0,0,.15); }
	.drag-handle { position: absolute; top: 24rpx; left: 50%; width: 96rpx; height: 8rpx; background: #d1d5db; border-radius: 20rpx; opacity: .5; transform: translateX(-50%); }
	.sheet-title { position: absolute; top: 62rpx; left: 0; width: 100%; color: #1f2937; font-size: 40rpx; line-height: 56rpx; letter-spacing: 1rpx; text-align: center; }
	.info-card { position: absolute; top: 172rpx; left: 46rpx; box-sizing: border-box; width: 660rpx; height: 328rpx; padding: 24rpx; background: rgba(255,255,255,.92); border-radius: 24rpx; backdrop-filter: blur(12rpx); }
	.info-row { display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; height: 82rpx; color: #414755; font-size: 28rpx; line-height: 44rpx; border-bottom: 2rpx solid rgba(193,198,215,.2); }
	.info-row > text:last-child { color: #1a1c1c; max-width: 420rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.inventory-row { height: 100rpx; }
	.inventory-row > view { display: flex; align-items: center; }
	.inventory-value { color: #1a1c1c; font-family: "Courier New", monospace; font-size: 36rpx; font-weight: 700; line-height: 48rpx; letter-spacing: -.72rpx; }
	.low-tag { margin-left: 16rpx; padding: 4rpx 16rpx; color: #93000a; font-size: 24rpx; line-height: 32rpx; background: rgba(255,218,214,.5); border-radius: 4rpx; }
	.ok-tag { margin-left: 16rpx; padding: 4rpx 16rpx; color: #3b6d0b; font-size: 24rpx; line-height: 32rpx; background: rgba(98,193,14,.12); border-radius: 4rpx; }
	.unit-row { height: 98rpx; border-bottom: 0; }
	.unit-row > view { display: flex; align-items: center; color: #1a1c1c; }
	.unit-text { color: #1a1c1c; font-size: 28rpx; line-height: 44rpx; }
	.limit-field { position: absolute; top: 530rpx; left: 46rpx; width: 660rpx; }
	.field-label { display: block; color: #414755; font-size: 24rpx; line-height: 32rpx; }
	.input-wrap { position: relative; display: flex; align-items: center; box-sizing: border-box; width: 100%; height: 104rpx; margin-top: 16rpx; padding: 0 34rpx; background: #fff; border: 2rpx solid #c1c6d7; border-radius: 24rpx; }
	.input-wrap input { flex: 1; height: 100rpx; color: #1a1c1c; font-family: "Courier New", monospace; font-size: 36rpx; font-weight: 700; line-height: 100rpx; letter-spacing: -.72rpx; }
	.input-unit { flex: 0 0 auto; color: #414755; font-size: 28rpx; line-height: 44rpx; }
	.rule-tip { position: absolute; top: 700rpx; left: 46rpx; display: flex; align-items: flex-start; box-sizing: border-box; width: 660rpx; min-height: 160rpx; padding: 34rpx; color: #414755; font-size: 28rpx; line-height: 46rpx; background: rgba(249,115,22,.08); border: 2rpx solid #f97316; border-radius: 24rpx; }
	.rule-tip-icon { display: block; flex: 0 0 72rpx; width: 72rpx; min-width: 72rpx; height: 106rpx; margin-right: 16rpx; opacity: 1; }
	.rule-number { color: #1a1c1c; font-family: "Courier New", monospace; font-weight: 700; }
	.actions { position: absolute; top: 916rpx; left: 30rpx; display: flex; gap: 34rpx; width: 690rpx; }
	.actions button { display: flex; flex: 1; align-items: center; justify-content: center; height: 96rpx; margin: 0; padding: 0; font-size: 32rpx; font-weight: 500; line-height: 48rpx; border: 0; border-radius: 60rpx; }
	.actions button::after { border: 0; }
	.cancel { color: #656565; background: #f7f7f7; }
	.save { color: #fff; background: linear-gradient(90deg,#fb3b19,#f97316); }
</style>
