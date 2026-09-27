import App from './App'
import AppDialog from './components/app-dialog/app-dialog.vue'
import * as appDialog from './utils/app-dialog'

function findPageDialog(vm) {
	const children = (vm && vm.$children) || []
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (child && typeof child.showConfirm === 'function') return child
		const nested = findPageDialog(child)
		if (nested) return nested
	}
	return null
}

function isPageVm(vm) {
	const opts = (vm && vm.$options) || {}
	return opts.mpType === 'page' || /[\\/]pages[\\/]/.test(opts.__file || '') || /[\\/]pages[\\/]/.test(opts.name || '')
}

function wrapPageRender(render, isVue3, h) {
	if (isVue3) {
		return function(context, cache) {
			const root = render(context, cache)
			return h('view', { class: 'app-dialog-page-root', style: { width: '100%', height: '100%' } }, [
				root,
				h(AppDialog)
			])
		}
	}
	return function(createElement) {
		const root = render.call(this, createElement)
		return createElement('view', {
			class: ['app-dialog-page-root'],
			style: { width: '100%', height: '100%' }
		}, [root, createElement('app-dialog')])
	}
}

function installAppDialog(app, h) {
	const isVue3 = !!app.config
	app.component('app-dialog', AppDialog)
	appDialog.bindNativeDialogApis({
		showToast: uni.showToast.bind(uni),
		hideToast: uni.hideToast.bind(uni),
		showModal: uni.showModal.bind(uni),
		showLoading: uni.showLoading.bind(uni),
		hideLoading: uni.hideLoading.bind(uni)
	})
	appDialog.installNavigationGuard()
	uni.showToast = (options = {}) => {
		const duration = typeof options.duration === 'number' ? options.duration : 2200
		return appDialog.toast(options.title || '', options.icon === 'success' ? 'success' : 'error', duration)
	}
	uni.showModal = (options = {}) => {
		return appDialog.confirm(options).then(confirm => {
			const result = { confirm, cancel: !confirm }
			if (typeof options.success === 'function') options.success(result)
			return result
		})
	}
	uni.showLoading = (options = {}) => appDialog.loading(options.title || '加载中')
	uni.hideLoading = () => appDialog.hideLoading()
	app.mixin({
		beforeCreate() {
			const render = this.$options.render
			if (!isPageVm(this) || !render || this.$options.__appDialogInjected) return
			this.$options.__appDialogInjected = true
			this.$options.render = wrapPageRender(render, isVue3, h)
		},
		onShow() {
			if (!isPageVm(this)) return
			this.$nextTick(() => {
				const dialog = findPageDialog(this)
				if (dialog) appDialog.setDialogHost(dialog)
			})
		},
		onHide() {
			if (!isPageVm(this)) return
			const dialog = findPageDialog(this)
			// 离页清掉自定义弹窗 + 原生 toast，避免错误提示残留到下一页
			appDialog.dismissAllToasts()
			if (dialog) {
				if (dialog.confirmVisible && typeof dialog.closeConfirm === 'function') dialog.closeConfirm(false)
				appDialog.clearDialogHost(dialog)
			}
		}
	})
}

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
Vue.config.productionTip = false
installAppDialog({ component: Vue.component.bind(Vue), mixin: Vue.mixin.bind(Vue) }, null)
App.mpType = 'app'
const app = new Vue({
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp, h } from 'vue'
export function createApp() {
	const app = createSSRApp(App)
	installAppDialog(app, h)
	return {
		app
	}
}
// #endif
