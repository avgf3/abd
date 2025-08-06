import { Router } from "express";
import { storage } from "../storage";
import { authLimiter } from "../security";
import { AuthManager } from "../auth/authMiddleware";

const router = Router();

// Registration route with enhanced security
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, password, confirmPassword, gender } = req.body;
    
    // Basic security check
    if (!username?.trim() || !password?.trim() || !confirmPassword?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: "جميع الحقول مطلوبة" 
      });
    }

    // Username validation - prevent special characters
    if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم يجب أن يكون بين 3-20 حرف ولا يحتوي على رموز خاصة" 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        error: "كلمات المرور غير متطابقة" 
      });
    }

    // Enhanced password strength check
    if (password.length < 8) {
      return res.status(400).json({ 
        success: false,
        error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" 
      });
    }
    
    if (!/(?=.*[0-9])/.test(password)) {
      return res.status(400).json({ 
        success: false,
        error: "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل" 
      });
    }

    if (!/(?=.*[a-zA-Z])/.test(password)) {
      return res.status(400).json({ 
        success: false,
        error: "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل" 
      });
    }

    // Check if username already exists
    const existing = await storage.getUserByUsername(username.trim());
    if (existing) {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم موجود بالفعل" 
      });
    }

    // Hash password before storing
    const hashedPassword = await AuthManager.hashPassword(password);

    const user = await storage.createUser({
      username: username.trim(),
      password: hashedPassword,
      userType: "member",
      role: "member",
      gender: gender || "male",
      profileImage: "/default_avatar.svg",
    });

    // Generate JWT token
    const token = AuthManager.generateToken({
      id: user.id,
      username: user.username,
      userType: user.userType
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({ 
      success: true,
      user: userWithoutPassword,
      token,
      message: "تم التسجيل بنجاح" 
    });

  } catch (error: any) {
    console.error("Registration error:", error);
    
    // إرسال رسائل خطأ مفيدة للمستخدم
    if (error.message === 'اسم المستخدم موجود بالفعل') {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم موجود بالفعل" 
      });
    }
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم موجود بالفعل" 
      });
    }
    
    if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('constraint failed')) {
      return res.status(400).json({ 
        success: false,
        error: "البيانات المدخلة غير صحيحة" 
      });
    }
    
    // خطأ عام
    console.error("خطأ غير متوقع في التسجيل:", error);
    res.status(500).json({ 
      success: false,
      error: "خطأ في الخادم - يرجى المحاولة لاحقاً" 
    });
  }
});

// Guest login with token
router.post("/guest", async (req, res) => {
  try {
    const { username, gender } = req.body;
    
    if (!username?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم مطلوب" 
      });
    }

    // Username validation for guests
    if (!/^[\u0600-\u06FFa-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم يجب أن يكون بين 3-20 حرف ولا يحتوي على رموز خاصة" 
      });
    }

    // Check if username already exists
    const existing = await storage.getUserByUsername(username.trim());
    if (existing) {
      return res.status(400).json({ 
        success: false,
        error: "الاسم مستخدم بالفعل" 
      });
    }

    const user = await storage.createUser({
      username: username.trim(),
      userType: "guest",
      role: "guest",
      gender: gender || "male",
      profileImage: "/default_avatar.svg",
    });

    // Generate JWT token for guest
    const token = AuthManager.generateToken({
      id: user.id,
      username: user.username,
      userType: user.userType
    });

    res.status(201).json({ 
      success: true,
      user,
      token,
      message: "تم الدخول كضيف بنجاح"
    });

  } catch (error: any) {
    console.error("Guest login error:", error);
    res.status(500).json({ 
      success: false,
      error: "خطأ في الخادم" 
    });
  }
});

// Member login with enhanced security
router.post("/member", authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ 
        success: false,
        error: "اسم المستخدم وكلمة المرور مطلوبان" 
      });
    }

    const user = await storage.getUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: "اسم المستخدم أو كلمة المرور غير صحيحة" 
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({ 
        success: false,
        error: "تم حظر هذا المستخدم" 
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = user.password ? 
      await AuthManager.verifyPassword(password, user.password) : 
      password === user.password; // Fallback for old unencrypted passwords

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: "اسم المستخدم أو كلمة المرور غير صحيحة" 
      });
    }

    // If password was not encrypted, encrypt it now
    if (user.password && !user.password.startsWith('$2b$')) {
      const hashedPassword = await AuthManager.hashPassword(password);
      await storage.updateUser(user.id, { password: hashedPassword });
    }

    // Update online status
    try {
      await storage.setUserOnlineStatus(user.id, true);
    } catch (statusError) {
      console.error('Error updating user online status:', statusError);
      // Don't fail login just because status update failed
    }

    // Generate JWT token
    const token = AuthManager.generateToken({
      id: user.id,
      username: user.username,
      userType: user.userType
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ 
      success: true,
      user: userWithoutPassword,
      token,
      message: "تم تسجيل الدخول بنجاح"
    });

  } catch (error: any) {
    console.error("Member login error:", error);
    res.status(500).json({ 
      success: false,
      error: "خطأ في الخادم" 
    });
  }
});

// Token refresh endpoint
router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token مطلوب",
        code: "NO_TOKEN"
      });
    }

    const newToken = AuthManager.refreshToken(token);
    if (!newToken) {
      return res.status(401).json({
        success: false,
        error: "Token غير صالح أو منتهي الصلاحية",
        code: "INVALID_TOKEN"
      });
    }

    res.json({
      success: true,
      token: newToken,
      message: "تم تجديد Token بنجاح"
    });

  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم",
      code: "SERVER_ERROR"
    });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  try {
    const token = AuthManager.extractTokenFromRequest(req);
    
    if (token) {
      const decoded = AuthManager.verifyToken(token);
      if (decoded) {
        // Update user offline status
        await storage.setUserOnlineStatus(decoded.userId, false);
      }
    }

    res.json({
      success: true,
      message: "تم تسجيل الخروج بنجاح"
    });

  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

// Verify token endpoint
router.get("/verify", async (req, res) => {
  try {
    const token = AuthManager.extractTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "لا يوجد token",
        code: "NO_TOKEN"
      });
    }

    const decoded = AuthManager.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "Token غير صالح",
        code: "INVALID_TOKEN"
      });
    }

    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "المستخدم غير موجود",
        code: "USER_NOT_FOUND"
      });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      valid: true
    });

  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({
      success: false,
      error: "خطأ في الخادم"
    });
  }
});

export default router;