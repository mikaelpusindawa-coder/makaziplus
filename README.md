# MakaziPlus v4.1 — Tanzania Property Platform

## 🆕 v4.1 Changelog (from v4.0)
| # | Fix | Details |
|---|-----|---------|
| 1 | `users` table — 6 missing columns | `gender`, `is_verified`, `verification_type`, `otp_verified`, `reset_token`, `reset_token_expires` |
| 2 | `properties` table | `property_status ENUM('available','sold','rented','pending')` added |
| 3 | `user_ratings` table | Rate agents/owners directly (separate from property reviews) |
| 4 | `user_verifications` + `verification_requests` | National ID verification tables |
| 5 | `faqs` + `support_tickets` | Help center tables + 8 Swahili FAQ seeds |
| 6 | `authController.register` | Now saves `gender` field correctly |
| 7 | `ForgotPassword.jsx` + `HelpCenter.jsx` | Two missing pages added (3-step OTP reset + FAQs) |
| 8 | `/ratings/user` endpoints | `POST` + `GET` for rating owners/agents |
| 9 | Image path fixed | `/uploads/properties/` subfolder (was `/uploads/`) |
| 10 | `property_status` editable | Added to `ALLOWED_UPDATE_FIELDS` + edit-property refreshes amenities/images |

---

# 🏠 MakaziPlus — Makazi Kiganjani
### Tanzania's Enterprise Property Platform

---

## ⚡ Quick Start (3 Minutes)

```bash
# Step 1 — Run setup (auto-generates password hashes)
node setup.js

# Step 2 — Open MySQL Workbench, run database/schema.sql

# Step 3 — Set your MySQL password
# Edit server/.env → DB_PASSWORD=your_password

# Step 4 — Install everything and start
npm run install-all
npm run dev
```

Open **http://localhost:3000** ✅

---

## 🔑 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| 👤 Mteja | demo@makaziplus.co.tz | demo123 |
| 🧑‍💼 Dalali | agent@makaziplus.co.tz | agent123 |
| 🏠 Mwenye | owner@makaziplus.co.tz | owner123 |
| 🛡️ Admin | admin@makaziplus.co.tz | admin123 |

---

## 📁 Project Structure

```
makaziplus/
├── database/
│   └── schema.sql          ← Run this FIRST in MySQL Workbench
├── server/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── propertyController.js
│   │   │   └── allControllers.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   ├── routes/index.js
│   │   └── server.js
│   ├── uploads/
│   ├── .env                ← Set DB_PASSWORD here
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/          ← 12 pages (Home, Search, Chat, etc.)
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── utils/
│   ├── tailwind.config.js
│   └── package.json
├── setup.js                ← Run this first!
└── package.json
```

---

## 🌐 All API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | ❌ | Create account |
| POST | /api/auth/login | ❌ | Login |
| POST | /api/auth/logout | ✅ | Server-side session revoke |
| GET | /api/auth/me | ✅ | Get current user |
| PATCH | /api/auth/update-profile | ✅ | Update name/phone/avatar |
| PATCH | /api/auth/change-password | ✅ | Change password |

### Properties
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/properties | ❌ | List with filters |
| GET | /api/properties/my | ✅ | My listings |
| GET | /api/properties/:id | ❌ | Single property |
| POST | /api/properties | ✅ Agent/Owner | Create listing |
| PATCH | /api/properties/:id | ✅ Owner | Update |
| DELETE | /api/properties/:id | ✅ Owner | Delete |
| POST | /api/properties/:id/boost | ✅ Agent/Owner | Mark premium |

### Messages
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/messages/conversations | ✅ | All conversations |
| GET | /api/messages/unread-count | ✅ | Unread count |
| GET | /api/messages/:userId | ✅ | Messages with user |
| POST | /api/messages | ✅ | Send message |

### Favorites, Notifications, Reviews, Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/favorites | ✅ | Get favorites |
| POST | /api/favorites/:id/toggle | ✅ | Toggle favorite |
| GET | /api/notifications | ✅ | Get notifications |
| PATCH | /api/notifications/read-all | ✅ | Mark all read |
| POST | /api/reviews | ✅ | Create review |
| POST | /api/payments | ✅ | Initiate payment |
| GET | /api/payments/history | ✅ | Payment history |

### Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Dashboard stats |
| GET | /api/admin/users | All users |
| PATCH | /api/admin/users/:id | Update user |
| DELETE | /api/admin/users/:id | Soft-delete user |
| GET | /api/admin/payments | All payments |
| PATCH | /api/admin/properties/:id | Moderate listing |
| GET | /api/admin/security | Security alerts |
| POST | /api/admin/block-ip | Block IP address |

---

## 🔐 Security Features

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcrypt cost=12 |
| JWT tokens | 7-day expiry, server-side revocation |
| Account lockout | 5 failures → 30-min lock (DB trigger) |
| Brute-force protection | 20 auth attempts / 15 min rate limit |
| Payment rate limit | 10 attempts / 1 hour |
| IP blocking | DB table + middleware on every request |
| Audit logging | Every sensitive action logged immutably |
| SQL injection | Parameterized queries + whitelists |
| CORS | Only your frontend URL allowed |
| Timing attacks | Constant-time bcrypt on wrong emails |
| Mass assignment | Column whitelists on every UPDATE |
| GDPR | Soft-delete preserves financial records |
| Payment integrity | Immutable records + DB trigger blocks changes |
| Idempotency | Unique key prevents double-charge |

---

## 🗄️ Database Features

- **10 Tables** with full integrity constraints
- **35+ Indexes** including FULLTEXT search
- **10 Triggers** enforcing business rules at DB level
- **9 Stored Procedures** for complex operations
- **8 Views** with role-based data exposure
- **RBAC Permissions table** (44 permission rows)
- **Audit log** — immutable, triggers block DELETE/UPDATE

---

## 🌍 Deploy to Production (Free)

### Backend → Render.com
1. Push to GitHub
2. Render.com → New Web Service → Connect repo
3. Build: `cd server && npm install`
4. Start: `node server/src/server.js`
5. Add environment variables from `server/.env`

### Database → Railway.app
1. Railway.app → New MySQL
2. Run `database/schema.sql` in Railway MySQL shell
3. Copy connection details to Render env vars

### Frontend → Vercel.com
1. Vercel.com → Import repo → Root dir: `client`
2. Add env vars:
   - `REACT_APP_API_URL=https://your-api.onrender.com/api`
   - `REACT_APP_SOCKET_URL=https://your-api.onrender.com`

---

## 💳 Add Real Payments (M-Pesa)

```bash
cd server && npm install flutterwave-node-v3
```

In `server/.env` add:
```
FLW_PUBLIC_KEY=FLWPUBK-xxxx
FLW_SECRET_KEY=FLWSECK-xxxx
```

Replace the `setTimeout` in `allControllers.js → initiatePayment`
with a real Flutterwave API call to process M-Pesa / Airtel / Tigo.

Register at: https://flutterwave.com (supports Tanzania TZS)

---

## 📱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TailwindCSS |
| Routing | React Router v6 |
| Real-time | Socket.IO |
| Backend | Node.js + Express.js |
| Database | MySQL 8+ |
| Auth | JWT + bcryptjs |
| Security | Helmet + express-rate-limit |
| Uploads | Multer |

---

Made with ❤️ for Tanzania 🇹🇿 | MakaziPlus v3.0
