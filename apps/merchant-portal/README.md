# Merchant Portal

React + Vite web application for store managers to manage inventory, orders, and store settings.

## Tech Stack
- React 19
- Vite 6
- Supabase
- Tailwind CSS
- TypeScript
- Radix UI

## Scripts
- `npm run dev` - Start development server (port 5173)
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm run preview` - Preview production build

## Structure
```
src/
├── pages/              # Page components
├── components/         # Reusable components
│   ├── ui/            # Base UI components
│   ├── layout/        # Layout components
│   ├── orders/        # Order-related components
│   └── menu/          # Menu-related components
├── contexts/          # React contexts
├── hooks/             # Custom hooks
├── lib/               # Utilities
├── App.tsx            # Root component
└── main.tsx           # Entry point
```

## Features
- Store dashboard with metrics
- Order management
- Menu/product management
- Staff member management
- Revenue analytics
- Store settings

## Setup
1. Install dependencies: `npm install`
2. Create `.env.local` with Supabase credentials
3. Run: `npm run dev`
