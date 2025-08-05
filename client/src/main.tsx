import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("🚀 تحميل التطبيق...");

// معالجة أخطاء أساسية فقط
window.addEventListener('error', (event) => {
  console.error('❌ خطأ:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise غير معالج:', event.reason);
});

// تحميل بسيط وموثوق للتطبيق
function initApp() {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("❌ عنصر root غير موجود");
    return;
  }
  
  console.log("✅ تم العثور على عنصر root");
  
  try {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("✅ تم تحميل التطبيق بنجاح!");
  } catch (error) {
    console.error("❌ فشل في تحميل التطبيق:", error);
    // عرض رسالة خطأ بسيطة
    rootElement.innerHTML = `
      <div style="
        display: flex; 
        align-items: center; 
        justify-content: center; 
        height: 100vh; 
        background: #1e3a8a; 
        color: white; 
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1>⚠️ خطأ في التحميل</h1>
          <p>يرجى إعادة تحميل الصفحة</p>
          <button onclick="window.location.reload()" style="
            background: #10b981; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 10px;
          ">
            إعادة تحميل
          </button>
        </div>
      </div>
    `;
  }
}

// بدء التطبيق بعد تحميل DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
