import { PullRequestInfo } from './github';

export type PREntry =
	| { url: string; status: 'loading' }
	| { url: string; status: 'error'; error: string }
	| {
			url: string;
			status: 'refreshing';
			changed: boolean;
			data: PullRequestInfo;
	  }
	| {
			url: string;
			status: 'loaded';
			changed: boolean;
			data: PullRequestInfo;
	  };

export type PRItem = Extract<
	PREntry,
	{ status: 'loaded' | 'refreshing' | 'error' }
>;

export type LoadedPRItem = Extract<
	PREntry,
	{ status: 'loaded' | 'refreshing' }
>;
