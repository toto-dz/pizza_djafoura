# 🍕 نظام مطعم DJ
> نظام مطعم متكامل يعمل على GitHub Pages مع Google Sheets كقاعدة بيانات

## 📁 الملفات

| الملف | الوصف |
|---|---|
| `menudj.html` | قائمة الطعام للعملاء |
| `menudj.js` | منطق الطلب والتتبع ونقاط العميل |
| `admindj.html` | لوحة تحكم المطعم |
| `admindj.js` | منطق إدارة الطلبات والعملاء |
| `config.js` | الإعدادات والثوابت |
| `google-apps-script.js` | كود الـ Backend (يُنسخ إلى Google Apps Script) |
| `project-check.js` | فحص صياغة الملفات وقواعد الطلب والنقاط |

---

## 🚀 خطوات النشر

### 1. إعداد Google Sheets
1. افتح [Google Sheets](https://sheets.google.com) وأنشئ جدول جديد
2. احفظ الـ Spreadsheet ID من الرابط

### 2. إعداد Google Apps Script
1. افتح [script.google.com](https://script.google.com)
2. أنشئ مشروع جديد
3. احذف الكود الافتراضي والصق محتوى `google-apps-script.js`
4. اضغط **Deploy → New Deployment**
5. اختر:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. انسخ رابط الـ Web App

بعد أي تعديل على `google-apps-script.js` أنشئ **Deployment جديدًا** أو حدّث الـ Deployment الحالي، وإلا سيبقى الموقع يستخدم نسخة الخادم القديمة.

### 3. تحديث config.js
```javascript
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/YOUR_ID/exec";
```

### 4. رفع إلى GitHub Pages
```bash
git add .
git commit -m "🍕 نظام مطعم DJ"
git push
```
ثم في الإعدادات: **Settings → Pages → Branch: main**

---

## 🔑 بيانات تسجيل الدخول
- كلمة مرور المشرف: **admin123**

## 🍽️ رابط القائمة حسب الطاولة
```
https://yoursite.github.io/menudj.html?table=1
https://yoursite.github.io/menudj.html?table=2
```

## 🏆 نظام النقاط
- كل **100 دج** = **1 نقطة**
- برونزي: 0-99 | فضي: 100-299 | ذهبي: 300+

## ✅ فحص المشروع
```bash
node project-check.js
```
