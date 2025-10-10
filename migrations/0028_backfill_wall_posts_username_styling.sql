-- تعبئة حقول تدرج/تأثير اسم المستخدم في منشورات الحائط من جدول المستخدمين
-- تعمل مرة واحدة بأمان: لا تستبدل القيم الموجودة بالفعل

-- تحديث username_gradient حيث تكون NULL اعتماداً على المستخدم صاحب المنشور
UPDATE wall_posts wp
SET username_gradient = u.username_gradient
FROM users u
WHERE wp.user_id = u.id
  AND (wp.username_gradient IS NULL OR wp.username_gradient = '' OR wp.username_gradient = 'null' OR wp.username_gradient = 'undefined')
  AND (u.username_gradient IS NOT NULL AND u.username_gradient <> '' AND u.username_gradient <> 'null' AND u.username_gradient <> 'undefined');

-- تحديث username_effect حيث تكون NULL اعتماداً على المستخدم صاحب المنشور
UPDATE wall_posts wp
SET username_effect = u.username_effect
FROM users u
WHERE wp.user_id = u.id
  AND (wp.username_effect IS NULL OR wp.username_effect = '' OR wp.username_effect = 'null' OR wp.username_effect = 'undefined')
  AND (u.username_effect IS NOT NULL AND u.username_effect <> '' AND u.username_effect <> 'null' AND u.username_effect <> 'undefined');

-- تأكيد لون الاسم للحائط إذا كان مفقوداً واستبداله بلون المستخدم
UPDATE wall_posts wp
SET username_color = u.username_color
FROM users u
WHERE wp.user_id = u.id
  AND (wp.username_color IS NULL OR wp.username_color = '' OR LOWER(wp.username_color) IN ('#fff', '#ffffff', 'null', 'undefined'))
  AND (u.username_color IS NOT NULL AND u.username_color <> '' AND LOWER(u.username_color) NOT IN ('#fff', '#ffffff', 'null', 'undefined'));
