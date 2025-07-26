// Global type declarations

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  // يمكن إضافة متغيرات أخرى هنا
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    updateUserPoints?: (newPoints: number) => void;
  }
}

export {};