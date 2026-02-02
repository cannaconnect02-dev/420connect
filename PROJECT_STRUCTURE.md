# Marketplace MVP - Project Structure

> **420Connect** - A multi-app cannabis delivery marketplace platform

## Overview

This monorepo contains 4 applications that work together to provide a complete delivery marketplace:

| App | Tech Stack | Port | Description |
|-----|------------|------|-------------|
| **Customer App** | React Native (Expo) | 8081/8082 | Mobile app for ordering products |
| **Driver App** | React Native (Expo) | 8081 | Mobile app for delivery drivers |
| **Merchant Portal** | React + Vite | 5173/5174 | Web portal for store management |
| **Admin Dashboard** | React + Vite | 5173 | Web portal for admin management |

---

## Directory Structure

```
marketplace-mvp/
├── apps/                          # Application source code
│   ├── customer-app/              # React Native (Expo) customer app
│   ├── driver-app/                # React Native (Expo) driver app
│   ├── merchant-portal/           # React + Vite merchant web portal
│   └── admin-dashboard/           # React + Vite admin web portal
├── packages/                      # Shared packages (future use)
├── supabase/                      # Supabase configuration
│   ├── config.toml                # Supabase local config
│   └── migrations/                # Database migrations
├── tests/                         # Integration tests
├── *.sql                          # Database schema & fixes
├── *.js                           # Utility scripts
├── package.json                   # Root package with npm scripts
└── FEATURES.md                    # Feature documentation
```

---

## Apps Structure

### Customer App (`apps/customer-app/`)
```
customer-app/
├── app/                           # Expo Router pages
│   ├── (tabs)/                    # Tab navigation screens
│   │   ├── index.tsx              # Home - Store listing
│   │   ├── orders.tsx             # Order history & tracking
│   │   ├── cart.tsx               # Shopping cart
│   │   └── profile.tsx            # User profile
│   ├── restaurant/                # Store detail screens
│   ├── auth.tsx                   # Login/Signup
│   ├── address-confirmation.tsx   # Delivery address setup
│   └── _layout.tsx                # Root layout
├── lib/
│   ├── supabase.ts                # Supabase client
│   └── store.ts                   # Zustand store
├── constants/                     # Theme & constants
└── package.json
```

### Driver App (`apps/driver-app/`)
```
driver-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx              # Radar - Job offers
│   │   ├── deliveries.tsx         # Active deliveries
│   │   └── profile.tsx            # Driver profile
│   ├── auth.tsx                   # Driver authentication
│   ├── pending_approval.tsx       # Approval waiting screen
│   └── _layout.tsx
├── components/
│   ├── MapView.tsx
│   └── ChatModal.tsx
├── lib/
│   └── supabase.ts
├── constants/
│   └── nanobanana.ts              # NanoTheme (green/black)
└── tests/
```

### Merchant Portal (`apps/merchant-portal/`)
```
merchant-portal/
├── src/
│   ├── pages/
│   │   ├── Auth.tsx               # Login/Signup
│   │   ├── Dashboard.tsx          # Store overview
│   │   ├── Orders.tsx             # Order management
│   │   ├── Menu.tsx               # Product management
│   │   ├── Members.tsx            # Staff management
│   │   ├── Earnings.tsx           # Revenue analytics
│   │   └── Settings.tsx           # Store settings
│   ├── components/
│   │   ├── ui/                    # Reusable UI (Button, Card, Dialog)
│   │   ├── layout/                # Layout components
│   │   ├── orders/                # Order components
│   │   ├── menu/                  # Menu components
│   │   └── dashboard/             # Dashboard widgets
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

### Admin Dashboard (`apps/admin-dashboard/`)
```
admin-dashboard/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── DriverApprovals.tsx    # Approve/reject drivers
│   │   └── Stores.tsx             # Manage stores
│   ├── lib/
│   │   └── supabase.ts
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

---

## Database Schema (Supabase PostgreSQL)

### Tables
| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends auth.users) |
| `restaurants` | Store/dispensary information |
| `menu_items` | Products for each store |
| `orders` | Customer orders |
| `order_items` | Line items for each order |
| `messages` | Chat messages between users |

### Views
- `driver_orders_view` - Orders ready for driver pickup
- `merchant_orders_view` - Orders for merchant dashboard
- `user_roles` - User role lookup

### Key Fields
```sql
profiles:
  - id (UUID, FK to auth.users)
  - role ('customer' | 'merchant' | 'driver' | 'admin')
  - full_name, phone_number, avatar_url
  - current_location (GEOGRAPHY)
  - vehicle_details (JSONB) -- for drivers
  - delivery_lat, delivery_lng -- customer delivery location

restaurants:
  - id, owner_id, name, description
  - location (GEOGRAPHY), latitude, longitude
  - address, is_active, operating_hours

orders:
  - status: 'pending' → 'preparing' → 'ready_for_pickup' → 'picked_up' → 'delivered'
  - driver_id, customer_id, restaurant_id
  - delivery_address, total_amount
```

---

## Order Flow

```
1. Customer places order      → status: 'pending'
2. Merchant accepts           → status: 'preparing'
3. Merchant marks ready       → status: 'ready_for_pickup'
4. Driver accepts delivery    → status: 'picked_up' + driver_id assigned
5. Driver completes delivery  → status: 'delivered'
```

---

## Quick Start

### Run All Apps
```bash
npm run start:all
```

### Run Individual Apps
```bash
# Merchant Portal (web)
npm run start:merchant

# Admin Dashboard (web)
npm run start:admin

# Customer App (mobile/web)
npm run start:customer

# Driver App (mobile)
npm run start:driver
```

### Run Tests
```bash
npm test
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@marketplace.com` | `Admin123!` |
| Merchant | `merchant_test@test.com` | `Herbsway123!` |
| Driver | `driver_test@test.com` | `Driver123!` |
| Customer | `professorshabs@gmail.com` | `password123` |

---

## Tech Stack

- **Mobile**: React Native (Expo SDK 54)
- **Web**: React 19 + Vite
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Database**: PostgreSQL with PostGIS extension
- **Maps**: react-native-maps (Google Maps provider)
- **Styling**: Tailwind CSS (web), NanoTheme (mobile)
- **State**: Zustand
- **Icons**: Lucide React

---

## Key Files

| File | Purpose |
|------|---------|
| `FEATURES.md` | Detailed feature documentation |
| `reconstructed_schema_v2.sql` | Full database schema |
| `walkthrough_login.md` | Setup and login guide |
| `package.json` | npm scripts for running apps |
