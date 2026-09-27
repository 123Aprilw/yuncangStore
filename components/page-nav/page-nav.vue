<template>
	<view class="page-nav" :class="{ 'page-nav--transparent': transparent }" :style="{ height: navHeight }">
		<view
			v-if="showBack"
			class="page-nav__back"
			:style="rowStyle"
			@tap="onBack"
		>
			<slot name="back">
				<image class="page-nav__back-icon" :class="{ 'page-nav__back-icon--rotate': rotateBack }" :src="backIcon" mode="aspectFit" />
			</slot>
		</view>
		<view class="page-nav__title" :style="rowStyle">
			<slot name="title">
				<text class="page-nav__title-text">{{ title }}</text>
			</slot>
		</view>
		<view class="page-nav__right" :style="rightStyle">
			<slot name="right" />
		</view>
	</view>
</template>

<script>
import { getCapsuleLayout, capsuleStyleVars } from '@/utils/capsule'
import { navigateBack } from '@/utils/nav'

export default {
	name: 'PageNav',
	props: {
		title: { type: String, default: '' },
		showBack: { type: Boolean, default: true },
		autoBack: { type: Boolean, default: true },
		fallback: { type: String, default: '/pages/workbench/warehouse-opened' },
		backIcon: { type: String, default: '/static/order-detail/pay-back.svg' },
		transparent: { type: Boolean, default: false },
		rotateBack: { type: Boolean, default: true }
	},
	data() {
		const layout = getCapsuleLayout()
		const vars = capsuleStyleVars(layout)
		return {
			navHeight: vars.navHeight,
			capsuleTop: vars.capsuleTop,
			capsuleSize: vars.capsuleSize,
			capsuleRightPx: layout.capsuleRight + layout.capsuleWidth + 8
		}
	},
	computed: {
		rowStyle() {
			return {
				top: this.capsuleTop,
				height: this.capsuleSize,
				lineHeight: this.capsuleSize
			}
		},
		rightStyle() {
			return {
				...this.rowStyle,
				right: this.capsuleRightPx + 'px'
			}
		}
	},
	created() {
		this.syncLayout()
	},
	methods: {
		syncLayout() {
			const layout = getCapsuleLayout(true)
			const vars = capsuleStyleVars(layout)
			this.navHeight = vars.navHeight
			this.capsuleTop = vars.capsuleTop
			this.capsuleSize = vars.capsuleSize
			this.capsuleRightPx = layout.capsuleRight + layout.capsuleWidth + 8
			this.$emit('layout', layout)
		},
		onBack() {
			this.$emit('back')
			if (this.autoBack) navigateBack(this.fallback)
		}
	}
}
</script>

<style scoped>
.page-nav {
	position: relative;
	z-index: 20;
	width: 100%;
	box-sizing: border-box;
	background: #fff;
	flex-shrink: 0;
}
.page-nav--transparent {
	background: transparent;
}
.page-nav__back {
	position: absolute;
	left: 16rpx;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 64rpx;
	box-sizing: border-box;
}
.page-nav__back-icon {
	width: 48rpx;
	height: 48rpx;
}
.page-nav__back-icon--rotate {
	transform: rotate(90deg);
}
.page-nav__title {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 120rpx;
	box-sizing: border-box;
	overflow: hidden;
	font-size: 32rpx;
	font-weight: 500;
	white-space: nowrap;
	pointer-events: none;
}
.page-nav__title-text {
	overflow: hidden;
	text-overflow: ellipsis;
}
.page-nav__right {
	position: absolute;
	right: 24rpx;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	min-width: 56rpx;
	box-sizing: border-box;
	pointer-events: auto;
}
</style>
