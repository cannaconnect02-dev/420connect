# Marketplace MVP - Implemented Features

> Last Updated: 2026-01-22

This document tracks all implemented features in the CannaDelivery marketplace platform.

---

## Apps Overview

| App | Technology | Purpose |
|-----|------------|---------|
| `customer-app` | React Native (Expo) | Customer ordering app |
| `driver-app` | React Native (Expo) | Driver delivery app |
| `merchant-portal` | React + Vite | Store management web portal |
| `admin-dashboard` | React + Vite | Admin management dashboard |

---

## Driver App Features

### 1. Authentication Flow (`app/auth.tsx`)
- **Split Views**: Separate Sign In and Sign Up screens
- **Profile Picture**: Circular avatar upload using `expo-image-picker`
- **Vehicle Details**: Car Registration Number input
- **Age Verification**: DOB with calendar date picker (18+ validation)
- **Document Upload**: ID/Driver License upload
- **Terms & Conditions**: Checkbox + modal with legal text
- **Show/Hide Password**: Eye toggle for password fields

### 2. Pending Approval (`app/pending_approval.tsx`)
- **Waiting Room**: New drivers wait for admin approval
- **Rejection Display**: Shows rejection reason if declined

### 3. Job Offer Screen (`app/(tabs)/index.tsx`)
- **Dynamic Pricing Display**: Shows calculated driver payout (not order total)
- **Formula**: R30 base fare (first 5km) + R2.50/km after 5km
- **"Potential Earning" Label**: Clear label below amount

### 4. Active Delivery (`app/(tabs)/deliveries.tsx`)
- **Live Location Broadcast**: Updates `profiles.current_location` every 5 seconds when status is "picked_up"
- **Dark Theme Map**: Custom dark mode Google Maps styling
- **Chat Integration**: Customer chat modal

---

## Customer App Features

### 1. Authentication (`app/auth.tsx`)
- **Login/Signup Toggle**: Clean toggle interface
- **Age Verification**: 18+ DOB validation
- **Document Upload**: ID upload for verification
- **Premium Design**: Slate/Indigo dark theme

### 2. Checkout - Geofencing (`app/(tabs)/orders.tsx`)
- **20km Distance Limit**: Validates distance between store and customer
- **Error Message**: "Sorry, this store does not deliver to your location."
- **Distance Utility**: `getDistanceFromLatLonInKm()` function

### 3. Order Tracking
- **Real-time Status Updates**: Supabase realtime subscription
- **Progress Bar**: Visual progress indicator
- **Status Badges**: Color-coded status labels

---

## Admin Dashboard Features

### 1. Driver Approvals (`src/pages/DriverApprovals.tsx`)
- **Pending Drivers List**: Shows all pending driver applications
- **Approve Action**: Updates status to "active"
- **Reject Action**: Prompts for rejection reason
- **Rejection Reason Storage**: Saves to `profiles.rejection_reason`

---

## Merchant Portal Features

### 1. Authentication (`src/pages/Auth.tsx`)
- **Name, DOB, Document Upload**: Full onboarding form
- **18+ Age Verification**: DOB validation

---

## Database Schema Additions

```sql
-- profiles table additions
vehicle_details JSONB   -- Driver vehicle info { registration_number: string }
rejection_reason TEXT   -- Admin rejection reason for declined drivers
```

---

## Shared Utilities

### Distance Calculation
```typescript
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
```

### Driver Payout Calculation
```typescript
function calculateDriverPayout(distanceKm: number): number {
    const BASE_FARE = 30;  // R30 for first 5km
    const BASE_KM = 5;
    const RATE_PER_KM = 2.5;  // R2.50 per km after 5km
    
    if (distanceKm <= BASE_KM) return BASE_FARE;
    return BASE_FARE + ((distanceKm - BASE_KM) * RATE_PER_KM);
}
```

---

## Tech Stack

- **Frontend**: React Native (Expo SDK 54), React, Vite
- **Backend**: Supabase (Auth, Database, Realtime)
- **Database**: PostgreSQL with PostGIS
- **Maps**: react-native-maps with Google Maps provider
- **Icons**: lucide-react-native
- **Styling**: NanoTheme (Green/Black dark theme for Driver app)

---

## Dependencies Added

### Driver App
- `expo-image-picker` - Profile photo upload
- `expo-document-picker` - ID document upload
- `@react-native-community/datetimepicker` - Calendar date picker

### Customer App
- `expo-document-picker` - ID document upload

---

## Future Enhancements (Not Yet Implemented)

1. **Customer Live Tracking Map**: Show driver's real-time position on customer app with ETA
2. **Photo Upload to Storage**: Actually upload profile photos to Supabase Storage
3. **Dynamic Delivery Address**: Let customer input/select delivery address
4. **Mock Email Notifications**: Send rejection emails to drivers
