import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Krumpanion UI error", error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="panel panel-danger">
          <h2>Something went wrong</h2>
          <p>Krumpanion hit an unexpected UI error. Reload the page to recover.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
