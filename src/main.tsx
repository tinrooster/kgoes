import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import BootError from "./components/BootError.tsx";
import { refreshDevBuildHash } from "./buildVersion";
import { startTrackItBridge } from "./trackitBridge";

const App = lazy(() =>
  import("./App.tsx").catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[KGO-ES] App chunk failed to load:", err);
    return { default: () => <BootError message={message} /> };
  }),
);

startTrackItBridge();

if (import.meta.env.DEV) {
  void refreshDevBuildHash();
}

function Root() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ReactFlowProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
