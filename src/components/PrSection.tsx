import { LoadedEntry } from '../types';
import { LoadedItem } from './LoadedItem';

interface PrSectionProps {
	title: string;
	entries: LoadedEntry[];
	onRefresh: (url: string) => void;
	onRemove: (url: string) => void;
}

export function PrSection({
	title,
	entries,
	onRefresh,
	onRemove,
}: PrSectionProps) {
	return (
		<div className="pr-list-section">
			<div className="pr-list-section-header">
				<span className="pr-list-section-title">{title}</span>
				<span className="pr-list-section-count">{entries.length}</span>
			</div>
			{entries.map((e) => (
				<LoadedItem
					key={e.url}
					entry={e}
					onRefresh={() => onRefresh(e.url)}
					onRemove={() => onRemove(e.url)}
				/>
			))}
		</div>
	);
}
