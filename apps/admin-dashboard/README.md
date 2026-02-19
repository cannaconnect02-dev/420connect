# 420Connect Admin Dashboard

Admin panel for managing the 420Connect platform — stores, drivers, pricing, delivery settings, and order configuration.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS v4**
- **Supabase** (backend)
- **Recharts** (analytics charts)
- **React Router v7**

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in this directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Locally

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173)

## Deployment (Vercel)

### First-Time Setup

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Link to your Vercel project
vercel link
```

### Deploy to Production

```bash
vercel --prod
```

### Environment Variables on Vercel

Add these in your Vercel project settings → **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

### Live URL

**Production**: [https://420connectadmin.vercel.app](https://420connectadmin.vercel.app)

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Features

- **Dashboard** — Revenue trends, order volume, system health metrics
- **Store Approvals** — Review and approve new store applications
- **Driver Approvals** — Review and approve driver applications
- **Onboard Store** — Manually onboard new stores
- **Settings** — Global markup, order matching window, delivery configuration (base rate, max radius, extended rate)
