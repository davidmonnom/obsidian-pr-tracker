import {
	createContext,
	useState,
	ReactNode,
	useCallback,
	useEffect,
} from 'react';
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
	refreshPr: (url: string, manual?: boolean) => Promise<void>;
	fetchAll: () => void;
};

export interface ActionBridge {
	addPr: ((url: string) => Promise<void>) | null;
	fetchAll: (() => void) | null;
}

export const AppContext = createContext({} as AppContextType);

interface AppContextWrapper {
	app: App;
	plugin: GithubReviewManager;
	github: GithubClient;
	actionBridge?: ActionBridge;
	children: ReactNode;
}

export const AppContextWrapper = ({
	app,
	plugin,
	github,
	actionBridge,
	children,
}: AppContextWrapper) => {
	const [entries, setEntries] = useState<PREntry[]>(() =>
		github.getTrackedPRs().map((url) => {
			const cached = github.getCached(url);
			return cached
				? { url, status: 'loaded', data: cached, changed: false }
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
				let up = false;
				const cache = getPrByUrl(url);
				const data = await github.fetchPullRequest(
					parsed.owner,
					parsed.repo,
					parsed.prNumber,
				);

				if (cache && cache.status === 'loaded') {
					const dataCopy = { ...data };
					const oldData = cache.data;
					dataCopy.lastRefreshedAt = oldData.lastRefreshedAt;
					up = JSON.stringify(oldData) !== JSON.stringify(dataCopy);
				}

				return { url, status: 'loaded', data, changed: up };
			} catch (err) {
				return {
					url,
					status: 'error',
					error: (err as Error).message,
				};
			}
		},
		[github, getPrByUrl],
	);

	const refreshPr = useCallback(
		async (url: string, manual = false) => {
			setEntries((prev) =>
				prev.map((e) =>
					e.url === url &&
					(e.status === 'loaded' || e.status === 'refreshing')
						? { ...e, status: 'refreshing' }
						: e,
				),
			);

			const pr = await fetchOne(url);
			setEntries((prev) => prev.map((e) => (e.url === url ? pr : e)));
			void manual;
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

	useEffect(() => {
		if (!actionBridge) {
			return;
		}

		actionBridge.addPr = addPr;
		actionBridge.fetchAll = fetchAll;
	}, [actionBridge, addPr, fetchAll]);

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
