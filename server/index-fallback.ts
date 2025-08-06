import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import setupRoutes from "./routes";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import messageRoutes from "./routes/messages";
import uploadRoutes from "./routes/uploads";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === "production" 
    ? ["https://your-domain.com"] 
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// تقديم الملفات الثابتة
app.use(express.static(join(__dirname, "public")));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// إعداد النظام المنظف
const server = setupRoutes(app);

// Route للصفحة الرئيسية
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, "public/index.html"));
});

// بدء الخادم
async function startServer() {
  try {
    // تعليق فحص قاعدة البيانات مؤقتاً للعمل بدون قاعدة بيانات
    console.log('⚠️ تشغيل في وضع بدون قاعدة بيانات');
    console.log('💡 لإضافة قاعدة بيانات، اتبع الدليل: setup-free-database.md');
    
    // بدء الخادم
    server.listen(PORT, () => {
      console.log('🚀 النظام المنظف للدردشة العربية يعمل الآن!');
      console.log(`📡 الخادم متاح على: http://localhost:${PORT}`);
      console.log('🏠 الغرفة الافتراضية: general');
      console.log('📝 نظام الرسائل: منظف ومحسن');
      console.log('👥 إدارة المستخدمين: مبسطة وفعالة');
      console.log('');
      console.log('⚠️ ملاحظة: التطبيق يعمل بدون قاعدة بيانات');
      console.log('💡 لإضافة قاعدة بيانات مجانية:');
      console.log('   1. اذهب إلى [Neon.tech](https://neon.tech)');
      console.log('   2. أنشئ قاعدة بيانات مجانية');
      console.log('   3. أضف DATABASE_URL إلى متغيرات البيئة');
      console.log('   4. أعد نشر التطبيق');
    });

  } catch (error) {
    console.error('❌ خطأ في بدء الخادم:', error);
    process.exit(1);
  }
}

// معالجة الإغلاق النظيف
process.on('SIGTERM', () => {
  console.log('🔄 إيقاف الخادم بطريقة نظيفة...');
  server.close(() => {
    console.log('✅ تم إيقاف الخادم بنجاح');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 إيقاف الخادم بطريقة نظيفة...');
  server.close(() => {
    console.log('✅ تم إيقاف الخادم بنجاح');
    process.exit(0);
  });
});

// بدء الخادم
startServer();