import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../app/forgot-password';
import ResetPasswordScreen from '../app/reset-password';
import { supabase } from '../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

jest.spyOn(Alert, 'alert');

describe('Password Recovery Flow', () => {
    const mockPush = jest.fn();
    const mockReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockReplace, back: jest.fn() });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ForgotPasswordScreen', () => {
        it('renders correctly', () => {
            const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);
            expect(getByText('Forgot Password?')).toBeTruthy();
            expect(getByPlaceholderText('name@example.com')).toBeTruthy();
        });

        it('sends reset email and navigates to OTP', async () => {
            (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });

            const { getByText, getByPlaceholderText } = render(<ForgotPasswordScreen />);

            fireEvent.changeText(getByPlaceholderText('name@example.com'), 'test@example.com');
            fireEvent.press(getByText('Send Reset Code'));

            await waitFor(() => {
                expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
                expect(mockPush).toHaveBeenCalledWith({
                    pathname: '/otp-verification',
                    params: { email: 'test@example.com', type: 'recovery' }
                });
            });
        });
    });

    describe('ResetPasswordScreen', () => {
        it('renders correctly', () => {
            const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
            expect(getByText('Reset Password')).toBeTruthy();
            expect(getByPlaceholderText('Min 6 characters')).toBeTruthy();
        });

        it('updates password successfully', async () => {
            (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });

            const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);

            fireEvent.changeText(getByPlaceholderText('Min 6 characters'), 'newpassword123');
            fireEvent.changeText(getByPlaceholderText('Re-enter password'), 'newpassword123');

            fireEvent.press(getByText('Update Password'));

            await waitFor(() => {
                expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
            });
        });

        it('shows error if passwords do not match', async () => {
            const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);

            fireEvent.changeText(getByPlaceholderText('Min 6 characters'), 'pass1');
            fireEvent.changeText(getByPlaceholderText('Re-enter password'), 'pass2');

            fireEvent.press(getByText('Update Password'));

            expect(supabase.auth.updateUser).not.toHaveBeenCalled();
            expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match.');
        });
    });
});
