import { createContext, useState, ReactNode, useCallback } from 'react';
import { App } from 'obsidian';
import { GithubClient } from './github';
import { PREntry } from './types';
import type GithubReviewManager from './main';

export type AppContextType = {
	app: App;
	plugin: GithubReviewManager;
	github: GithubClient;
	entries: PREntry[];
	addPr: (url: string) => Promise<void>;
	removePr: (url: string) => void;
	refreshPr: (url: string) => Promise<void>;
	fetchAll: () => void;
};

export const AppContext = createContext({} as AppContextType);

interface AppContextWrapper {
	app: App;
	plugin: GithubReviewManager;
	github: GithubClient;
	children: ReactNode;
}

export const AppContextWrapper = ({
	app,
	plugin,
	github,
	children,
}: AppContextWrapper) => {
	const [entries, setEntries] = useState<PREntry[]>(() =>
		github.getTrackedPRs().map((url) => {
			const cached = github.getCached(url);
			return cached
				? { url, status: 'loaded', data: cached }
				: { url, status: 'loading' };
		}),
	);

	const getPrByUrl = useCallback(
		(url: string) => {
			return entries.find((e) => e.url === url);
		},
		[entries],
	);

	const fetchOne = useCallback(
		async (url: string): Promise<PREntry> => {
			const parsed = GithubClient.parsePRUrl(url);
			if (!parsed) {
				return {
					url,
					status: 'error',
					error: 'Invalid GitHub PR URL',
				};
			}

			try {
				const data = await github.fetchPullRequest(
					parsed.owner,
					parsed.repo,
					parsed.prNumber,
				);

				return { url, status: 'loaded', data };
			} catch (err) {
				return {
					url,
					status: 'error',
					error: (err as Error).message,
				};
			}
		},
		[github],
	);

	const refreshPr = useCallback(
		async (url: string) => {
			setEntries((prev) =>
				prev.map((e) =>
					e.url === url && e.status === 'loaded'
						? { ...e, status: 'refreshing', data: e.data }
						: e,
				),
			);

			const pr = await fetchOne(url);
			setEntries((prev) => prev.map((e) => (e.url === url ? pr : e)));
		},
		[fetchOne],
	);

	const fetchAll = useCallback(() => {
		const urls = github.getTrackedPRs();
		for (const url of urls) {
			const cachedPr = getPrByUrl(url);
			if (
				cachedPr &&
				cachedPr.status === 'loaded' &&
				cachedPr.data.state === 'closed'
			) {
				continue;
			}

			void refreshPr(url);
		}
	}, [github, refreshPr, getPrByUrl]);

	const addPr = useCallback(
		async (url: string) => {
			github.addPR(url);
			setEntries((prev) => [...prev, { url, status: 'loading' }]);
			const pr = await fetchOne(url);
			setEntries((prev) => prev.map((e) => (e.url === url ? pr : e)));
		},
		[github, fetchOne],
	);

	const removePr = useCallback(
		(url: string) => {
			github.removePR(url);
			setEntries((prev) => prev.filter((e) => e.url !== url));
		},
		[github],
	);

	return (
		<AppContext.Provider
			value={{
				app,
				plugin,
				github,
				entries,
				addPr,
				removePr,
				refreshPr,
				fetchAll,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};
