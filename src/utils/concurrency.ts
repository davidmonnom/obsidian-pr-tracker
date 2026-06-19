export function createLimiter(max: number) {
	let active = 0;
	const queue: Array<() => void> = [];

	return async function limit<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<void>((resolve) => {
			if (active < max) {
				active++;
				resolve();
			} else {
				queue.push(() => {
					active++;
					resolve();
				});
			}
		})
			.then(() => fn())
			.finally(() => {
				active--;
				queue.shift()?.();
			});
	};
}
