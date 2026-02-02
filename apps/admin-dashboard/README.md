# Admin Dashboard

React + Vite web application for administrators to manage drivers, stores, and platform settings.

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
│   ├── Login.tsx      # Login page
│   ├── Dashboard.tsx  # Main dashboard
│   ├── DriverApprovals.tsx  # Driver approval management
│   └── Stores.tsx     # Store management
├── lib/               # Utilities
├── App.tsx            # Root component
└── main.tsx           # Entry point
```

## Features
- Driver approval/rejection workflow
- Store management and monitoring
- Platform analytics
- User management

## Setup
1. Install dependencies: `npm install`
2. Create `.env.local` with Supabase credentials
3. Run: `npm run dev`
