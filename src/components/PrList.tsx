import { useCallback } from 'react';
import { PREntry, LoadedPRItem } from '../types';
import { Icon } from './Icon';
import { PrSection } from './PrSection';
import { AddPrModal } from '../views/AddPrModal';
import { useApp } from '../hooks/useApp';

export function PrList() {
	const { app, github, entries, addPr, fetchAll } = useApp();

	const openAddModal = useCallback(() => {
		new AddPrModal(app, github.getTrackedPRs(), addPr).open();
	}, [app, github, addPr]);

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
						onClick={() => fetchAll()}
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
