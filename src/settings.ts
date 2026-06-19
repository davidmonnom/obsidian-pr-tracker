import { App, PluginSettingTab, Setting } from 'obsidian';
import GithubReviewManager from './main';

export interface GithubReviewManagerSettings {
	trackedPRs: string[];
}

export const DEFAULT_SETTINGS: GithubReviewManagerSettings = {
	trackedPRs: [],
};

const SECRET_ID = 'github-pat';

export class GithubReviewManagerSettingTab extends PluginSettingTab {
	plugin: GithubReviewManager;

	constructor(app: App, plugin: GithubReviewManager) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		let saveTimer: number | null = null;
		containerEl.empty();

		new Setting(containerEl)
			.setName('GitHub access token')
			.setDesc(
				'Used to access the GitHub API. Stored in the system keychain, never written to disk.',
			)
			.addText((text) => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your GitHub personal access token')
					.setValue(this.app.secretStorage.getSecret(SECRET_ID) ?? '')
					.onChange((value) => {
						if (saveTimer !== null) {
							window.clearTimeout(saveTimer);
						}

						saveTimer = window.setTimeout(() => {
							void this.app.secretStorage.setSecret(
								SECRET_ID,
								value,
							);
							this.plugin.github.setToken(value);
						}, 500);
					});
			});
	}
}

export function loadToken(app: App): string {
	return app.secretStorage.getSecret(SECRET_ID) ?? '';
}
