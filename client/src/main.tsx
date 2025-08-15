import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeUnifiedThemeSystem } from "@/utils/unifiedThemeSystem";

// تهيئة النظام الموحد للثيمات
initializeUnifiedThemeSystem();

createRoot(document.getElementById("root")!).render(<App />);
