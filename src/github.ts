import { requestUrl } from 'obsidian';

// ── GitHub REST API shapes ────────────────────────────────────────────────────

interface GithubUser {
	login: string;
}

interface GithubReview {
	state: string;
	user: GithubUser;
}

interface GithubCommit {
	author: { login: string } | null;
	commit: { author: { name: string } };
}

interface GithubPR {
	title: string;
	state: string;
	user: GithubUser;
	created_at: string;
	updated_at: string;
	commits: number;
	additions: number;
	deletions: number;
	changed_files: number;
	comments: number;
	review_comments: number;
	head: { sha: string };
}

interface GithubCombinedStatus {
	state: 'pending' | 'success' | 'failure' | 'error';
	total_count: number;
}

// ── Public types ──────────────────────────────────────────────────────────────

export type CIStatus = 'success' | 'failure' | 'pending' | 'none';

export interface ReviewerInfo {
	login: string;
	state: string;
}

export interface PullRequestInfo {
	title: string;
	state: string;
	author: string;
	createdAt: string;
	updatedAt: string;
	lastRefreshedAt: string;
	prUrl: string;
	reviewers: ReviewerInfo[];
	committers: string[];
	commits: number;
	additions: number;
	deletions: number;
	changedFiles: number;
	comments: number;
	ciStatus: CIStatus;
}

export interface ParsedPRUrl {
	owner: string;
	repo: string;
	prNumber: string;
}

export interface PersistedData {
	trackedPRs: string[];
	prCache: Record<string, PullRequestInfo>;
}

type OnDataChange = (data: PersistedData) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeCIStatus(combined: GithubCombinedStatus): CIStatus {
	if (combined.total_count === 0) {
		return 'none';
	}

	if (combined.state === 'success') {
		return 'success';
	}

	if (combined.state === 'failure' || combined.state === 'error') {
		return 'failure';
	}

	return 'pending';
}

// ── Client ────────────────────────────────────────────────────────────────────

export class GithubClient {
	private token: string;
	private trackedPRs: string[];
	private cache: Map<string, PullRequestInfo>;
	private onDataChange?: OnDataChange;

	constructor(
		token: string,
		initialData: Partial<PersistedData> = {},
		onDataChange?: OnDataChange,
	) {
		this.token = token;
		this.trackedPRs = [...(initialData.trackedPRs ?? [])];
		this.cache = new Map(Object.entries(initialData.prCache ?? {}));
		this.onDataChange = onDataChange;
	}

	// ── Tracked PRs ───────────────────────────────────────────────────────────

	getTrackedPRs(): string[] {
		return [...this.trackedPRs];
	}

	addPR(url: string): void {
		this.trackedPRs.push(url);
		this.notify();
	}

	removePR(url: string): void {
		this.trackedPRs = this.trackedPRs.filter((u) => u !== url);
		this.cache.delete(this.normalizeUrl(url));
		this.notify();
	}

	// ── Cache ─────────────────────────────────────────────────────────────────

	getCached(url: string): PullRequestInfo | undefined {
		return this.cache.get(this.normalizeUrl(url));
	}

	// ── Token ─────────────────────────────────────────────────────────────────

	setToken(token: string): void {
		this.token = token;
	}

	// ── URL helpers ───────────────────────────────────────────────────────────

	static parsePRUrl(url: string): ParsedPRUrl | null {
		const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
		if (!match || !match[1] || !match[2] || !match[3]) return null;
		return { owner: match[1], repo: match[2], prNumber: match[3] };
	}

	private normalizeUrl(url: string): string {
		const parsed = GithubClient.parsePRUrl(url);
		if (!parsed) return url;
		return `https://github.com/${parsed.owner}/${parsed.repo}/pull/${parsed.prNumber}`;
	}

	// ── Internals ─────────────────────────────────────────────────────────────

	private notify(): void {
		this.onDataChange?.({
			trackedPRs: [...this.trackedPRs],
			prCache: Object.fromEntries(this.cache),
		});
	}

	private get headers(): Record<string, string> {
		const h: Record<string, string> = {
			Accept: 'application/vnd.github.v3+json',
		};
		if (this.token) h['Authorization'] = `token ${this.token}`;
		return h;
	}

	// ── Fetch ─────────────────────────────────────────────────────────────────

	async fetchPullRequest(
		owner: string,
		repo: string,
		prNumber: string,
	): Promise<PullRequestInfo> {
		const base = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
		const { headers } = this;

		// Fetch PR first — head SHA is needed to query commit status.
		const prRes = await requestUrl({ url: base, headers });
		if (prRes.status < 200 || prRes.status >= 300) {
			const msg =
				(prRes.json as { message?: string })?.message ??
				`HTTP ${prRes.status}`;
			throw new Error(msg);
		}
		const pr = prRes.json as GithubPR;

		// Fetch reviews, commits, and commit status in parallel.
		const statusUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${pr.head.sha}/status`;
		const [reviewsRes, commitsRes, checksRes] = await Promise.all([
			requestUrl({ url: `${base}/reviews`, headers }),
			requestUrl({ url: `${base}/commits`, headers }),
			requestUrl({ url: statusUrl, headers }).catch(() => null),
		]);

		for (const res of [reviewsRes, commitsRes]) {
			if (res.status < 200 || res.status >= 300) {
				const msg =
					(res.json as { message?: string })?.message ??
					`HTTP ${res.status}`;
				throw new Error(msg);
			}
		}

		const reviews = reviewsRes.json as GithubReview[];
		const commits = commitsRes.json as GithubCommit[];

		// Commit status is optional — a 403/404 gracefully becomes 'none'.
		const ciStatus: CIStatus =
			checksRes !== null &&
			checksRes.status >= 200 &&
			checksRes.status < 300
				? computeCIStatus(checksRes.json as GithubCombinedStatus)
				: 'none';

		const reviewerMap = new Map<string, string>();
		for (const review of reviews) {
			if (review.state !== 'COMMENTED') {
				reviewerMap.set(review.user.login, review.state);
			}
		}

		const committerSet = new Set<string>();
		for (const commit of commits) {
			const login = commit.author?.login ?? commit.commit.author.name;
			committerSet.add(login);
		}

		const result: PullRequestInfo = {
			title: pr.title,
			state: pr.state,
			author: pr.user.login,
			createdAt: pr.created_at,
			updatedAt: pr.updated_at,
			lastRefreshedAt: new Date().toISOString(),
			prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
			reviewers: Array.from(reviewerMap.entries()).map(
				([login, state]) => ({ login, state }),
			),
			committers: Array.from(committerSet),
			commits: pr.commits,
			additions: pr.additions,
			deletions: pr.deletions,
			changedFiles: pr.changed_files,
			comments: pr.comments + pr.review_comments,
			ciStatus,
		};

		this.cache.set(result.prUrl, result);
		this.notify();

		return result;
	}
}
