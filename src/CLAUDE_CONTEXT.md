# Vastra Track — Project Context for Claude

## What is this project?
A tailor management SaaS app called "Vastra Track" built for Indian clothing brands like CottonKing, Tizer etc.

## Tech Stack
- React 18 + Vite
- Tailwind CSS v3.4.1
- React Router v6
- Lucide React (icons)
- Supabase (database + auth)
- Google Fonts: Syne + Inter

## Database Tables (Supabase)
- customers (id, name, phone, address, owner_id)
- orders (id, customer_id, item_name, fabric, total_price, advance_paid, status, due_date, notes, owner_id)
- workers (id, name, phone, specialty, owner_id)
- measurements (id, order_id, customer_id, garment_type, neck, shoulder, chest, sleeve, length, waist, hips, inseam, thigh, notes)
- profiles (id, brand_name, email)

## Features Already Built
- Multi-brand login/signup (Supabase Auth)
- Row Level Security (each brand sees only their data)
- Dashboard with clickable stat cards
- Customers page (add, search, delete)
- Orders page (add with measurements in inches, status tracking, add customer inline)
- Billing page (payment recording, receipt printing)
- Workers page
- SMS notifications via Twilio + Supabase Edge Functions
- Deployed on Vercel

## File Structure
src/
  pages/
    Dashboard.jsx
    Customers.jsx
    Orders.jsx
    Billing.jsx
    Workers.jsx
    Login.jsx
  components/
    Sidebar.jsx
  lib/
    supabase.js
supabase/
  functions/
    send-sms/
      index.ts

## Design Theme
- Dark theme: #080810 background
- Accent: amber/gold (#f59e0b)
- Font: Syne (headings) + Inter (body)
- All inline styles used (no Tailwind classes in new components)

## Important Rules for Coding
- Always use Git Bash terminal (not PowerShell)
- Never touch .env file
- owner_id must be included in every insert query
- Measurements are in inches
- Use supabase.functions.invoke() for Edge Functions (not fetch)

## How to Run
cd tailor-app
npm run dev
Open: http://localhost:5173

## GitHub Repo
https://github.com/yashrajdongare/vastra-track