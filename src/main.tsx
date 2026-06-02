import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlowProvider } from "@xyflow/react";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import App from "./App.tsx";
import { refreshDevBuildHash } from "./buildVersion";
import { startTrackItBridge } from "./trackitBridge";

startTrackItBridge();

if (import.meta.env.DEV) {
  void refreshDevBuildHash();
}

function Root() {
  return (
    <ReactFlowProvider>
      <App />
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
