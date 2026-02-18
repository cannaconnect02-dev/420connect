import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AuthScreen from '../app/auth';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

// Helper to update text inputs
const fillInput = (getByPlaceholder: any, placeholder: string, value: string) => {
    fireEvent.changeText(getByPlaceholder(placeholder), value);
};

describe('AuthScreen', () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders login screen by default', () => {
        const { getByText, getByPlaceholderText } = render(<AuthScreen />);
        expect(getByText('Welcome Back')).toBeTruthy();
        expect(getByText('Sign In')).toBeTruthy();
        expect(getByPlaceholderText('name@example.com')).toBeTruthy();
        expect(getByPlaceholderText('••••••••')).toBeTruthy();
    });

    it('toggles to signup screen', () => {
        const { getByText, getAllByText } = render(<AuthScreen />);

        // The text is split across nested Text elements, so we look for "Sign Up" which is always rendered
        const signUpLinks = getAllByText('Sign Up');
        // Press the one that's part of the toggle (the second one)
        fireEvent.press(signUpLinks[signUpLinks.length - 1]);

        expect(getByText('Create Account')).toBeTruthy();
        expect(getByText('First Name')).toBeTruthy();
        expect(getByText('Surname')).toBeTruthy();
    });

    it('validates signup form fields', async () => {
        const { getByText, getAllByText } = render(<AuthScreen />);

        // Switch to signup
        const signUpLinks = getAllByText('Sign Up');
        fireEvent.press(signUpLinks[signUpLinks.length - 1]);

        // Press Sign Up button without filling anything
        const signUpButton = getAllByText('Sign Up')[0];
        fireEvent.press(signUpButton);

        // Supabase sign up should NOT be called
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('performs login and handles error', async () => {
        (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
            error: { message: 'Invalid login' }
        });

        const { getByText, getByPlaceholderText } = render(<AuthScreen />);

        fillInput(getByPlaceholderText, 'name@example.com', 'test@example.com');
        fillInput(getByPlaceholderText, '••••••••', 'wrongpass');

        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'wrongpass',
            });
        });
    });
});
