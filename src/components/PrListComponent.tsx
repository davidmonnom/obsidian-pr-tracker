import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'obsidian';
import { GithubClient } from '../github';
import { PREntry, LoadedEntry } from '../types';
import { createLimiter } from '../utils/concurrency';
import { Icon } from './Icon';
import { ErrorItem } from './ErrorItem';
import { PrSection } from './PrSection';
import { AddPrModal } from '../views/AddPrModal';

export interface PrListProps {
	github: GithubClient;
	getPRUrls: () => string[];
	onAddPR: (url: string) => Promise<void>;
	onRemovePR: (url: string) => Promise<void>;
	app: App;
}

export function PrListComponent({
	github,
	getPRUrls,
	onAddPR,
	onRemovePR,
	app,
}: PrListProps) {
	const [entries, setEntries] = useState<PREntry[]>([]);
	const abortRef = useRef<AbortController | null>(null);
	const limiterRef = useRef(createLimiter(5));
	const entriesRef = useRef<PREntry[]>([]);
	entriesRef.current = entries;

	// Abort all in-flight requests when the view is closed.
	useEffect(() => {
		abortRef.current = new AbortController();
		return () => abortRef.current?.abort();
	}, []);

	const fetchOne = useCallback(
		async (url: string) => {
			const parsed = GithubClient.parsePRUrl(url);
			setEntries((prev) =>
				// Keep old data visible during re-fetch to avoid blank flash.
				prev.map((e) => {
					if (e.url !== url) {
						return e;
					}

					if (!parsed) {
						return {
							url,
							status: 'error',
							error: 'Invalid GitHub PR URL',
						};
					}

					return e.status === 'loaded' || e.status === 'refreshing'
						? { url, status: 'refreshing', data: e.data }
						: { url, status: 'loading' };
				}),
			);

			if (!parsed) {
				return;
			}

			try {
				const data = await github.fetchPullRequest(
					parsed.owner,
					parsed.repo,
					parsed.prNumber,
				);
				if (abortRef.current?.signal.aborted) {
					return;
				}

				setEntries((prev) =>
					prev.map((e) =>
						e.url === url ? { url, status: 'loaded', data } : e,
					),
				);
			} catch (err) {
				if (abortRef.current?.signal.aborted) {
					return;
				}

				setEntries((prev) =>
					prev.map((e) =>
						e.url === url
							? {
									url,
									status: 'error',
									error: (err as Error).message,
								}
							: e,
					),
				);
			}
		},
		[github],
	);

	// Preserve loaded data as 'refreshing' on full refresh avoids blanking the whole list.
	// Closed PRs are skipped — their state won't change.
	const fetchAll = useCallback(() => {
		const urls = getPRUrls();
		setEntries((prev) =>
			urls.map((url) => {
				const pr = prev.find((e) => e.url === url);
				if (
					pr &&
					(pr.status === 'loaded' || pr.status === 'refreshing')
				) {
					if (pr.data.state !== 'open')
						return { url, status: 'loaded', data: pr.data };
					return { url, status: 'refreshing', data: pr.data };
				}
				return { url, status: 'loading' };
			}),
		);

		for (const url of urls) {
			const e = entriesRef.current.find((p) => p.url === url);
			const isClosed =
				e &&
				(e.status === 'loaded' || e.status === 'refreshing') &&
				e.data.state !== 'open';
			if (!isClosed) void limiterRef.current(() => fetchOne(url));
		}
	}, [getPRUrls, fetchOne]);

	// Initial load on mount only.
	const fetchAllRef = useRef(fetchAll);
	fetchAllRef.current = fetchAll;
	useEffect(() => {
		fetchAllRef.current();
	}, []);

	const handleAdd = useCallback(
		async (url: string) => {
			await onAddPR(url);
			setEntries((prev) => [...prev, { url, status: 'loading' }]);
			void limiterRef.current(() => fetchOne(url));
		},
		[onAddPR, fetchOne],
	);

	const handleRemove = useCallback(
		async (url: string) => {
			setEntries((prev) => prev.filter((e) => e.url !== url));
			await onRemovePR(url);
		},
		[onRemovePR],
	);

	const openAddModal = useCallback(() => {
		new AddPrModal(app, getPRUrls(), handleAdd).open();
	}, [app, getPRUrls, handleAdd]);

	const byUpdated = (a: LoadedEntry, b: LoadedEntry) =>
		b.data.updatedAt.localeCompare(a.data.updatedAt);

	const { loadingCount, openEntries, closedEntries, errorEntries } =
		entries.reduce(
			(acc, e) => {
				if (e.status === 'loading') {
					acc.loadingCount++;
				} else if (e.status === 'error') {
					acc.errorEntries.push(e);
				} else if (e.status === 'loaded' || e.status === 'refreshing') {
					(e.data.state === 'open'
						? acc.openEntries
						: acc.closedEntries
					).push(e);
				}
				return acc;
			},
			{
				loadingCount: 0,
				openEntries: [] as LoadedEntry[],
				closedEntries: [] as LoadedEntry[],
				errorEntries: [] as Extract<PREntry, { status: 'error' }>[],
			},
		);

	openEntries.sort(byUpdated);
	closedEntries.sort(byUpdated);

	return (
		<div className="pr-list-root">
			<div className="pr-list-header">
				<span className="pr-list-header-title">
					GitHub pull requests
				</span>
				<div className="pr-list-header-actions">
					<button
						className="pr-list-icon-btn"
						aria-label="Add pull request"
						onClick={openAddModal}
					>
						<Icon name="plus" />
					</button>
					<button
						className="pr-list-icon-btn"
						aria-label="Refresh all"
						onClick={fetchAll}
					>
						<Icon name="rotate-cw" />
					</button>
				</div>
			</div>

			<div className="pr-list-body">
				{entries.length === 0 && (
					<div className="pr-list-empty">
						<div>No pull requests tracked yet.</div>
						<button
							className="pr-list-empty-btn"
							onClick={openAddModal}
						>
							Add a pull request
						</button>
					</div>
				)}

				{loadingCount > 0 && (
					<div className="pr-list-progress">
						<div className="pr-card-spinner" />
						<span>
							Loading {loadingCount} of {entries.length}…
						</span>
					</div>
				)}

				{openEntries.length > 0 && (
					<PrSection
						title="Open"
						entries={openEntries}
						onRefresh={(url) => void fetchOne(url)}
						onRemove={(url) => void handleRemove(url)}
					/>
				)}

				{closedEntries.length > 0 && (
					<PrSection
						title="Closed"
						entries={closedEntries}
						onRefresh={(url) => void fetchOne(url)}
						onRemove={(url) => void handleRemove(url)}
					/>
				)}

				{errorEntries.length > 0 && (
					<div className="pr-list-section">
						<div className="pr-list-section-header">
							<span className="pr-list-section-title">
								Failed
							</span>
							<span className="pr-list-section-count">
								{errorEntries.length}
							</span>
						</div>
						{errorEntries.map((e) => (
							<ErrorItem
								key={e.url}
								entry={e}
								onRetry={() => void fetchOne(e.url)}
								onRemove={() => void handleRemove(e.url)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
