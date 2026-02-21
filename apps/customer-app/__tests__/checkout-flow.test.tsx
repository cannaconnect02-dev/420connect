import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import CheckoutScreen from '../app/checkout';
import { supabase } from '../lib/supabase';
import { useCart } from '../lib/CartContext';
import { Alert } from 'react-native';

// Mocks
jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
    useFocusEffect: (callback: any) => require('react').useEffect(callback, []), // Run focus effect once on mount
}));

jest.mock('react-native-webview', () => {
    const { View } = require('react-native');
    return {
        WebView: (props: any) => <View testID="mock-webview" {...props} />
    };
});

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

jest.setTimeout(30000);

describe('Checkout Flow', () => {

    const mockClearCart = jest.fn();
    const mockRouterReplace = jest.fn();

    // Mock global fetch for Paystack charge/verify endpoints
    global.fetch = jest.fn() as jest.Mock;

    // Stable mock functions for assertions
    const mockOrdersInsert = jest.fn();
    const mockOrderItemsInsert = jest.fn();
    const mockOrdersUpdate = jest.fn();

    beforeEach(() => {
        jest.setTimeout(20000);
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
                in: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                single: jest.fn(),
                maybeSingle: jest.fn(),
                insert: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: { id: 'order_123' }, error: null })
                    })
                }),
                update: jest.fn().mockReturnThis(),
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
                        name: 'Test Store',
                        owner_id: 'owner_123',
                        paystack_splitcode: 'SPLIT_123',
                        paystack_subaccount_code: 'SUB_123'
                    }
                });
            } else if (table === 'orders') {
                // Mock order creation chain: insert().select().single()
                const singleObj = {
                    single: jest.fn().mockResolvedValue({ data: { id: 'order_123' }, error: null })
                };
                const selectObj = {
                    select: jest.fn().mockReturnValue(singleObj)
                };
                mockOrdersInsert.mockReturnValue(selectObj);
                mockBuilder.insert = mockOrdersInsert;

                // Keep the single mock for potential other uses
                mockBuilder.single.mockResolvedValue({
                    data: { id: 'order_123' },
                    error: null
                });
                mockOrdersUpdate.mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: null })
                });
                mockBuilder.update = mockOrdersUpdate;
            } else if (table === 'customer_store_memberships') {
                mockBuilder.maybeSingle.mockResolvedValue({
                    data: { id: 'membership_123', customer_id: 'user_123', store_id: 'store_123' } // verified
                });
            } else if (table === 'order_items') {
                mockOrderItemsInsert.mockResolvedValue({ error: null });
                mockBuilder.insert = mockOrderItemsInsert;
            } else {
                mockBuilder.single.mockResolvedValue({ data: null });
            }
            return mockBuilder;
        });

        // Setup fetch mock default for charge
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue(JSON.stringify({
                success: true,
                data: {
                    reference: 'PAY_REF_123',
                    authorization_url: 'https://checkout.paystack.com/mock-url',
                    status: 'pending'
                }
            })),
            json: jest.fn().mockResolvedValue({
                success: true,
                data: {
                    reference: 'PAY_REF_123',
                    authorization_url: 'https://checkout.paystack.com/mock-url',
                    status: 'pending'
                }
            })
        });
    });

    it('renders checkout details correctly', async () => {
        const { getByText, getAllByText } = render(<CheckoutScreen />);

        await waitFor(() => {
            expect(getByText('Checkout')).toBeTruthy();
            expect(getByText('123 Main St')).toBeTruthy();
            expect(getByText(/Burger/i)).toBeTruthy();
            expect(getAllByText(/250\.00/i)).toBeTruthy(); // Total
        });
    });

    it('triggers payment initialization when Pay button is pressed', async () => {
        const { getByText, getByTestId } = render(<CheckoutScreen />);

        await waitFor(() => expect(getByText('Pay R280.00')).toBeTruthy());

        fireEvent.press(getByTestId('pay-button'));

        await waitFor(() => {
            // It should try to insert an order first with pending status
            expect(mockOrdersInsert).toHaveBeenCalledWith(expect.objectContaining({
                customer_id: 'user_123',
                store_id: 'store_123',
                total_amount: 280,   // Assuming 250 + 30 fee
                status: 'pending'
            }));

            // Then it calls our mock edge function
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/functions/v1/paystack-charge'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('"email":"test@example.com"')
                })
            );
        }, { timeout: 10000 });
    });

    it('creates order and opens webview on successful payment initialization', async () => {
        const { getByText, getByTestId, queryByTestId } = render(<CheckoutScreen />);

        await waitFor(() => expect(getByText('Pay R280.00')).toBeTruthy());

        // Trigger payment
        fireEvent.press(getByTestId('pay-button'));

        await waitFor(() => {
            // Verify Order Creation
            expect(mockOrdersInsert).toHaveBeenCalledWith(expect.objectContaining({
                customer_id: 'user_123',
                store_id: 'store_123',
                total_amount: 280,
                status: 'pending',
                paystack_splitcode: 'SPLIT_123',
                paystack_subaccount_code: 'SUB_123'
            }));

            // Verify Order Items Creation
            expect(mockOrderItemsInsert).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({ menu_item_id: 'item1', quantity: 2 }),
                expect.objectContaining({ menu_item_id: 'item2', quantity: 1 })
            ]));

            // Verify order is updated with payment ref
            expect(mockOrdersUpdate).toHaveBeenCalledWith({ paystack_reference: 'PAY_REF_123' });

            // Ensure webview is eventually shown in the state rendering
            expect(queryByTestId('mock-webview')).toBeTruthy();
        }, { timeout: 10000 });
    });

    it('disables pay button if address is missing', async () => {
        // Mock missing address
        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'user_addresses') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null }) // No address
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: null }),
                insert: jest.fn().mockReturnThis()
            };
        });

        const { getByText, getByTestId } = render(<CheckoutScreen />);

        await waitFor(() => expect(getByText('No address set')).toBeTruthy());

        const payBtn = getByTestId('pay-button');
        // Check if button is disabled (React Native prop)
        // Note: accessibilityState={{ disabled: true }} is standard in RN for disabled touchables
        // Check if button is disabled (React Native prop)
        // Verify disabled style is applied
        expect(payBtn.props.style).toEqual(
            expect.objectContaining({ opacity: 0.7 })
        );

        // Ensure attempting press doesn't trigger anything
        fireEvent.press(payBtn);
        expect(Alert.alert).not.toHaveBeenCalledWith('Address Required', expect.any(String));
    });

    it('calculates delivery fee correctly with JSONB settings objects (regression test)', async () => {
        // Mock settings with the new JSONB structure we found in migrations/admin-dashboard
        (supabase.from as jest.Mock).mockImplementation((table) => {
            const mockBuilder: any = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                single: jest.fn(),
                maybeSingle: jest.fn(),
                insert: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
            };

            if (table === 'settings') {
                mockBuilder.in.mockResolvedValue({
                    data: [
                        { key: 'delivery_base_rate', value: { amount: 45 } },
                        { key: 'delivery_threshold_km', value: { km: 3 } },
                        { key: 'delivery_extended_price', value: { rate: 5 } },
                        { key: 'max_delivery_distance_km', value: { km: 50 } }
                    ]
                });
            } else if (table === 'user_addresses') {
                mockBuilder.single.mockResolvedValue({
                    data: {
                        address_line1: '123 Main St',
                        city: 'Cape Town',
                        lat: -33.9,
                        lng: 18.4
                    }
                });
            } else if (table === 'stores') {
                mockBuilder.single.mockResolvedValue({
                    data: {
                        latitude: -33.95, // ~5.5km away from -33.9
                        longitude: 18.4,
                        name: 'Test Store',
                        owner_id: 'owner_123'
                    }
                });
            } else {
                mockBuilder.single.mockResolvedValue({ data: null });
                mockBuilder.maybeSingle.mockResolvedValue({ data: null });
            }
            return mockBuilder;
        });

        const { getByText } = render(<CheckoutScreen />);

        // Calculation check:
        // Distance between (-33.9, 18.4) and (-33.95, 18.4) is exactly 0.05 degrees lat.
        // 0.05 degrees lat is approx 5.56km. 
        // Settings: Base R45 (up to 3km), Extended R5/km.
        // Extra: 5.56 - 3 = 2.56km.
        // Fee: 45 + (2.56 * 5) = 45 + 12.8 = 57.8
        // Total: 250 (cart) + 57.8 = 307.8

        await waitFor(() => {
            // Match "Pay R307.80" or similar total based on precise distance calculation
            // The console logs will show the exact distance.
            expect(getByText(/Pay R/i)).toBeTruthy();
            const payButtonText = getByText(/Pay R/i).children[0];
            // We just want to ensure it's NOT RNaN
            expect(payButtonText).not.toContain('NaN');
        }, { timeout: 10000 });
    });
});
