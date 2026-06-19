import { createRoot, Root } from 'react-dom/client';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { GithubClient } from '../github';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PrListComponent } from '../components/PrListComponent';

export const PR_LIST_VIEW_TYPE = 'github-pr-list';

export class PrListView extends ItemView {
	private github: GithubClient;
	private root: Root | null = null;

	constructor(leaf: WorkspaceLeaf, github: GithubClient) {
		super(leaf);
		this.github = github;
	}

	getViewType(): string {
		return PR_LIST_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'GitHub pull requests';
	}

	getIcon(): string {
		return 'git-pull-request';
	}

	async onOpen(): Promise<void> {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<ErrorBoundary>
				<PrListComponent github={this.github} app={this.app} />
			</ErrorBoundary>,
		);
	}

	async onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;
	}
}
