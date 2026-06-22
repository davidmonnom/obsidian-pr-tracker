import { useState, useMemo, useDeferredValue } from 'react';
import { GithubClient } from '../github';
import { PREntry, LoadedPRItem } from '../types';
import { PrSection } from './PrSection';
import { useApp } from '../hooks/useApp';

export function PrList() {
	const { entries } = useApp();
	const [filter, setFilter] = useState('');
	const deferredFilter = useDeferredValue(filter);
	const searchIndex = useMemo(
		() =>
			entries.map((e) => {
				if (e.status === 'loading' || e.status === 'error') {
					return { entry: e, key: e.url.toLowerCase() };
				}
				const parsed = GithubClient.parsePRUrl(e.url);
				const key = [
					e.data?.title,
					e.data?.author,
					e.data?.baseBranch,
					parsed ? `${parsed.owner}/${parsed.repo}` : '',
				]
					.join('')
					.toLowerCase();
				return { entry: e, key };
			}),
		[entries],
	);

	const visibleEntries = useMemo(() => {
		const query = deferredFilter.toLowerCase().trim();
		if (!query) {
			return entries;
		}

		return searchIndex
			.filter(({ key }) => key.includes(query))
			.map(({ entry }) => entry);
	}, [deferredFilter, searchIndex, entries]);

	const byUpdated = (a: LoadedPRItem, b: LoadedPRItem) =>
		b.data.updatedAt.localeCompare(a.data.updatedAt);

	const { loadingCount, openEntries, closedEntries, errorEntries } =
		visibleEntries.reduce(
			(acc, e) => {
				if (e.status === 'loading') {
					acc.loadingCount++;
				} else if (e.status === 'error') {
					acc.errorEntries.push(e);
				} else if (e.status === 'loaded' || e.status === 'refreshing') {
					const isOpen = e.data.state === 'open';
					const data = isOpen ? acc.openEntries : acc.closedEntries;
					data.push(e);
				}
				return acc;
			},
			{
				loadingCount: 0,
				openEntries: [] as LoadedPRItem[],
				closedEntries: [] as LoadedPRItem[],
				errorEntries: [] as Extract<PREntry, { status: 'error' }>[],
			},
		);

	openEntries.sort(byUpdated);
	closedEntries.sort(byUpdated);

	const hasNoResults =
		deferredFilter.trim() !== '' &&
		loadingCount === 0 &&
		openEntries.length === 0 &&
		closedEntries.length === 0 &&
		errorEntries.length === 0;

	return (
		<div className="pr-list-root">
			{entries.length > 0 && (
				<input
					className="pr-list-filter-input"
					type="text"
					placeholder="Filter by title, repo, author…"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				/>
			)}

			<div className="pr-list-body">
				{entries.length === 0 && (
					<div className="pr-list-empty">
						<div>No pull requests tracked yet.</div>
					</div>
				)}

				{hasNoResults && (
					<div className="pr-list-empty">
						<div>No results for "{filter}"</div>
					</div>
				)}

				{loadingCount > 0 && (
					<div className="pr-list-progress">
						<div className="pr-card-spinner" />
						<span>
							Loading {loadingCount} of {entries.length}...
						</span>
					</div>
				)}

				{openEntries.length > 0 && (
					<PrSection title="Open" entries={openEntries} />
				)}

				{closedEntries.length > 0 && (
					<PrSection title="Closed" entries={closedEntries} />
				)}

				{errorEntries.length > 0 && (
					<PrSection title="Failed" entries={errorEntries} />
				)}
			</div>
		</div>
	);
}
