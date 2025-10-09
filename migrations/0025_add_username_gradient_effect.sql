-- إضافة حقول التدرج والتأثير لأسماء المستخدمين (خاصة بالمشرفين)
-- Migration: 0025_add_username_gradient_effect.sql

-- إضافة حقل التدرج اللوني لاسم المستخدم
ALTER TABLE users ADD COLUMN username_gradient TEXT;

-- إضافة حقل التأثير الحركي لاسم المستخدم  
ALTER TABLE users ADD COLUMN username_effect TEXT;

-- إضافة تعليقات للحقول الجديدة
COMMENT ON COLUMN users.username_gradient IS 'تدرج لوني لاسم المستخدم (للمشرفين فقط)';
COMMENT ON COLUMN users.username_effect IS 'تأثير حركي لاسم المستخدم (للمشرفين فقط)';