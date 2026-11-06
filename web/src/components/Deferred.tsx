import { Component, Suspense, type ReactNode } from "react";

class ScreenError extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ children: ReactNode; resetKey?: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) return (
      <div className="p-6 text-ink" role="alert">
        <p>This screen couldn't load. Reload Lilt to try again.</p>
        <button onClick={() => window.location.reload()}>Reload Lilt</button>
      </div>
    );
    return this.props.children;
  }
}

/** Keep the surrounding room and microphone provider mounted while a screen loads. */
export function Deferred({ children, resetKey }: { children: ReactNode; resetKey?: string }) {
  return (
    <ScreenError resetKey={resetKey}>
      <Suspense fallback={<p className="p-6 text-ink-2" role="status">Opening…</p>}>
        {children}
      </Suspense>
    </ScreenError>
  );
}
