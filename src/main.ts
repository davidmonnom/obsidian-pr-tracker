import { Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	GithubReviewManagerSettings,
	GithubReviewManagerSettingTab,
	loadToken,
} from './settings';
import { GithubClient } from './github';
import { PrListView, PR_LIST_VIEW_TYPE } from './views/PrListView';

export default class GithubReviewManager extends Plugin {
	settings!: GithubReviewManagerSettings;
	github!: GithubClient;

	async onload() {
		await this.loadSettings();
		this.github = new GithubClient(loadToken(this.app));

		this.registerView(
			PR_LIST_VIEW_TYPE,
			(leaf) => new PrListView(
				leaf,
				this.github,
				() => this.settings.trackedPRs,
				async (url: string) => {
					this.settings.trackedPRs.push(url);
					await this.saveSettings();
				},
				async (url: string) => {
					this.settings.trackedPRs = this.settings.trackedPRs.filter((u) => u !== url);
					await this.saveSettings();
				},
			),
		);

		this.addRibbonIcon('git-pull-request', 'Open GitHub pull request list', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-github-pr-list',
			name: 'Open GitHub pull request list',
			callback: () => { void this.activateView(); },
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

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<GithubReviewManagerSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
