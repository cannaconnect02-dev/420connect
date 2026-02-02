# 420Connect - Cannabis Delivery Marketplace

A multi-application platform for cannabis delivery featuring customer app, driver app, merchant portal, and admin dashboard.

## 📁 Folder Structure

This is a monorepo containing 4 independent applications:

```
420connect/
├── apps/                      # All applications
│   ├── customer-app/         # React Native (Expo) - Mobile customer app
│   ├── driver-app/           # React Native (Expo) - Mobile driver app
│   ├── merchant-portal/      # React + Vite - Merchant management portal
│   └── admin-dashboard/      # React + Vite - Admin management dashboard
├── supabase/                 # Supabase configuration
│   ├── config.toml          # Local dev configuration
│   └── migrations/          # Database migration files
├── tests/                    # Integration & system tests
├── packages/                # Shared packages (future)
├── FEATURES.md              # Feature documentation
├── PROJECT_STRUCTURE.md     # Detailed structure reference
├── README.md                # This file
└── package.json             # Root package with workspace config
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (local or cloud)

### Installation
```bash
# Install dependencies for all apps
npm install

# Or for a specific app
cd apps/merchant-portal && npm install
```

### Running Applications

**Start all applications:**
```bash
npm run dev:all
```

**Start individual applications:**
```bash
# Merchant Portal (React + Vite) - port 5173
npm run dev:merchant

# Admin Dashboard (React + Vite) - port 5173
npm run dev:admin

# Customer App (Expo) 
npm run dev:customer

# Driver App (Expo)
npm run dev:driver
```

### Building for Production
```bash
npm run build
```

## 📱 Applications Overview

| App | Stack | Port | Purpose |
|-----|-------|------|---------|
| **Customer App** | React Native, Expo | 8081+ | Browse stores, place orders, track delivery |
| **Driver App** | React Native, Expo | 8081+ | Accept deliveries, navigate, communicate |
| **Merchant Portal** | React 19, Vite | 5173/5174 | Manage orders, inventory, staff, earnings |
| **Admin Dashboard** | React 19, Vite | 5173 | Manage drivers, stores, platform settings |

### Customer App (`apps/customer-app/`)
- Browse available stores and products
- Create user profile and delivery address
- Place and track orders in real-time
- Chat with driver during delivery
- Review order history

### Driver App (`apps/driver-app/`)
- Accept delivery jobs from radar view
- Navigate to pickup and delivery locations
- Chat with merchants and customers
- Manage active deliveries
- Access earnings and ratings

### Merchant Portal (`apps/merchant-portal/`)
- Manage restaurant/dispensary profile
- View and process incoming orders
- Update menu items and pricing
- Manage staff members
- Track earnings and analytics
- Configure store settings and operating hours

### Admin Dashboard (`apps/admin-dashboard/`)
- Approve/reject driver applications
- Monitor store operations
- View platform-wide analytics
- Manage user accounts and roles
- Configure system settings

## 🗄️ Database Architecture

### Core Tables
- **profiles** - User accounts (customers, merchants, drivers, admins)
- **restaurants** - Store/dispensary information
- **menu_items** - Products offered by each store
- **orders** - Customer orders and delivery tracking
- **order_items** - Individual items in orders
- **messages** - Chat system for driver-customer communication

### Key Fields
- `profiles.role` - 'customer' | 'merchant' | 'driver' | 'admin'
- `profiles.current_location` - GEOGRAPHY for location tracking
- `orders.status` - pending → preparing → ready_for_pickup → picked_up → delivered
- `restaurants.location` - GEOGRAPHY for distance calculations

## 🔑 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@marketplace.com` | `Admin123!` |
| Merchant | `merchant_test@test.com` | `Herbsway123!` |
| Driver | `driver_test@test.com` | `Driver123!` |
| Customer | `professorshabs@gmail.com` | `password123` |

## 🛠️ Tech Stack

### Frontend (Web)
- **Framework**: React 19
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI
- **State**: Zustand
- **Icons**: Lucide React

### Frontend (Mobile)
- **Framework**: React Native 0.76
- **Runtime**: Expo 54
- **Routing**: Expo Router
- **Maps**: react-native-maps
- **State**: Zustand
- **Icons**: Lucide React Native

### Backend
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **Realtime**: Supabase Realtime
- **Storage**: Supabase Storage
- **Spatial**: PostGIS extension

### Development
- **Language**: TypeScript
- **Linting**: ESLint
- **Testing**: Vitest, Jest
- **Package Manager**: npm (workspaces)

## 📦 Environment Variables

Each app needs a `.env.local` file. Copy from `.env.example`:

```bash
# Merchant Portal
cp apps/merchant-portal/.env.example apps/merchant-portal/.env.local

# Admin Dashboard  
cp apps/admin-dashboard/.env.example apps/admin-dashboard/.env.local

# Customer App
cp apps/customer-app/.env.example apps/customer-app/.env.local

# Driver App
cp apps/driver-app/.env.example apps/driver-app/.env.local
```

Then update with your actual values:
- Supabase project URL and API key
- Google Maps API key (for mobile apps)
- Any other service credentials

## 📚 Documentation Files

- **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed directory structure and file organization
- **[FEATURES.md](./FEATURES.md)** - Complete feature documentation
- **[README.md in each app](./apps/)** - App-specific setup and architecture

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Run tests for specific app
```bash
npm test --workspace=apps/merchant-portal
```

## 🔗 Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [React Native Expo](https://docs.expo.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [PostGIS Documentation](https://postgis.net/)

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes in the appropriate app directory
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Commit and push your changes
6. Create a pull request

## 📝 Order Flow

```
Customer Places Order
    ↓
Restaurant Receives (status: pending)
    ↓
Restaurant Accepts (status: preparing)
    ↓
Restaurant Marks Ready (status: ready_for_pickup)
    ↓
Driver Accepts Delivery (status: picked_up)
    ↓
Driver Completes Delivery (status: delivered)
    ↓
System Closes Order
```

## 🐛 Troubleshooting

### Port already in use?
```bash
# Find process using port 5173
lsof -i :5173
# Kill it
kill -9 <PID>
```

### Dependencies issues?
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Supabase connection issues?
- Check `.env.local` files have correct URLs
- Verify Supabase project is running
- Check network connectivity

## 📄 License

© 2026 420Connect. All rights reserved.

---

For detailed information about the project structure and setup, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
