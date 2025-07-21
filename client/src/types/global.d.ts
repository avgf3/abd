// Global type declarations

declare global {
  interface Window {
    updateUserPoints?: (newPoints: number) => void;
  }
}

export {};