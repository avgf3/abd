import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import setupRoutes from "./routes";
import { checkDatabaseHealth } from "./database-adapter";
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
    // التحقق من اتصال قاعدة البيانات
    console.log('🔍 فحص اتصال قاعدة البيانات...');
    await checkDatabaseHealth();
    console.log('✅ تم تأكيد اتصال قاعدة البيانات');

    // بدء الخادم
    server.listen(PORT, () => {
      console.log('🚀 النظام المنظف للدردشة العربية يعمل الآن!');
      console.log(`📡 الخادم متاح على: http://localhost:${PORT}`);
      console.log('🏠 الغرفة الافتراضية: general');
      console.log('📝 نظام الرسائل: منظف ومحسن');
      console.log('👥 إدارة المستخدمين: مبسطة وفعالة');
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