import { z } from 'zod';

// ========== مخططات المستخدم ==========
export const loginSchema = z.object({
  username: z.string()
    .min(1, 'اسم المستخدم مطلوب')
    .max(14, 'اسم المستخدم يجب ألا يتجاوز 14 حرف'),
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(100, 'كلمة المرور طويلة جداً'),
  deviceId: z.string().optional()
});

export const registerSchema = z.object({
  username: z.string()
    .min(1, 'اسم المستخدم مطلوب')
    .max(14, 'اسم المستخدم يجب ألا يتجاوز 14 حرف'),
  displayName: z.string()
    .min(1, 'الاسم المعروض مطلوب')
    .max(50, 'الاسم المعروض طويل جداً')
    .transform(val => val.trim()),
  password: z.string()
    .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .max(100, 'كلمة المرور طويلة جداً')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'كلمة المرور يجب أن تحتوي على أحرف وأرقام'),
  deviceId: z.string().optional()
});

export const updateProfileSchema = z.object({
  username: z.string()
    .min(1, 'اسم المستخدم مطلوب')
    .max(14, 'اسم المستخدم يجب ألا يتجاوز 14 حرف')
    .transform(val => val.trim())
    .optional(),
  displayName: z.string()
    .min(1, 'الاسم المعروض مطلوب')
    .max(50, 'الاسم المعروض طويل جداً')
    .transform(val => val.trim())
    .optional(),
  bio: z.string()
    .max(200, 'الوصف الشخصي طويل جداً')
    .transform(val => val.trim())
    .optional(),
  avatar: z.string()
    .url('رابط الصورة غير صالح')
    .optional()
    .nullable(),
  profileEffect: z.string()
    .max(50)
    .optional()
    .nullable()
});

// ========== مخططات الرسائل ==========
export const messageSchema = z.object({
  content: z.string()
    .min(1, 'محتوى الرسالة مطلوب')
    .max(1000, 'الرسالة طويلة جداً')
    .transform(val => val.trim()),
  roomId: z.string().optional(),
  receiverId: z.string().optional(),
  attachments: z.array(z.string().url()).optional()
}).refine(
  data => data.roomId || data.receiverId,
  'يجب تحديد معرف الغرفة أو المستقبل'
);

export const editMessageSchema = z.object({
  messageId: z.string(),
  content: z.string()
    .min(1, 'محتوى الرسالة مطلوب')
    .max(1000, 'الرسالة طويلة جداً')
    .transform(val => val.trim())
});

export const deleteMessageSchema = z.object({
  messageId: z.string()
});

// ========== مخططات الغرف ==========
export const createRoomSchema = z.object({
  id: z.string()
    .min(3, 'معرف الغرفة يجب أن يكون 3 أحرف على الأقل')
    .max(30, 'معرف الغرفة طويل جداً')
    .regex(/^[a-zA-Z0-9_-]+$/, 'معرف الغرفة يحتوي على أحرف غير مسموحة'),
  name: z.string()
    .min(1, 'اسم الغرفة مطلوب')
    .max(50, 'اسم الغرفة طويل جداً')
    .transform(val => val.trim()),
  topic: z.string()
    .max(200, 'وصف الغرفة طويل جداً')
    .transform(val => val.trim())
    .optional(),
  icon: z.string()
    .url('رابط الأيقونة غير صالح')
    .optional()
    .nullable(),
  welcomeMessage: z.string()
    .max(500, 'رسالة الترحيب طويلة جداً')
    .optional()
    .nullable()
});

export const updateRoomSchema = z.object({
  name: z.string()
    .min(1, 'اسم الغرفة مطلوب')
    .max(50, 'اسم الغرفة طويل جداً')
    .transform(val => val.trim())
    .optional(),
  topic: z.string()
    .max(200, 'وصف الغرفة طويل جداً')
    .transform(val => val.trim())
    .optional(),
  icon: z.string()
    .url('رابط الأيقونة غير صالح')
    .optional()
    .nullable(),
  welcomeMessage: z.string()
    .max(500, 'رسالة الترحيب طويلة جداً')
    .optional()
    .nullable()
});

export const joinRoomSchema = z.object({
  roomId: z.string()
});

export const leaveRoomSchema = z.object({
  roomId: z.string()
});

// ========== مخططات الصداقة ==========
export const friendRequestSchema = z.object({
  userId: z.string(),
  message: z.string()
    .max(200, 'رسالة طلب الصداقة طويلة جداً')
    .optional()
});

export const friendActionSchema = z.object({
  requestId: z.string(),
  action: z.enum(['accept', 'reject'])
});

export const blockUserSchema = z.object({
  userId: z.string()
});

// ========== مخططات الألعاب والنقاط ==========
export const updatePointsSchema = z.object({
  userId: z.string(),
  points: z.number()
    .int('النقاط يجب أن تكون عدد صحيح')
    .min(-1000, 'لا يمكن خصم أكثر من 1000 نقطة')
    .max(1000, 'لا يمكن إضافة أكثر من 1000 نقطة'),
  reason: z.string()
    .max(100, 'سبب التحديث طويل جداً')
    .optional()
});

export const gameResultSchema = z.object({
  gameType: z.enum(['dice', 'slots', 'wheel', 'coinflip']),
  bet: z.number()
    .int()
    .min(1, 'الرهان يجب أن يكون موجب')
    .max(10000, 'الرهان كبير جداً'),
  result: z.object({
    won: z.boolean(),
    payout: z.number().int(),
    details: z.any().optional()
  })
});

// ========== مخططات البحث والفلترة ==========
export const searchUsersSchema = z.object({
  query: z.string()
    .min(1, 'كلمة البحث مطلوبة')
    .max(50, 'كلمة البحث طويلة جداً'),
  limit: z.number()
    .int()
    .min(1)
    .max(50)
    .default(20),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
});

export const paginationSchema = z.object({
  page: z.number()
    .int()
    .min(1)
    .default(1),
  limit: z.number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
  sortBy: z.string().optional()
});

// ========== مخططات التحميل ==========
export const fileUploadSchema = z.object({
  filename: z.string()
    .max(255, 'اسم الملف طويل جداً'),
  mimetype: z.string()
    .regex(/^(image|video|audio|application)\/.+$/, 'نوع الملف غير مدعوم'),
  size: z.number()
    .int()
    .min(1, 'حجم الملف غير صالح')
    .max(10 * 1024 * 1024, 'حجم الملف يتجاوز 10MB')
});

// ========== دالة مساعدة للتحقق ==========
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['خطأ في التحقق من البيانات'] };
  }
}

// تصدير الأنواع
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type FriendRequestInput = z.infer<typeof friendRequestSchema>;
export type GameResultInput = z.infer<typeof gameResultSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;