import { Router } from "express";
import { storage } from "../storage";
import { authLimiter } from "../security";

const router = Router();

// Registration route with enhanced security
router.post("/register", async (req, res) => {
  try {
    const { username, password, confirmPassword, gender } = req.body;
    
    // Basic security check
    if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    // Username validation - prevent special characters
    if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return res.status(400).json({ error: "اسم المستخدم يجب أن يكون بين 3-20 حرف ولا يحتوي على رموز خاصة" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "كلمات المرور غير متطابقة" });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }
    
    if (!/(?=.*[0-9])/.test(password)) {
      return res.status(400).json({ error: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل" });
    }

    // Check if username already exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
    }

    const user = await storage.createUser({
      username,
      password,
      userType: "member",
      role: "member",
      gender: gender || "male",
      profileImage: "/default_avatar.svg",
    });

    res.json({ user, message: "تم التسجيل بنجاح" });
  } catch (error: any) {
    console.error("Registration error:", error);
    
    // إرسال رسائل خطأ مفيدة للمستخدم
    if (error.message === 'اسم المستخدم موجود بالفعل') {
      return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
    }
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
    }
    
    if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('constraint failed')) {
      return res.status(400).json({ error: "البيانات المدخلة غير صحيحة" });
    }
    
    if (error.message?.includes('bind') || error.message?.includes('SQLite3 can only bind')) {
      return res.status(400).json({ error: "خطأ في معالجة البيانات - يرجى المحاولة مرة أخرى" });
    }
    
    if (error.message?.includes('قاعدة البيانات')) {
      return res.status(500).json({ error: error.message });
    }
    
    // خطأ عام
    console.error("خطأ غير متوقع في التسجيل:", error);
    res.status(500).json({ error: "خطأ في الخادم - يرجى المحاولة لاحقاً" });
  }
});

// Guest login
router.post("/guest", async (req, res) => {
  try {
    const { username, gender } = req.body;
    
    if (!username?.trim()) {
      return res.status(400).json({ error: "اسم المستخدم مطلوب" });
    }

    // Check if username already exists
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "الاسم مستخدم بالفعل" });
    }

    const user = await storage.createUser({
      username,
      userType: "guest",
      role: "guest",
      gender: gender || "male",
      profileImage: "/default_avatar.svg",
    });

    res.json({ user });
  } catch (error) {
    console.error("Guest login error:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// Member login
router.post("/member", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    }

    console.log(`Attempting member login for username: ${username}`);
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ error: "اسم المستخدم غير موجود" });
    }

    console.log(`User found: ${user.username}, type: ${user.userType}`);

    if (user.password !== password) {
      console.log(`Incorrect password for user: ${username}`);
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    try {
      await storage.setUserOnlineStatus(user.id, true);
      console.log(`Member login successful: ${username}`);
    } catch (statusError) {
      console.error('Error updating user online status:', statusError);
      // Don't fail login just because status update failed
    }
    
    res.json({ user });
  } catch (error) {
    console.error("Member login error:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;