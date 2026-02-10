import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import CheckoutScreen from '../app/checkout';
import { supabase } from '../lib/supabase';
import { useCart } from '../lib/CartContext';
import { Alert } from 'react-native';

// Mocks
jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
    useFocusEffect: (callback: any) => callback(), // Run focus effect immediately
}));

jest.mock('react-native-paystack-webview', () => {
    const popupMock = {
        checkout: jest.fn(),
    };
    return {
        usePaystack: () => ({ popup: popupMock }),
        PaystackProvider: ({ children }: any) => children,
    };
});

// Mock CartContext
jest.mock('../lib/CartContext', () => ({
    useCart: jest.fn(),
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

// Spy on Alert
jest.spyOn(Alert, 'alert');

describe('Checkout Flow', () => {

    const mockClearCart = jest.fn();
    const mockRouterReplace = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Router Mock
        const useRouter = require('expo-router').useRouter;
        useRouter.mockReturnValue({ replace: mockRouterReplace, push: jest.fn(), back: jest.fn() });

        // Setup Cart Mock
        (useCart as jest.Mock).mockReturnValue({
            items: [
                { id: 'item1', name: 'Burger', price: 100, quantity: 2 },
                { id: 'item2', name: 'Fries', price: 50, quantity: 1 }
            ],
            total: 250,
            clearCart: mockClearCart,
            storeId: 'store_123'
        });

        // Setup Supabase User Mock
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user_123', email: 'test@example.com' } }
        });

        // Setup Supabase Address & Store Mock
        (supabase.from as jest.Mock).mockImplementation((table) => {
            const mockBuilder: any = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn(),
                insert: jest.fn().mockReturnThis(),
            };

            if (table === 'user_addresses') {
                mockBuilder.single.mockResolvedValue({
                    data: {
                        address_line1: '123 Main St',
                        city: 'Cape Town',
                        postal_code: '8001',
                        lat: -33.9,
                        lng: 18.4
                    }
                });
            } else if (table === 'stores') {
                mockBuilder.single.mockResolvedValue({
                    data: {
                        latitude: -33.91, // Close enough
                        longitude: 18.41,
                        name: 'Test Store'
                    }
                });
            } else if (table === 'orders') {
                mockBuilder.single.mockResolvedValue({
                    data: { id: 'order_123' },
                    error: null
                });
            } else {
                mockBuilder.single.mockResolvedValue({ data: null });
            }
            return mockBuilder;
        });
    });

    it('renders checkout details correctly', async () => {
        const { getByText, getAllByText } = render(<CheckoutScreen />);

        await waitFor(() => {
            expect(getByText('Checkout')).toBeTruthy();
            expect(getByText('123 Main St')).toBeTruthy();
            expect(getByText('Burger')).toBeTruthy();
            expect(getAllByText('R250.00')).toBeTruthy(); // Total
        });
    });

    it('triggers Paystack checkout when Pay button is pressed', async () => {
        const { getByText } = render(<CheckoutScreen />);
        const { usePaystack } = require('react-native-paystack-webview');
        const { popup } = usePaystack();

        await waitFor(() => expect(getByText('Pay R250.00')).toBeTruthy());

        fireEvent.press(getByText('Pay R250.00'));

        expect(popup.checkout).toHaveBeenCalledWith(expect.objectContaining({
            email: 'test@example.com',
            amount: 25000, // 250 * 100
        }));
    });

    it('creates order and clears cart on successful payment', async () => {
        const { getByText } = render(<CheckoutScreen />);
        const { usePaystack } = require('react-native-paystack-webview');
        const { popup } = usePaystack();

        await waitFor(() => expect(getByText('Pay R250.00')).toBeTruthy());

        // Trigger payment
        fireEvent.press(getByText('Pay R250.00'));

        // Extract onSuccess callback and call it
        const checkoutCall = popup.checkout.mock.calls[0][0];

        await act(async () => {
            checkoutCall.onSuccess({ reference: 'PAY_REF_123' });
        });

        await waitFor(() => {
            // Verify Order Creation
            expect(supabase.from).toHaveBeenCalledWith('orders');
            expect(supabase.from('orders').insert).toHaveBeenCalledWith(expect.objectContaining({
                customer_id: 'user_123',
                store_id: 'store_123',
                total_amount: 250,
                payment_ref: 'PAY_REF_123',
                status: 'pending'
            }));

            // Verify Order Items Creation
            expect(supabase.from).toHaveBeenCalledWith('order_items');
            expect(supabase.from('order_items').insert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ menu_item_id: 'item1', quantity: 2 }),
                expect.objectContaining({ menu_item_id: 'item2', quantity: 1 })
            ]));

            // Verify Cleanup & Navigation
            expect(mockClearCart).toHaveBeenCalled();
            expect(Alert.alert).toHaveBeenCalledWith("Order Confirmed!", expect.any(String), expect.any(Array));

            // Check alert button press triggers navigation
            const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
            alertButtons[0].onPress();
            expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)/orders');
        });
    });

    it('shows alert if address is missing', async () => {
        // Mock missing address
        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'user_addresses') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null }) // No address
                };
            }
            return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null }) };
        });

        const { getByText } = render(<CheckoutScreen />);

        await waitFor(() => expect(getByText('No address set')).toBeTruthy());

        const payBtn = getByText('Pay R250.00'); // Button might be disabled, let's check styles or if it fires
        // In our code, button is disabled if !address. 
        // Testing that logic:

        fireEvent.press(payBtn);
        // Should trigger alert if not disabled, or validation check inside initiatePayment

        expect(Alert.alert).toHaveBeenCalledWith('Address Required', expect.any(String));
    });
});
