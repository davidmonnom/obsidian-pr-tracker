import { createRoot, Root } from 'react-dom/client';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PrList } from '../components/PrList';
import { AppContextWrapper } from '../context';
import GithubReviewManager from '../main';
import { GithubClient } from '../github';

export const PR_LIST_VIEW_TYPE = 'github-pr-list';

export class PrListView extends ItemView {
	private plugin: GithubReviewManager;
	private github: GithubClient;
	private root: Root | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: GithubReviewManager) {
		super(leaf);
		this.plugin = plugin;
		this.github = plugin.github;
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
			<AppContextWrapper
				app={this.app}
				plugin={this.plugin}
				github={this.github}
			>
				<ErrorBoundary>
					<PrList />
				</ErrorBoundary>
			</AppContextWrapper>,
		);
	}

	async onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;
	}
}
