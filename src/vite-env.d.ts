/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ALLOW_HTTP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}











