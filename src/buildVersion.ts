declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;

export function getAppVersionLabel(): string {
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
  const hash =
    typeof __BUILD_HASH__ !== "undefined" && __BUILD_HASH__ !== "unknown"
      ? __BUILD_HASH__
      : null;
  return hash ? `${version} (${hash})` : version;
}
