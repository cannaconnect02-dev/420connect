import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

// Mock expo-router
jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
    useSegments: jest.fn(),
    Slot: () => null,
    Stack: {
        Screen: () => null,
    },
}));

// Mock supabase
jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            onAuthStateChange: jest.fn(() => ({
                data: { subscription: { unsubscribe: jest.fn() } }
            })),
            getUser: jest.fn(),
            verifyOtp: jest.fn(),
            refreshSession: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            update: jest.fn().mockReturnThis(),
        })),
    },
}));

// Import after mocks
import RootLayout from '../app/_layout';

describe('Phone Verification Navigation Flow', () => {
    const mockReplace = jest.fn();
    const mockRouter = { replace: mockReplace, push: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    describe('Race condition handling', () => {
        it('should NOT redirect from address-confirmation back to phone-entry when phoneVerified is stale', async () => {
            // Scenario: User just verified phone, but state hasn't updated yet
            // phoneVerified is false (stale), but user is already on address-confirmation

            (useSegments as jest.Mock).mockReturnValue(['address-confirmation']);

            // Simulate stale state: phoneVerified = false, addressConfirmed = false
            const mockSession = { user: { id: 'test-user-123' } };

            let authCallback: any;
            (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
                authCallback = callback;
                return { data: { subscription: { unsubscribe: jest.fn() } } };
            });

            // Mock profile fetch returning stale data (phone not verified yet)
            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { phone_verified: false, address_confirmed: false },
                    error: null
                }),
            });

            render(<RootLayout />);

            // Trigger auth state change with session
            await act(async () => {
                authCallback('SIGNED_IN', mockSession);
            });

            // Wait for navigation logic to run
            await waitFor(() => {
                // The key assertion: we should NOT be redirected to phone-entry
                // because we're already on address-confirmation
                expect(mockReplace).not.toHaveBeenCalledWith('/phone-entry');
            });
        });

        it('should redirect to phone-entry when phoneVerified is false and NOT on onboarding routes', async () => {
            // User on main tabs but phone not verified
            (useSegments as jest.Mock).mockReturnValue(['(tabs)']);

            const mockSession = { user: { id: 'test-user-123' } };

            let authCallback: any;
            (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
                authCallback = callback;
                return { data: { subscription: { unsubscribe: jest.fn() } } };
            });

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { phone_verified: false, address_confirmed: false },
                    error: null
                }),
            });

            render(<RootLayout />);

            await act(async () => {
                authCallback('SIGNED_IN', mockSession);
            });

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/phone-entry');
            });
        });

        it('should redirect to address-confirmation when phoneVerified is true but addressConfirmed is false', async () => {
            // Phone verified, address not confirmed
            (useSegments as jest.Mock).mockReturnValue(['(tabs)']);

            const mockSession = { user: { id: 'test-user-123' } };

            let authCallback: any;
            (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
                authCallback = callback;
                return { data: { subscription: { unsubscribe: jest.fn() } } };
            });

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { phone_verified: true, address_confirmed: false },
                    error: null
                }),
            });

            render(<RootLayout />);

            await act(async () => {
                authCallback('SIGNED_IN', mockSession);
            });

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/address-confirmation');
            });
        });

        it('should redirect to main tabs when both phoneVerified and addressConfirmed are true', async () => {
            // Both verified, on onboarding route
            (useSegments as jest.Mock).mockReturnValue(['phone-entry']);

            const mockSession = { user: { id: 'test-user-123' } };

            let authCallback: any;
            (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
                authCallback = callback;
                return { data: { subscription: { unsubscribe: jest.fn() } } };
            });

            (supabase.from as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: { phone_verified: true, address_confirmed: true },
                    error: null
                }),
            });

            render(<RootLayout />);

            await act(async () => {
                authCallback('SIGNED_IN', mockSession);
            });

            await waitFor(() => {
                expect(mockReplace).toHaveBeenCalledWith('/(tabs)/');
            });
        });
    });
});
