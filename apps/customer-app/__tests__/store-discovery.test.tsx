import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import HomeScreen from '../app/(tabs)/index';
import { supabase } from '../lib/supabase';
import { useBasePath } from 'expo-router';

// Mocks
jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            in: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        })),
    }
}));

jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('expo-linear-gradient', () => ({
    LinearGradient: ({ children }: any) => children,
}));

jest.mock('../lib/utils', () => ({
    getDistanceFromLatLonInKm: jest.fn((lat1, lon1, lat2, lon2) => {
        // Mock distance calculation: 
        if (lat2 === -33.8) return 10; // Nearby
        if (lat2 === -33.5) return 40; // Far
        return 5;
    })
}));

jest.mock('../lib/CartContext', () => ({
    useCart: () => ({
        items: [],
        addToCart: jest.fn(),
        removeFromCart: jest.fn(),
        incrementQuantity: jest.fn(),
        decrementQuantity: jest.fn(),
        clearCart: jest.fn(),
        total: 0,
        storeId: null,
    }),
}));

describe('Store Discovery (Geo-Query)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('filters stores based on 35km radius', async () => {
        // 1. Mock User & Address
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });

        (supabase.from as jest.Mock).mockImplementation((table) => {
            if (table === 'user_addresses') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({
                        data: { lat: -33.9, lng: 18.4 }
                    }),
                };
            }
            if (table === 'stores') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    // Return 2 stores: one near (10km), one far (40km)
                    // limit is not called here, checking logic flow
                    then: jest.fn((cb) => cb({
                        data: [
                            { id: 'store1', name: 'Nearby Store', latitude: -33.8, longitude: 18.4, is_verified: true, is_open: true },
                            { id: 'store2', name: 'Far Store', latitude: -33.5, longitude: 18.4, is_verified: true, is_open: true }
                        ]
                    }))
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnValue({ data: [] }),
            };
        });

        // 2. Render Home Screen
        const { getByText, queryByText } = render(<HomeScreen />);

        // 3. Verify Filtering
        await waitFor(() => {
            // "Nearby Store" should be visible (10km < 35km)
            expect(getByText('Nearby Store')).toBeTruthy();
            expect(getByText('10.0 km')).toBeTruthy();
        });

        // "Far Store" should NOT be visible (40km > 35km)
        expect(queryByText('Far Store')).toBeNull();
    });
});
