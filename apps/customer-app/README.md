# 420Connect Customer App

A React Native mobile application for the 420Connect cannabis delivery platform, built with Expo.

## Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Routing:** Expo Router
- **Backend:** Supabase (Auth, Database)
- **State Management:** Zustand
- **Icons:** Lucide React Native
- **Maps:** React Native Maps

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Expo development server |
| `npm run ios` | Start on iOS simulator |
| `npm run android` | Start on Android emulator |
| `npm run web` | Start web version |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |

## Project Structure

```
├── app/                    # Expo Router pages
│   ├── (tabs)/             # Tab navigation screens
│   │   ├── index.tsx       # Home screen
│   │   ├── orders.tsx      # Orders screen
│   │   └── profile.tsx     # Profile screen
│   ├── auth.tsx            # Login/Signup
│   ├── forgot-password.tsx # Password recovery
│   ├── reset-password.tsx  # Password reset
│   ├── otp-verification.tsx# OTP verification
│   └── address-confirmation.tsx # Address setup
├── __tests__/              # Unit tests
├── lib/                    # Shared utilities
│   ├── supabase.ts         # Supabase client
│   └── CartContext.tsx     # Cart state
├── constants/              # App constants
└── assets/                 # Images and fonts
```

## Features

- **Authentication:** Email/password signup and login with OTP verification
- **Password Recovery:** Forgot password flow with email verification
- **Address Management:** Location-based address confirmation with geocoding
- **Profile Management:** View and edit user profile
- **Orders:** Cart and order placement

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch
```

Test coverage includes:
- Authentication flows (login, signup, validation)
- Password recovery (forgot password, reset password)
- Address confirmation (rendering, validation)

## Deployment

### Expo Updates (OTA)

```bash
# Publish update to preview branch
npx eas update --branch preview --message "Your message"
```

### Build

```bash
# Build for iOS
npx eas build --platform ios

# Build for Android
npx eas build --platform android
```

## License

Private - All rights reserved.
