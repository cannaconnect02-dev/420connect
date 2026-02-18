
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
// We need to import the component that contains the navigation logic.
// Based on previous steps, the logic is in apps/customer-app/app/_layout.tsx
import RootLayout from '../app/_layout';
import { supabase } from '../lib/supabase';
import { useRouter, useSegments } from 'expo-router';

// Mock dependencies
jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
    useSegments: jest.fn(),
    Slot: jest.fn(() => null), // Mock Slot as it just renders children
    ErrorBoundary: jest.fn(({ children }) => children),
}));

jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: jest.fn(),
            getUser: jest.fn(),
        },
        from: jest.fn(),
    },
}));

jest.mock('../lib/CartContext', () => ({
    CartProvider: jest.fn(({ children }) => children),
}));

describe('RootLayout Navigation Guard', () => {
    const mockRouter = {
        replace: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    const setupAuthMock = (sessionUser: any, profileData: any) => {
        // Mock onAuthStateChange to return the session immediately
        (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
            if (sessionUser) {
                callback('SIGNED_IN', { user: sessionUser });
            } else {
                callback('SIGNED_OUT', null);
            }
            return { data: { subscription: { unsubscribe: jest.fn() } } };
        });

        // Mock profile check
        if (sessionUser) {
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: profileData,
                            error: null
                        }),
                    }),
                }),
            });
        }
    };

    it('redirects to auth if no session', async () => {
        (useSegments as jest.Mock).mockReturnValue(['(tabs)']); // Current segment is protected
        setupAuthMock(null, null);

        render(<RootLayout />);

        await waitFor(() => {
            expect(mockRouter.replace).toHaveBeenCalledWith('/auth');
        });
    });

    it('redirects to phone-entry if phone is NOT verified', async () => {
        (useSegments as jest.Mock).mockReturnValue(['(tabs)']);
        setupAuthMock(
            { id: 'user-123' },
            { phone_verified: false, address_confirmed: false }
        );

        render(<RootLayout />);

        await waitFor(() => {
            expect(mockRouter.replace).toHaveBeenCalledWith('/phone-entry');
        });
    });

    it('redirects to address-confirmation if phone verified but address NOT confirmed', async () => {
        (useSegments as jest.Mock).mockReturnValue(['(tabs)']);
        setupAuthMock(
            { id: 'user-123' },
            { phone_verified: true, address_confirmed: false }
        );

        render(<RootLayout />);

        await waitFor(() => {
            expect(mockRouter.replace).toHaveBeenCalledWith('/address-confirmation');
        });
    });

    it('redirects to main tabs if BOTH verified and on onboarding/auth route', async () => {
        (useSegments as jest.Mock).mockReturnValue(['auth']); // On login screen
        setupAuthMock(
            { id: 'user-123' },
            { phone_verified: true, address_confirmed: true }
        );

        render(<RootLayout />);

        await waitFor(() => {
            expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/');
        });
    });

    it('does NOT redirect if address is unconfirmed but user is already on address-confirmation page', async () => {
        (useSegments as jest.Mock).mockReturnValue(['address-confirmation']);
        setupAuthMock(
            { id: 'user-123' },
            { phone_verified: true, address_confirmed: false }
        );

        render(<RootLayout />);

        // Should NOT call replace because we are already there
        await waitFor(() => {
            // We wait a bit to ensure effects run
            expect(mockRouter.replace).not.toHaveBeenCalled();
        }, { timeout: 1000 });

    });
});
