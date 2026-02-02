# Customer App

React Native (Expo) mobile app for customers to browse stores and place orders.

## Tech Stack
- React Native 0.76
- Expo 54
- Supabase
- Zustand (state management)
- TypeScript

## Scripts
- `npm run dev` - Start development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run web version
- `npm run lint` - Run linter

## Structure
```
├── app/                    # Expo Router pages
│   ├── (tabs)/            # Tab navigation
│   ├── restaurant/        # Store details
│   └── auth.tsx           # Authentication
├── lib/                   # Utilities
├── constants/             # Theme & constants
└── assets/                # Images & icons
```

## Setup
1. Install dependencies: `npm install`
2. Create `.env.local` with Supabase credentials
3. Run: `npm run dev`
