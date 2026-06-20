import { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { App, Modal, Notice } from 'obsidian';
import { GithubClient } from '../github';

interface AddPrFormProps {
	existingUrls: string[];
	onAdd: (url: string) => Promise<void>;
	onClose: () => void;
}

function AddPrForm({ existingUrls, onAdd, onClose }: AddPrFormProps) {
	const [url, setUrl] = useState('');

	const submit = async () => {
		const trimmed = url.trim();
		if (!GithubClient.parsePRUrl(trimmed)) {
			new Notice('Invalid GitHub pull request URL');
			return;
		}

		if (existingUrls.includes(trimmed)) {
			new Notice('This pull request is already tracked');
			return;
		}

		onClose();
		try {
			await onAdd(trimmed);
		} catch {
			new Notice('Failed to save pull request. Please try again.');
		}
	};

	return (
		<form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
			<h2>Add GitHub pull request</h2>
			<label htmlFor="pr-add-modal-url" className="pr-modal-label">
				Pull request URL
			</label>
			<input
				autoFocus
				id="pr-add-modal-url"
				type="text"
				className="pr-modal-input"
				placeholder="https://github.com/owner/repo/pull/123"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
			/>
			<div className="pr-modal-buttons">
				<button type="button" onClick={onClose}>Cancel</button>
				<button type="submit" className="mod-cta">
					Add
				</button>
			</div>
		</form>
	);
}

export class AddPrModal extends Modal {
	private existingUrls: string[];
	private onAdd: (url: string) => Promise<void>;
	private root: Root | null = null;

	constructor(
		app: App,
		existingUrls: string[],
		onAdd: (url: string) => Promise<void>,
	) {
		super(app);
		this.existingUrls = existingUrls;
		this.onAdd = onAdd;
	}

	onOpen(): void {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<AddPrForm
				existingUrls={this.existingUrls}
				onAdd={this.onAdd}
				onClose={() => this.close()}
			/>,
		);
	}

	onClose(): void {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}
