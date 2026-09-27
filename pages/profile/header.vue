<template>
	<page-nav :title="title" :fallback="fallback" />
</template>

<script>
import PageNav from '@/components/page-nav/page-nav.vue'

export default {
	components: { PageNav },
	props: {
		title: String,
		fallback: {
			type: String,
			default: '/pages/profile/index'
		}
	}
}
</script>
