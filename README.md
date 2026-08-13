# Everest Aviation Academy — Full Website

Two separate folders, exactly as requested:

```
everest-aviation-website/
├── frontend/     → premium website (plain HTML/CSS/JS, no build step)
└── backend/      → Node.js + Express API (enquiries + Razorpay payments)
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `ADMIN_KEY` — any password you choose, used to view enquiries.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from https://dashboard.razorpay.com → Settings → API Keys. Start with the **Test** keys (`rzp_test_...`) to try payments safely, switch to live keys later.
- `CORS_ORIGIN` — the URL your frontend runs on (VS Code Live Server default is `http://localhost:5500`).

Start the server:
```bash
npm start
```
It runs on `http://localhost:5000`. Enquiries and payments are saved as JSON files in `backend/data/` — no database installation needed. (You can upgrade to MongoDB/PostgreSQL later; the storage layer is isolated in `src/db.js`.)

## 2. Frontend setup

Open `frontend/index.html` with VS Code's **Live Server** extension (or any static server). Do not just double-click the file — the payment and enquiry features need the page served over `http://`, not `file://`.

In `frontend/js/main.js`, the first line sets:
```js
const API_BASE = 'http://localhost:5000';
```
Change this to your real backend URL once it's deployed online.

## 3. Using it

- **Enquiry form** → saved to the backend, visible via the gold `✦` button (bottom-right) after entering your admin key.
- **Reserve Your Seat** → creates a real Razorpay order and opens the secure checkout. On success it's verified server-side and stored in `backend/data/payments.json`.
- No test/demo data, no console logging of personal data — only a single startup line is printed.

## 4. Going live (when ready)

- **Backend**: deploy to Render, Railway, or a VPS. Set the same environment variables there.
- **Frontend**: deploy to Netlify, Vercel, or your existing hosting. Update `API_BASE` to the live backend URL.
- Switch Razorpay keys from `rzp_test_...` to your live keys once KYC is approved.
- Point your domain (everestaviationacademy.com) at the deployed frontend.

## 5. Email alerts (optional but recommended)

To get an email every time someone submits an enquiry:
1. Use a Gmail account (or create one for the academy)
2. Turn on 2-Step Verification on that Gmail account
3. Go to https://myaccount.google.com/apppasswords and generate an **App Password**
4. In `backend/.env`, set `EMAIL_USER` to the Gmail address and `EMAIL_PASS` to the generated app password (not your normal Gmail password)
5. Restart the backend (`npm start`)

If left unset, the site works exactly the same — you just won't get email alerts, and can still check `backend/data/enquiries.json` or the admin panel (✦ button) any time.

## 6. Legal pages

`privacy-policy.html`, `terms.html`, and `refund-policy.html` are included and linked in the footer — Razorpay requires these to be live before approving real payments. Review the wording (especially the refund timelines) with your team before publishing, since they were written as a reasonable starting template, not your exact internal policy.

## 7. Support

The site content (courses, contact details, testimonials) is pulled from your existing site. Update text directly in `frontend/index.html`, colors/fonts in `frontend/css/style.css`.
