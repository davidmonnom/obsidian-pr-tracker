import { PRItem } from '../types';
import { PrItem } from './PrItem';

interface PrSectionProps {
	title: string;
	entries: PRItem[];
}

export function PrSection({ title, entries }: PrSectionProps) {
	return (
		<div className="pr-list-section">
			<div className="pr-list-section-header">
				<span className="pr-list-section-title">{title}</span>
				<span className="pr-list-section-count">{entries.length}</span>
			</div>
			{entries.map((e) => (
				<PrItem key={e.url} entry={e} />
			))}
		</div>
	);
}
