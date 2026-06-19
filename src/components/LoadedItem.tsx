import { GithubClient } from '../github';
import { LoadedEntry } from '../types';
import { relativeDate, minutesAgo } from '../utils/dateUtils';
import { Icon } from './Icon';
import { ReviewPills } from './ReviewPills';

interface LoadedItemProps {
	entry: LoadedEntry;
	onRefresh: () => void;
	onRemove: () => void;
}

export function LoadedItem({ entry, onRefresh, onRemove }: LoadedItemProps) {
	const { data: pr } = entry;
	const isRefreshing = entry.status === 'refreshing';
	const parsed = GithubClient.parsePRUrl(pr.prUrl);

	return (
		<div className="pr-list-item">
			<div className="pr-list-item-row1">
				<span className={`pr-state-dot pr-state-dot--${pr.state}`} />
				<a
					className="pr-list-item-title"
					href={pr.prUrl}
					target="_blank"
					rel="noopener noreferrer"
				>
					{pr.title}
				</a>
				<ReviewPills reviewers={pr.reviewers} />
				{pr.state === 'open' && (
					<button
						className={`pr-list-icon-btn pr-list-item-action${isRefreshing ? ' pr-list-item-action--spinning' : ''}`}
						aria-label="Refresh"
						onClick={onRefresh}
						disabled={isRefreshing}
					>
						<Icon name="rotate-cw" />
					</button>
				)}
				<button
					className="pr-list-icon-btn pr-list-item-action"
					aria-label="Remove"
					onClick={onRemove}
				>
					<Icon name="trash-2" />
				</button>
			</div>
			<div className="pr-list-item-meta">
				{parsed && (
					<>
						<span className="pr-list-item-repo">
							{parsed.owner}/{parsed.repo}
						</span>
						<span className="pr-meta-dot">·</span>
						<span>#{parsed.prNumber}</span>
						<span className="pr-meta-dot">·</span>
					</>
				)}
				<span>{pr.author}</span>
				<span className="pr-meta-dot">·</span>
				<span title="Opened">{relativeDate(pr.createdAt)}</span>
				{pr.lastRefreshedAt && (
					<>
						<span className="pr-meta-dot">·</span>
						<span className="pr-synced-at" title="Last synced">
							{minutesAgo(pr.lastRefreshedAt)}
						</span>
					</>
				)}
				{pr.ciStatus !== 'none' && (
					<>
						<span className="pr-meta-dot">·</span>
						<span
							className={`pr-ci-badge pr-ci-badge--${pr.ciStatus}`}
						>
							{pr.ciStatus === 'success'
								? '✓'
								: pr.ciStatus === 'failure'
									? '✗'
									: '●'}{' '}
							CI
						</span>
					</>
				)}
			</div>
		</div>
	);
}
