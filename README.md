# Abonelik Takip Sistemi (SubTrack)

Kişisel aboneliklerinizi yönetmek, ödemeleri takip etmek ve harcamalarınızı kontrol altında tutmak için geliştirilmiş modern bir web uygulamasıdır.

## Başlatma Talimatları

Projeyi çalıştırmak için hem Frontend hem Backend sunucularının aynı anda çalışması gerekmektedir. İki ayrı terminal penceresi kullanın.

### 1. Backend (Sunucu)
API servislerini ve veritabanı bağlantısını sağlar.

```powershell
cd backend
npm install  # İlk kurulumda
node server.js
```
Backend **http://localhost:5000** adresinde çalışacaktır. Yerel çalıştırmak için `backend/.env` içinde en azından `JWT_SECRET` ve `DATABASE_URL` tanımlı olmalıdır.

### 2. Frontend (Arayüz)
Kullanıcı arayüzünü sağlar.

```powershell
cd frontend
npm install  # İlk kurulumda
npm run dev
```
Frontend **http://localhost:3000** (veya 3001) adresinde çalışacaktır.

## Ortam Değişkenleri (Backend)

Production ve deploy için backend ortam değişkenleri:

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `JWT_SECRET` | Evet | JWT imzalama için gizli anahtar. Tanımsızsa sunucu başlamaz. |
| `DATABASE_URL` | Evet | PostgreSQL bağlantı dizesi. |
| `FRONTEND_URL` | Evet (prod) | Frontend kök URL (örn. `https://subtrack-eta.vercel.app`). |
| `BACKEND_URL` | Evet (prod) | Backend kök URL (OAuth callback için). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth için | Google ile giriş için. |
| **`RESEND_API_KEY`** | E-posta için | [Resend](https://resend.com) API anahtarı. E-posta gönderimi bu API ile yapılır. |
| **`EMAIL_USER`** | E-posta için | Gönderen adresi (Resend’de doğrulanmış domain olmalı). Varsayılan: `onboarding@resend.dev`. |
| `EMAIL_PASS` | Hayır | E-posta servisi Resend API kullandığı için production’da kullanılmaz; sadece test/legacy script’lerde geçer. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Bildirimler için | Web Push (bildirim) için. |
| `SENTRY_DSN` | Hayır | Hata izleme (Sentry). |

## Test Kullanıcısı
Geliştirme ortamında seed kullanmak isterseniz `backend/prisma/seed.js` dosyası sadece dev ortamında çalışır. Gerekli ortam değişkenleri:
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_USER_EMAIL`
- `SEED_USER_PASSWORD`

## Notlar
- **PWA (Progressive Web App):** Uygulama telefonunuza yüklenebilir özelliktedir. Geliştirme ortamında (`npm run dev`) PWA özellikleri bazen hata verebilir, bu durumda production build (`npm run build && npm start`) kullanılması önerilir.
- **CORS:** Geliştirme ortamında `localhost:3000` ve `localhost:3001` portlarına izin verilmiştir.

## Teknoloji Yığını
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express 5, Prisma (PostgreSQL), web-push, node-cron
