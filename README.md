# 🎧 Spotify Premium Tracker

Web app per gestire i pagamenti condivisi di Spotify Premium.

Permette di tenere traccia di:
- chi ha pagato
- chi deve ancora pagare
- pagamenti parziali
- totale incassato per mese
- quote mancanti
- storico pagamenti per persona (esportabile in PDF)

Accessibile da telefono e PC tramite browser.

---

## ✨ Funzionalità principali

- Dashboard con stato pagamenti del mese
- Gestione partecipanti
- Report mensile con totali e mancanti
- Esportazione PDF dello storico per ogni partecipante
- Interfaccia ottimizzata per mobile e desktop

---

## 🚀 Tecnologie

- Next.js
- Supabase (database e login)
- Vercel (deploy)

---

## 🧪 Avvio in locale

1. Clona il progetto
2. Installa le dipendenze

```bash
npm install
```
3. Crea un file .env.local con:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Avvia
```bash
npm run dev
```
