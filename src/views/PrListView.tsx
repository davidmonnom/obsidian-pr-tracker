import { createRoot, Root } from 'react-dom/client';
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PrList } from '../components/PrList';
import { AppContextWrapper, ActionBridge } from '../context';
import GithubReviewManager from '../main';
import { GithubClient } from '../github';
import { AddPrModal } from './AddPrModal';

export const PR_LIST_VIEW_TYPE = 'github-pr-list';

export class PrListView extends ItemView {
	private plugin: GithubReviewManager;
	private github: GithubClient;
	private root: Root | null = null;
	private actionBridge: ActionBridge = { addPr: null, fetchAll: null };

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
		this.addAction('rotate-cw', 'Refresh all', () => {
			this.actionBridge.fetchAll?.();
		});
		this.addAction('plus', 'Add pull request', () => {
			if (this.actionBridge.addPr) {
				new AddPrModal(
					this.app,
					this.github.getTrackedPRs(),
					this.actionBridge.addPr,
				).open();
			}
		});

		this.root = createRoot(this.contentEl);
		this.root.render(
			<AppContextWrapper
				app={this.app}
				plugin={this.plugin}
				github={this.github}
				actionBridge={this.actionBridge}
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
