
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthScreen from '../app/auth';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

// Mock Dependencies
jest.mock('expo-router', () => ({
    useRouter: jest.fn(),
    Stack: { Screen: jest.fn(() => null) },
}));

jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            resend: jest.fn(),
        },
    },
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => {
    const React = require('react');
    const { Button } = require('react-native');

    // A mock component that renders a button we can press to simulate checking a date
    const MockDateTimePicker = ({ onChange, value }: any) => {
        return (
            <Button
                testID="mock-date-picker"
                title="Pick Date"
                onPress={() => {
                    // Return a date 20 years ago
                    const validDate = new Date();
                    validDate.setFullYear(validDate.getFullYear() - 20);
                    onChange({ type: 'set' }, validDate);
                }}
            />
        );
    };
    return MockDateTimePicker;
});

jest.spyOn(Alert, 'alert');

describe('AuthScreen - Signup Flow', () => {
    const mockRouter = {
        push: jest.fn(),
        replace: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });

    const switchToSignup = (getByText: any) => {
        // Use regex to match partial text because the text is split across nested Text components
        const toggleButton = getByText(/Don't have an account/i);
        fireEvent.press(toggleButton);
    };

    it('renders signup form correctly', () => {
        const { getByText, getByPlaceholderText } = render(<AuthScreen />);

        // Starts in Login mode
        expect(getByText('Sign In')).toBeTruthy();

        // Switch to Signup
        switchToSignup(getByText);

        expect(getByText('Create Account')).toBeTruthy();
        expect(getByPlaceholderText('John')).toBeTruthy(); // First Name
        expect(getByPlaceholderText('Doe')).toBeTruthy(); // Surname
        expect(getByText('Sign Up')).toBeTruthy();
    });

    it('validates required fields', async () => {
        const { getByText } = render(<AuthScreen />);
        switchToSignup(getByText);

        const signUpButton = getByText('Sign Up');
        fireEvent.press(signUpButton);

        await waitFor(() => {
            // Expect Alert for missing fields
            expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your first name and surname.');
        });
    });

    it('validates age (must be 18+)', async () => {
        const { getByText, getByPlaceholderText } = render(<AuthScreen />);
        switchToSignup(getByText);

        // Fill Name
        fireEvent.changeText(getByPlaceholderText('John'), 'Test');
        fireEvent.changeText(getByPlaceholderText('Doe'), 'User');

        // We trigger the validation failure for DOB if not set
        fireEvent.press(getByText('Sign Up'));
        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please select your date of birth.');
        });
    });

    it('successfully signs up and navigates to OTP verification', async () => {
        const { getByText, getByPlaceholderText, getByTestId } = render(<AuthScreen />);
        switchToSignup(getByText);

        // Mock success response
        (supabase.auth.signUp as jest.Mock).mockResolvedValue({
            data: { user: { id: 'new-user-123' } },
            error: null
        });

        // 1. Fill Text Fields
        fireEvent.changeText(getByPlaceholderText('John'), 'Stubbe');
        fireEvent.changeText(getByPlaceholderText('Doe'), 'Uber');
        fireEvent.changeText(getByPlaceholderText('name@example.com'), 'stubbe.test@gmail.com');
        fireEvent.changeText(getByPlaceholderText('••••••••'), 'Password123!');

        // 2. Select Date (Birth Date > 18 years ago)
        // Set state to show picker logic
        fireEvent.press(getByText('Select your birth date'));

        // Find our mock picker button and press it to select a valid date
        const pickerButton = getByTestId('mock-date-picker');
        fireEvent.press(pickerButton);

        // 3. Submit
        fireEvent.press(getByText('Sign Up'));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: 'stubbe.test@gmail.com',
                password: 'Password123!',
                options: {
                    data: {
                        role: 'customer',
                        first_name: 'Stubbe',
                        surname: 'Uber',
                        preferred_name: 'Stubbe', // fallback to First Name logic
                        dob: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
                    }
                }
            });

            expect(mockRouter.push).toHaveBeenCalledWith({
                pathname: '/otp-verification',
                params: { email: 'stubbe.test@gmail.com', userId: 'new-user-123' }
            });
        });
    });
});
