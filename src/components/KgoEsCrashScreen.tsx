import { KGO_ES_NAME } from "../branding";

interface Props {
  title?: string;
  message: string;
  errorDetail?: string;
}

/** Full-screen fatal error UI (ErrorBoundary, boot failure). */
export default function KgoEsCrashScreen({
  title = "Something went wrong",
  message,
  errorDetail,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white px-6 py-10">
      <img src="/favicon.svg" alt={KGO_ES_NAME} className="w-16 h-16 mb-6" />
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">{KGO_ES_NAME}</p>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-slate-400 mb-4 text-center max-w-md text-sm leading-relaxed">{message}</p>
      {errorDetail ? (
        <pre className="text-xs text-red-300 bg-slate-800 border border-slate-700 rounded p-3 max-w-xl w-full overflow-auto mb-6">
          {errorDetail}
        </pre>
      ) : null}
      <button
        type="button"
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}
