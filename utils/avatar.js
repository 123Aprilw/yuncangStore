/** 小程序头像展示：过滤 data-URI / 内网地址，加载失败时交给调用方回退占位图 */
const PLACEHOLDER = '/static/profile/avatar-placeholder.svg'

export function avatarPlaceholder() {
	return PLACEHOLDER
}

export function resolveAvatar(url) {
	const src = String(url || '').trim()
	if (!src) return ''
	if (src.indexOf('data:') === 0) return ''
	if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(src)) {
		return ''
	}
	return src
}

export function displayAvatar(url) {
	return resolveAvatar(url) || PLACEHOLDER
}
