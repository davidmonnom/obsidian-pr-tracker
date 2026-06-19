import { PullRequestInfo } from './github';

export type PREntry =
	| { url: string; status: 'loading' }
	| { url: string; status: 'refreshing'; data: PullRequestInfo }
	| { url: string; status: 'error'; error: string }
	| { url: string; status: 'loaded'; data: PullRequestInfo };

export type LoadedEntry = Extract<PREntry, { status: 'loaded' | 'refreshing' }>;
