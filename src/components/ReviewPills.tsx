import { ReviewerInfo } from '../github';

export function ReviewPills({ reviewers }: { reviewers: ReviewerInfo[] }) {
	const approved = reviewers.filter((r) => r.state === 'APPROVED').length;
	const pending = reviewers.filter((r) => r.state === 'PENDING').length;
	const changes = reviewers.filter(
		(r) => r.state === 'CHANGES_REQUESTED',
	).length;

	if (approved === 0 && changes === 0 && pending === 0) {
		return null;
	}

	const getLabel = (): string => {
		if (approved > 0) {
			return `✓ ${approved}`;
		} else if (changes > 0) {
			return `✗ ${changes} `;
		} else if (pending > 0) {
			return `○ ${pending}`;
		}
		return '';
	};

	const getClassName = (): string => {
		if (approved > 0) {
			return 'pr-review-pill pr-review-pill--approved';
		} else if (changes > 0) {
			return 'pr-review-pill pr-review-pill--changes';
		} else if (pending > 0) {
			return 'pr-review-pill pr-review-pill--pending';
		}
		return '';
	};

	return (
		<span aria-label={`${approved} approved`} className={getClassName()}>
			{getLabel()}
		</span>
	);
}
