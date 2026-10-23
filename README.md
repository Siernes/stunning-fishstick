# My Hub — Material 3 inspired

Responsive static hub for server addresses and useful links.

## Features
- Material 3-inspired responsive interface with light/dark system theme.
- Search, server cards, link cards.
- Separate admin page: `admin.html`.
- Add, edit, and remove entries; import/export JSON backup.
- Admin password is checked by comparing a SHA-256 hash.

## Important limitations
This is a static, client-side website. Admin changes are saved only in the current browser's `localStorage`; they do not update the site for other visitors. The SHA-256 hash is present in frontend code, so this is **not secure authentication**. Use server-side authentication and a backend/database for a public admin panel.

## Deploy
Serve `index.html` and `admin.html` from the same static host, including GitHub Pages, Cloudflare Pages, or Vercel.
