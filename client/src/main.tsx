import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// إضافة معالجة أخطاء شاملة
console.log("🚀 تحميل التطبيق...");

// معالجة الأخطاء غير المُعالجة
window.addEventListener('error', (event) => {
  console.error('❌ خطأ JavaScript:', event.error);
  console.error('📍 الملف:', event.filename);
  console.error('📍 السطر:', event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Promise غير معالج:', event.reason);
});

try {
  console.log("🔍 البحث عن عنصر root...");
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("❌ لم يتم العثور على عنصر root");
    // إنشاء عنصر root إذا لم يكن موجوداً
    const newRoot = document.createElement('div');
    newRoot.id = 'root';
    newRoot.style.width = '100%';
    newRoot.style.height = '100vh';
    document.body.appendChild(newRoot);
    console.log("✅ تم إنشاء عنصر root جديد");
  } else {
    console.log("✅ تم العثور على عنصر root");
  }
  
  console.log("🔧 إنشاء React root...");
  const root = createRoot(rootElement || document.getElementById("root")!);
  
  console.log("🎨 تحميل مكون App...");
  root.render(<App />);
  
  console.log("✅ تم تحميل التطبيق بنجاح!");
  
} catch (error) {
  console.error("❌ فشل في تحميل التطبيق:", error);
  
  // عرض رسالة خطأ مرئية للمستخدم
  document.body.innerHTML = `
    <div style="
      position: fixed; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
      display: flex; 
      align-items: center; 
      justify-content: center; 
      flex-direction: column;
      font-family: 'Cairo', Arial, sans-serif;
      color: white;
      text-align: center;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div style="max-width: 600px;">
        <h1 style="font-size: 2.5rem; margin-bottom: 1rem; color: #fbbf24;">🔧 جاري الصيانة</h1>
        <p style="font-size: 1.2rem; margin-bottom: 2rem; line-height: 1.6;">
          نعتذر، الموقع قيد الصيانة حالياً. نعمل على إصلاح المشكلة وسيعود الموقع للعمل قريباً.
        </p>
        <div style="background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 10px; margin-bottom: 2rem;">
          <p style="margin: 0; font-size: 0.9rem;">
            إذا كانت المشكلة مستمرة، يرجى تحديث الصفحة أو المحاولة لاحقاً.
          </p>
        </div>
        <button onclick="window.location.reload()" style="
          background: #10b981; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          font-size: 1rem; 
          cursor: pointer;
          font-family: inherit;
        ">
          🔄 إعادة تحميل الصفحة
        </button>
      </div>
    </div>
  `;
}
