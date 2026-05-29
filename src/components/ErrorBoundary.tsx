import { Component, type ReactNode } from "react";
import { KGO_ES_NAME } from "../branding";
import KgoEsCrashScreen from "./KgoEsCrashScreen";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`${KGO_ES_NAME} crashed:`, error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <KgoEsCrashScreen
        message={`${KGO_ES_NAME} hit an unexpected error. Your schematic is saved in this browser and will be restored when you reload.`}
        errorDetail={this.state.error?.message}
      />
    );
  }
}
