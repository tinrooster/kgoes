export interface DeviceLibraryCommitResult {
  ok: boolean;
  error?: string;
  file?: string;
  addedIds?: string[];
  templateCountAfter?: number;
}

export function canCommitDeviceLibraryToTrackIt(): boolean {
  try {
    return !!(typeof window !== "undefined" && window.opener && !window.opener.closed);
  } catch {
    return false;
  }
}

export function commitDeviceLibraryViaTrackIt(typescript: string): Promise<DeviceLibraryCommitResult> {
  if (!canCommitDeviceLibraryToTrackIt()) {
    return Promise.reject(new Error("Open KGO-ES from trackIT dev to commit templates into the repo."));
  }
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("trackIT did not respond — is trackIT dev running?"));
    }, 120_000);

    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        requestId?: string;
        result?: DeviceLibraryCommitResult;
        error?: string;
      };
      if (data?.type !== "TRACKIT_KGO_DEVICE_LIBRARY_COMMIT_RESULT") return;
      if (data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      if (data.result?.ok) resolve(data.result);
      else reject(new Error(data.error ?? data.result?.error ?? "Commit failed"));
    };

    window.addEventListener("message", onMessage);
    window.opener!.postMessage(
      { type: "TRACKIT_KGO_DEVICE_LIBRARY_COMMIT", requestId, typescript },
      "*",
    );
  });
}
