import { KGO_ES_NAME } from "../branding";
import KgoEsCrashScreen from "./KgoEsCrashScreen";

/** Shown when the main app chunk fails to load (e.g. uncaught error in a static import). */
export default function BootError({ message }: { message: string }) {
  return (
    <KgoEsCrashScreen
      title={`${KGO_ES_NAME} could not start`}
      message="The editor failed to load. Your drawing autosave in this browser is usually still intact. Check the console for details, fix any reported template or import error, then reload."
      errorDetail={message}
    />
  );
}
