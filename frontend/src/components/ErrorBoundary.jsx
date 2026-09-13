import { Component } from "react";

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-center text-slate-100">
        <div className="max-w-md rounded-3xl border border-rose-500/30 bg-rose-500/10 p-8">
          <div className="text-5xl">🐝</div>
          <h1 className="mt-4 font-heading text-2xl font-bold">Something buzzed out of place</h1>
          <p className="mt-2 text-sm text-slate-300">An unexpected error occurred. Your progress is saved on this device.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button data-testid="error-reload" onClick={() => window.location.reload()} className="rounded-xl bg-amber-500 px-5 py-2.5 font-semibold text-slate-950">Reload</button>
            <a href="/" className="rounded-xl border border-slate-700 px-5 py-2.5 font-semibold text-slate-200">Home</a>
          </div>
        </div>
      </div>
    );
  }
}
