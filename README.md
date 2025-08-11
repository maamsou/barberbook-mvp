
# BarberBook — MVP (React + Vite + Tailwind)

## Lancer en local
```bash
npm i
npm run dev
```

## Déployer (Vercel)
1. Crée un repo GitHub, pousse ce dossier.
2. Sur https://vercel.com → **New Project** → Import depuis GitHub.
3. Framework: **Vite**, Build Command: `npm run build`, Output: `dist` (auto).
4. Déployer. L'app sera accessible en HTTPS.

## Déployer (Netlify)
- New site → Import depuis Git → Build: `npm run build` → Publish dir: `dist`.

## WhatsApp
- Dans `src/App.tsx`, change `OWNER_WHATSAPP` par ton numéro (format `+336...`).
- Les boutons envoient des messages via **Click-to-Chat**. Pour envois auto J-1/H-2,
  crée un petit backend avec la **WhatsApp Cloud API** (Meta).

## À faire ensuite
- Brancher **Stripe** pour un vrai acompte + webhooks.
- Persister les réservations dans une DB (Airtable/Neon Postgres).
- Espace barbier (fermeture créneaux, congés, etc.).
