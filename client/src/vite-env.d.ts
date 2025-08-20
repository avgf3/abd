/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  // Add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
