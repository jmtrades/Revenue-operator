"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { reportError, categorizeError, type ErrorCategory } from "@/lib/error-reporting";

export type ErrorBoundaryMessages = {
  getMessage: (category: ErrorCategory) => { title: string; body: string };
  tryAgain: string;
  report: string;
};

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  messages?: ErrorBoundaryMessages;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorCategory: ErrorCategory;
};

function getMessage(category: ErrorCategory): { title: string; body: string } {
  switch (category) {
    case "network":
      return {
        title: "Connection problem",
        body: "We couldn’t reach the server. Check your connection and try again.",
      };
    case "auth":
      return {
        title: "Session expired",
        body: "Please sign in again to continue.",
      };
    case "data":
      return {
        title: "Temporary issue",
        body: "We couldn’t load this section. Try again or go back.",
      };
    default:
      return {
        title: "Temporary issue",
        body: "We hit a snag. You can try again or report the issue.",
      };
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCategory: "unknown",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorCategory: categorizeError(error),
    };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    reportError({
      message: error.message,
      stack: error.stack ?? undefined,
      category: categorizeError(error),
    });
  }

  handleTryAgain = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReport = (): void => {
    const { error } = this.state;
    if (error) {
      reportError({
        message: error.message,
        stack: error.stack ?? undefined,
        category: this.state.errorCategory,
      });
    }
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const msg = this.props.messages ?? {
        getMessage,
        tryAgain: "Try again",
        report: "Report issue",
      };
      const { title, body } = msg.getMessage(this.state.errorCategory);
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[280px] flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <p className="text-lg font-semibold">{title}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)] text-center max-w-sm">{body}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={this.handleTryAgain}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90"
            >
              {msg.tryAgain}
            </button>
            <button
              type="button"
              onClick={this.handleReport}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-medium)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)]"
            >
              {msg.report}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Wrapper that supplies translated error messages from the errors namespace. Use this in app routes so the boundary is i18n-aware. */
export function TranslatedErrorBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const t = useTranslations("errors");
  const messages: ErrorBoundaryMessages = React.useMemo(
    () => ({
      getMessage: (category: ErrorCategory) => {
        switch (category) {
          case "network":
            return { title: t("connectionProblem"), body: t("connectionProblemDesc") };
          case "auth":
            return { title: t("sessionExpired"), body: t("sessionExpiredDesc") };
          case "data":
            return { title: t("somethingWrong"), body: t("loadPageError") };
          default:
            return { title: t("somethingWrong"), body: t("unexpectedError") };
        }
      },
      tryAgain: t("tryAgain"),
      report: t("reportIssue"),
    }),
    [t]
  );
  return (
    <ErrorBoundary messages={messages} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
