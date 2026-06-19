import { GithubClient } from '../github';
import { PREntry } from '../types';
import { Icon } from './Icon';

interface ErrorItemProps {
	entry: Extract<PREntry, { status: 'error' }>;
	onRetry: () => void;
	onRemove: () => void;
}

export function ErrorItem({ entry, onRetry, onRemove }: ErrorItemProps) {
	const parsed = GithubClient.parsePRUrl(entry.url);
	const label = parsed
		? `${parsed.owner}/${parsed.repo} #${parsed.prNumber}`
		: entry.url;

	return (
		<div className="pr-list-item pr-list-item--error">
			<div className="pr-list-item-row1">
				<span className="pr-state-dot pr-state-dot--error" />
				<span className="pr-list-item-error-label">{label}</span>
				<button
					className="pr-list-icon-btn pr-list-item-action"
					aria-label="Retry"
					onClick={onRetry}
				>
					<Icon name="rotate-cw" />
				</button>
				<button
					className="pr-list-icon-btn pr-list-item-action"
					aria-label="Remove"
					onClick={onRemove}
				>
					<Icon name="trash-2" />
				</button>
			</div>
			<div className="pr-list-item-error-msg">{entry.error}</div>
		</div>
	);
}
