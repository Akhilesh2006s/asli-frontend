/// <reference types="vite/client" />

declare const __APP_BUILD_ID__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ALLOW_HTTP?: string;
  readonly VITE_APP_BUILD_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}











