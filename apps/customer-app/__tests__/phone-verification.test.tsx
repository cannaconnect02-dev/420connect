
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PhoneVerificationScreen from '../app/phone-verification';
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('PhoneVerificationScreen', () => {
    const mockRouter = {
        replace: jest.fn(),
        push: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useLocalSearchParams as jest.Mock).mockReturnValue({ phoneNumber: '+27821234567', userId: 'test-user-id' });
    });

    it('renders correctly', async () => {
        // Mock updateUser for initial send
        (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

        const { getAllByText, getByText } = render(<PhoneVerificationScreen />);

        await waitFor(() => expect(getAllByText('Verify Phone').length).toBeGreaterThan(0));
        expect(getByText('+27 82 123 4567')).toBeTruthy();
    });

    it('validates OTP and navigates to address confirmation on success', async () => {
        // Mock Supabase responses
        (supabase.auth.verifyOtp as jest.Mock).mockResolvedValue({
            data: { session: {} },
            error: null
        });

        (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

        (supabase.from as jest.Mock).mockImplementation(() => ({
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ data: [{}], error: null }),
        }));

        (supabase.auth.refreshSession as jest.Mock).mockResolvedValue({ data: {}, error: null });

        const { getByTestId, getAllByText } = render(<PhoneVerificationScreen />);

        // Wait for render
        await waitFor(() => expect(getAllByText('Verify Phone').length).toBeGreaterThan(0));

        // Simulate entering OTP "123456"
        fireEvent.changeText(getByTestId('otp-input-0'), '1');
        fireEvent.changeText(getByTestId('otp-input-1'), '2');
        fireEvent.changeText(getByTestId('otp-input-2'), '3');
        fireEvent.changeText(getByTestId('otp-input-3'), '4');
        fireEvent.changeText(getByTestId('otp-input-4'), '5');
        fireEvent.changeText(getByTestId('otp-input-5'), '6');

        // Check if verifyOtp was called
        await waitFor(() => {
            expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
                phone: '+27821234567',
                token: '123456',
                type: 'phone_change'
            });
        });

        // The component shows an Alert on success. We need to trigger the alert button press.
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalled();
        });

        // Get the arguments of the last call to Alert.alert
        // Alert.alert(title, message, buttons)
        const alertCalls = (Alert.alert as jest.Mock).mock.calls;
        const lastCall = alertCalls[alertCalls.length - 1];
        expect(lastCall[0]).toBe('Success'); // Title

        const buttons = lastCall[2];
        const continueButton = buttons.find((b: any) => b.text === 'Continue');

        expect(continueButton).toBeTruthy();

        // Simulate pressing "Continue"
        continueButton.onPress();

        // Verify navigation
        expect(mockRouter.replace).toHaveBeenCalledWith('/address-confirmation');
    });
});
