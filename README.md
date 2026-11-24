# A — React site

Vite + React + Firebase. English / Arabic (RTL) with a toggle in the menu.

## Run locally
    npm install
    npm run dev

## Deploy (Vercel)
Framework preset: Vite · Build command: `npm run build` · Output directory: `dist`.
`vercel.json` already contains the SPA rewrite and the Cross-Origin-Opener-Policy header Google sign-in needs.

## Where things are
- `src/i18n/translations.js` — all English and Arabic text
- `src/styles.css` — colors, fonts, spacing (see `:root`)
- `src/firebase.js` — Firebase config and ADMIN_EMAILS
- `src/pages/` — Home, Courses, Login, Checkout, Admin, Privacy
- `public/course-viewer.html` — the book reader (kept as a standalone page; restyled, not rewritten)
