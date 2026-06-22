import { PREntry, LoadedPRItem } from '../types';
import { PrSection } from './PrSection';
import { useApp } from '../hooks/useApp';

export function PrList() {
	const { entries } = useApp();

	const byUpdated = (a: LoadedPRItem, b: LoadedPRItem) =>
		b.data.updatedAt.localeCompare(a.data.updatedAt);

	const { loadingCount, openEntries, closedEntries, errorEntries } =
		entries.reduce(
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

	return (
		<div className="pr-list-root">
			<div className="pr-list-body">
				{entries.length === 0 && (
					<div className="pr-list-empty">
						<div>No pull requests tracked yet.</div>
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
