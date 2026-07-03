import { Component } from "react";

/**
 * Error boundary component that catches JavaScript errors in child components.
 * Displays a fallback UI instead of crashing the entire widget.
 *
 * @example
 * <ErrorBoundary
 *   fallback={<div>Something went wrong</div>}
 *   onError={(error) => console.error(error)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="text-destructive font-medium mb-2">
            Something went wrong
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors">
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `WidgetErrorBoundary [${this.props.widgetName ?? "Unknown"}]:`,
      error,
      errorInfo
    );
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center p-6 text-center bg-destructive/5 rounded-lg border border-destructive/20">
          <div className="text-destructive font-medium mb-2">
            {this.props.widgetName
              ? `${this.props.widgetName} encountered an error`
              : "Widget error"}
          </div>
          <p className="text-muted-foreground text-sm mb-4">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors">
            Reset widget
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
