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
      gender: gender || "male",
      profileImage: "/default_avatar.svg",
    });

    res.json({ user, message: "تم التسجيل بنجاح" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
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

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "اسم المستخدم غير موجود" });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "كلمة المرور غير صحيحة" });
    }

    await storage.setUserOnlineStatus(user.id, true);
    
    res.json({ user });
  } catch (error) {
    console.error("Member login error:", error);
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;