import { Component, ReactNode } from 'react';

interface Props {
	children: ReactNode;
}
interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	render() {
		if (this.state.error) {
			return (
				<div style={{ padding: '1rem', color: 'var(--text-error)' }}>
					<strong>Something went wrong</strong>
					<pre
						style={{
							fontSize: '0.8em',
							whiteSpace: 'pre-wrap',
							marginTop: '0.5rem',
						}}
					>
						{this.state.error.message}
					</pre>
				</div>
			);
		}
		return this.props.children;
	}
}
