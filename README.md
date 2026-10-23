# My Hub — Material 3 inspired

A responsive static hub for server addresses and useful links.

## Features
- Material 3-inspired responsive interface and system light/dark theme.
- Search, server cards, link cards.
- Admin modal (password: `6767`) to add, edit and remove entries.
- Import/export JSON backup.

## Important limitations
This is a static, client-side website. Admin changes are saved only in the current browser's `localStorage`; they do not update the website for other visitors. The password is embedded in the frontend and is **not secure authentication**. Do not use this for sensitive or private content. For shared edits and real authentication, connect a backend/database and server-side auth.

## Deploy
Serve `index.html` from any static host, including GitHub Pages, Cloudflare Pages, or Vercel.
