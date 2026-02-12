# Deploying Merchant Portal to Vercel

This guide explains how to deploy the Merchant Portal application to Vercel.

## Prerequisites

- [Vercel Account](https://vercel.com/signup)
- [Vercel CLI](https://vercel.com/docs/cli) (optional, for command line deployment)

## Method 1: Deploying via Vercel Dashboard (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
3. Click "Add New..." -> "Project".
4. Import your Git repository.
5. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/merchant-portal`
   - **Build Command**: `npm run build` (or `tsc -b && vite build`)
   - **Output Directory**: `dist`
   - **Environment Variables**: Add any required variables from `.env` (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

6. Click "Deploy".

## Method 2: Deploying via CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from the project root:
   ```bash
   cd apps/merchant-portal
   vercel
   ```
   
   Follow the prompts to link the project.

## Configuration

A `vercel.json` file has been added to `apps/merchant-portal` to handle Single Page Application (SPA) routing.
