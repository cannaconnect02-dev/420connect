import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import CheckoutScreen from '../app/checkout';
import { supabase } from '../lib/supabase';
import { CartProvider } from '../lib/CartContext';

// Mocks
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock('react-native-paystack-webview', () => ({
    usePaystack: () => ({
        popup: {
            checkout: jest.fn(),
            newTransaction: jest.fn(),
        }
    }),
    PaystackProvider: ({ children }: any) => children,
}));

jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            insert: jest.fn().mockReturnThis(),
        })),
    }
}));

describe('Checkout Flow', () => {

    const wrapper = ({ children }: { children: React.ReactNode }) => <CartProvider>{children}</CartProvider>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders checkout details correctly', async () => {
        // 1. Mock User & Address
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'u1', email: 'test@example.com' } }
        });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'user_addresses') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: {
                            address_line1: '123 Main St',
                            city: 'Cape Town',
                            postal_code: '8001',
                            lat: -33.9,
                            lng: 18.4
                        }
                    }),
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null })
            };
        });

        const { getByText } = render(<CheckoutScreen />, { wrapper });

        await waitFor(() => {
            expect(getByText('Checkout')).toBeTruthy();
            expect(getByText('123 Main St')).toBeTruthy();
            expect(getByText('Cape Town, 8001')).toBeTruthy();
            expect(getByText('Paystack Secure Payment')).toBeTruthy(); // Verify Payment Method text
        });
    });
});
