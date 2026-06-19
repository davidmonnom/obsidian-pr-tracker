import { App, Plugin, PluginManifest } from 'obsidian';
import { GithubReviewManagerSettingTab, loadToken } from './settings';
import { GithubClient, PersistedData } from './github';
import { PrListView, PR_LIST_VIEW_TYPE } from './views/PrListView';

export default class GithubReviewManager extends Plugin {
	github!: GithubClient;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
	}

	async onload() {
		const saved = (await this.loadData()) as Partial<PersistedData> | null;

		this.github = new GithubClient(
			loadToken(this.app),
			saved ?? {},
			(data) => void this.saveData(data),
		);

		this.registerView(
			PR_LIST_VIEW_TYPE,
			(leaf) => new PrListView(leaf, this),
		);

		this.addRibbonIcon(
			'git-pull-request',
			'Open GitHub pull request list',
			() => {
				void this.activateView();
			},
		);

		this.addCommand({
			id: 'open-github-pr-list',
			name: 'Open GitHub pull request list',
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new GithubReviewManagerSettingTab(this.app, this));
	}

	private async activateView(): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(PR_LIST_VIEW_TYPE);
		if (existing.length > 0 && existing[0]) {
			void workspace.revealLeaf(existing[0]);
			return;
		}
		const leaf = workspace.getLeaf('tab');
		await leaf.setViewState({ type: PR_LIST_VIEW_TYPE, active: true });
		void workspace.revealLeaf(leaf);
	}
}
