export function relativeDate(isoDate: string): string {
	const diffMs = Date.now() - new Date(isoDate).getTime();
	const diffDays = Math.floor(diffMs / 86400000);
	const diffMonths = Math.floor(diffDays / 30.44);

	if (diffDays === 0) {
		return 'today';
	}

	if (diffDays === 1) {
		return '1d ago';
	}

	if (diffDays < 30) {
		return `${diffDays}d ago`;
	}

	if (diffMonths === 1) {
		return '1mo ago';
	}

	if (diffMonths < 12) {
		return `${diffMonths}mo ago`;
	}

	return `${Math.floor(diffMonths / 12)}y ago`;
}
