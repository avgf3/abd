import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyThemeById } from "@/utils/applyTheme";

// تطبيق الثيم المحفوظ عند بدء التطبيق
try {
  const saved = localStorage.getItem('selectedTheme');
  if (saved) applyThemeById(saved, false);
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
