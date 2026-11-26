# FLEXDESK — by Vansh

A responsive gym-management website starter built with React, Vite and Supabase.

## 1. Configure Supabase

Create a `.env` file in the project root (same folder as `package.json`) using `.env.example`.

Set:
- `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co` (base URL only; do not add `/rest/v1/`)
- `VITE_SUPABASE_PUBLISHABLE_KEY=your_sb_publishable_key`

Never put a Supabase secret/service-role key in frontend code.

## 2. Run locally

Install Node.js, then run:

```bash
npm install
npm run dev
```

## 3. Deploy

Push the project to a Git repository and import it into Netlify.
Build command: `npm run build`
Publish directory: `dist`

Add the two environment variables from `.env` in Netlify Site configuration.

## Important setup notes

- The SQL schema creates a gym and owner profile when a new Supabase Auth user signs up.
- For first testing, sign up with an owner account and gym name.
- If email confirmation is enabled, confirm the email before signing in.
- Staff invitation/role assignment, payment entry, plan creation, and production hardening are not yet included in this first UI starter.
- Before public launch, test tenant isolation and review database policies. Do not disable RLS.
