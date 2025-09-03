#!/bin/bash

# ==========================================
# سكريبت تثبيت شهادة SSL مجانية
# ==========================================

echo "بدء تثبيت شهادة SSL..."

# 1. تثبيت Certbot
echo "1. تثبيت Certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 2. الحصول على شهادة SSL
echo "2. الحصول على شهادة SSL..."
echo "⚠️ تأكد من أن النطاق يشير إلى IP السيرفر أولاً!"
read -p "أدخل اسم النطاق (مثال: example.com): " DOMAIN

# التحقق من صحة النطاق
if [[ -z "$DOMAIN" ]]; then
    echo "خطأ: يجب إدخال اسم النطاق!"
    exit 1
fi

# 3. تثبيت الشهادة
echo "3. تثبيت شهادة SSL لـ $DOMAIN..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

# 4. إعداد التجديد التلقائي
echo "4. إعداد التجديد التلقائي..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# 5. اختبار التجديد
echo "5. اختبار التجديد..."
sudo certbot renew --dry-run

echo "==========================================
تم تثبيت شهادة SSL بنجاح!

معلومات مهمة:
- الشهادة صالحة لمدة 90 يوم
- سيتم تجديدها تلقائياً
- يمكنك الآن الوصول للموقع عبر https://$DOMAIN

للتحقق من حالة الشهادة:
sudo certbot certificates

لتجديد الشهادة يدوياً:
sudo certbot renew
=========================================="