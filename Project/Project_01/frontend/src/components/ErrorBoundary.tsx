import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 嵌套在面板内时使用紧凑错误条，而非全屏阻断 */
  compact?: boolean;
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[UI] 渲染异常:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      if (this.props.compact) {
        return (
          <div className="flex h-full flex-col bg-white p-4">
            <div className="max-h-24 overflow-hidden rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">{this.props.label || "预览"}渲染异常</p>
              <p className="mt-1 line-clamp-2">{this.state.error.message}</p>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-3 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              重试
            </button>
          </div>
        );
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-red-700">页面渲染出错</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              演示数据格式异常导致界面中断。请刷新页面后重试；若仍失败，请查看浏览器控制台。
            </p>
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-800">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
