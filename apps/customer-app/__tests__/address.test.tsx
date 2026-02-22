import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AddressConfirmationScreen from '../app/address-confirmation';
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';

describe('AddressConfirmationScreen', () => {
    const mockReplace = jest.fn();
    const mockBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace, back: mockBack, canGoBack: jest.fn(() => true) });
    (useLocalSearchParams as jest.Mock).mockReturnValue({});

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
        process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'mocked-key';
        jest.clearAllMocks();
        // Mock authenticated user
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user123' } } });

        // Mock Supabase from() to return proper chainable object
        (supabase.from as jest.Mock).mockImplementation(() => ({
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockResolvedValue({ error: null }),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { address_confirmed: false }, error: null }),
            limit: jest.fn().mockReturnThis(),
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('renders input fields correctly', async () => {
        const { getByText, getByPlaceholderText } = render(<AddressConfirmationScreen />);

        await waitFor(() => {
            expect(getByText('Confirm Your Address')).toBeTruthy();
        });

        // Updated to match actual placeholders in the UI
        expect(getByPlaceholderText('Start typing address...')).toBeTruthy();
        expect(getByPlaceholderText('City')).toBeTruthy();
    });

    it('validates required fields before submission', async () => {
        const { getByText } = render(<AddressConfirmationScreen />);

        await waitFor(() => {
            expect(getByText('Confirm Address')).toBeTruthy();
        });

        // Press confirm without filling anything
        fireEvent.press(getByText('Confirm Address'));

        // Should not navigate since validation fails
        expect(mockReplace).not.toHaveBeenCalled();
    });
});
