import { useState, useEffect } from 'react';

function formatElapsed(diffMs: number): string {
	const totalSecs = Math.floor(diffMs / 1000);
	const secs = totalSecs % 60;
	const totalMins = Math.floor(totalSecs / 60);
	const mins = totalMins % 60;
	const hours = Math.floor(totalMins / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h ago`;
	if (hours > 0) return `${hours}h ${mins}m ago`;
	if (mins > 0) return `${mins}m ${secs}s ago`;
	return `${totalSecs}s ago`;
}

function tickInterval(diffMs: number): number {
	const totalSecs = Math.floor(diffMs / 1000);
	const totalMins = Math.floor(totalSecs / 60);
	const hours = Math.floor(totalMins / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return 3600000; // refresh hourly
	if (hours > 0) return 60000; // refresh every minute
	if (totalMins > 0) return 1000; // refresh every second
	return 1000;
}

type TimerState = {
	timeLabel: string;
	diffMs: number;
};

export function useTimer(isoDate: string | null): TimerState {
	const [timeLabel, setTimeLabel] = useState('');
	const [diffMs, setDiffMs] = useState(
		isoDate ? Date.now() - new Date(isoDate).getTime() : 0,
	);

	useEffect(() => {
		if (!isoDate) return;

		let id: number;

		const schedule = () => {
			const diffMs = Date.now() - new Date(isoDate).getTime();
			setDiffMs(diffMs);
			setTimeLabel(formatElapsed(diffMs));
			id = window.setTimeout(() => {
				schedule();
			}, tickInterval(diffMs));
		};

		schedule();
		return () => window.clearTimeout(id);
	}, [isoDate]);

	return { timeLabel, diffMs };
}
