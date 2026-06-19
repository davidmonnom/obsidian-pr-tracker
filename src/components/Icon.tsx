import { useEffect, useRef } from 'react';
import { setIcon } from 'obsidian';

export function Icon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}

		el.replaceChildren();
		setIcon(el, name);
	}, [name]);

	return <span ref={ref} />;
}
