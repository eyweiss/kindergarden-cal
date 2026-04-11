# 🌈 לוח הגן – Kindergarten Weekly Board

אתר לניהול לוח שבועי לגן ילדים.  
הגננת מזינה אירועים והערות, ההורים רואים בזמן אמת.

---

## 🚀 פריסה ב-Vercel (5 דקות)

### 1. העלה ל-GitHub
```bash
git init && git add . && git commit -m "initial commit"
gh repo create gan-board --public --push
# או דרך github.com/new
```

### 2. חבר ל-Vercel
- היכנס ל-[vercel.com](https://vercel.com) → **Add New Project**
- בחר את הרפוזיטורי → **Deploy** (Vercel מזהה Next.js אוטומטית)

### 3. הוסף Vercel KV (אחסון הנתונים)
בדשבורד של הפרויקט בVercel:
- **Storage** → **Create Database** → **KV (Redis)**
- לחץ **Connect to Project** – מוסיף `KV_REST_API_URL` ו-`KV_REST_API_TOKEN` אוטומטית

### 4. הגדר ENV Variable אחד
בVercel → Settings → Environment Variables:
```
NEXT_PUBLIC_ADMIN_PIN = 1234
```
> שני הספרות הן ברירת מחדל. שני לקוד שרוצה (עד 6 ספרות).

### 5. Redeploy → מוכן! 🎉

---

## 🔑 גישת גננת
- כתובת: `https://your-site.vercel.app/admin`
- הזיני את קוד הגישה שהגדרת
- הוסיפי אירועים לכל יום, כתבי הערות → **💾 שמור שינויים**

## 👨‍👩‍👧 צד ההורים
- כתובת ראשית: `https://your-site.vercel.app`
- הלוח מתעדכן **מיד** לאחר שמירת הגננת

---

## 🛠 פיתוח מקומי
```bash
cp .env.local.example .env.local
# מלא KV_REST_API_URL ו-KV_REST_API_TOKEN מדשבורד Vercel KV
npm install
npm run dev
# http://localhost:3000
```
