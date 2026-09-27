<template>
	<workbench-page ref="workbench" />
</template>

<script>
	import WorkbenchPage from '@/components/workbench-page/workbench-page.vue'

	export default {
		components: { WorkbenchPage },
		onShow() {
			if (this.$refs.workbench) this.$refs.workbench.loadDashboard()
		}
	}
</script>

<style>
	page { background: #f9f9f9; }
</style>
