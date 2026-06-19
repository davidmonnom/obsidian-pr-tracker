import { ReviewerInfo } from '../github';

interface ReviewState {
	approved: number;
	changes: number;
	pending: number;
}

function countStates(reviewers: ReviewerInfo[]): ReviewState {
	return {
		approved: reviewers.filter((r) => r.state === 'APPROVED').length,
		pending: reviewers.filter((r) => r.state === 'PENDING').length,
		changes: reviewers.filter((r) => r.state === 'CHANGES_REQUESTED')
			.length,
	};
}

export function ReviewPills({ reviewers }: { reviewers: ReviewerInfo[] }) {
	const { approved, changes, pending } = countStates(reviewers);

	if (approved === 0 && changes === 0 && pending === 0) return null;

	// Show the most severe state only — changes-requested beats approved beats pending.
	if (changes > 0) {
		return (
			<span className="pr-review-pill pr-review-pill--changes">
				✗ {changes}
			</span>
		);
	}
	if (approved > 0) {
		return (
			<span className="pr-review-pill pr-review-pill--approved">
				✓ {approved}
			</span>
		);
	}
	return (
		<span className="pr-review-pill pr-review-pill--pending">
			○ {pending}
		</span>
	);
}
