import { GithubClient } from '../github';
import { useApp } from '../hooks/useApp';
import { PRItem } from '../types';
import { relativeDate, minutesAgo } from '../utils/dateUtils';
import { Icon } from './Icon';
import { ReviewPills } from './ReviewPills';

interface PrItemProps {
	entry: PRItem;
}

export function PrItem({ entry }: PrItemProps) {
	const { refreshPr, removePr } = useApp();
	const parsed = GithubClient.parsePRUrl(entry.url);
	const isRefreshing = entry.status === 'refreshing';

	if (entry.status === 'error') {
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
						onClick={() => void refreshPr(entry.url, true)}
					>
						<Icon name="rotate-cw" />
					</button>
					<button
						className="pr-list-icon-btn pr-list-item-action"
						aria-label="Remove"
						onClick={() => removePr(entry.url)}
					>
						<Icon name="trash-2" />
					</button>
				</div>
				<div className="pr-list-item-error-msg">{entry.error}</div>
			</div>
		);
	}

	const pr = entry.data;

	const ciLabel =
		pr.ciStatus === 'success'
			? '✓ CI'
			: pr.ciStatus === 'failure'
				? '✗ CI'
				: '● CI';

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
				{pr.ciStatus !== 'none' && (
					<span className={`pr-ci-badge pr-ci-badge--${pr.ciStatus}`}>
						{ciLabel}
					</span>
				)}
				{pr.state === 'open' && (
					<button
						className={`pr-list-icon-btn pr-list-item-action${isRefreshing ? ' pr-list-item-action--spinning' : ''}`}
						aria-label="Refresh"
						onClick={() => void refreshPr(entry.url, true)}
						disabled={isRefreshing}
					>
						<Icon name="rotate-cw" />
					</button>
				)}
				<button
					className="pr-list-icon-btn pr-list-item-action"
					aria-label="Remove"
					onClick={() => removePr(entry.url)}
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
				<span className="pr-meta-dot">·</span>
				<span className="pr-diff-stats">
					<span className="pr-diff-add" title="Additions">
						+{pr.additions}
					</span>
					<span className="pr-diff-del" title="Deletions">
						-{pr.deletions}
					</span>
				</span>
				{pr.comments > 0 && (
					<>
						<span className="pr-meta-dot">·</span>
						<span title="Comments">
							{pr.comments}{' '}
							{pr.comments === 1 ? 'comment' : 'comments'}
						</span>
					</>
				)}
				{pr.lastRefreshedAt && (
					<>
						<span className="pr-meta-dot">·</span>
						<span className="pr-synced-at" title="Last synced">
							{minutesAgo(pr.lastRefreshedAt)}
						</span>
					</>
				)}
			</div>
		</div>
	);
}
