/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_TRACKIT_URL?: string;
  readonly VITE_PLANT_API_URL?: string;
  readonly VITE_LAUNCH_DATA_BACKEND?: string;
  readonly VITE_LAUNCH_SYNC_ORG_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
declare const __BUILD_HASH__: string;
