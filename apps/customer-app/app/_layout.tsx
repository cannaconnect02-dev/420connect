// ActionSheetProvider removed
import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, Slot, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export {
    ErrorBoundary,
} from 'expo-router';

import { CartProvider } from '../lib/CartContext';
import { PaystackProvider } from 'react-native-paystack-webview';

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [addressConfirmed, setAddressConfirmed] = useState<boolean | null>(null);
    const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const segments = useSegments();
    const router = useRouter();
    const colorScheme = useColorScheme();

    useEffect(() => {
        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setInitialized(true);

            // Detect password recovery flow
            if (event === 'PASSWORD_RECOVERY') {
                console.log('NAV: PASSWORD_RECOVERY event detected');
                setIsPasswordRecovery(true);
                router.replace('/reset-password');
                return;
            }

            // Check profile status
            if (session?.user) {
                checkProfileStatus(session.user.id);
            } else {
                setAddressConfirmed(null);
                setPhoneVerified(null);
                setIsPasswordRecovery(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function checkProfileStatus(userId: string) {
        setIsChecking(true);
        try {
            console.log('Checking profile status for:', userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('address_confirmed, phone_verified')
                .eq('id', userId)
                .single();

            if (error) {
                console.log('Error fetching profile:', error);
                throw error;
            }

            console.log('Profile status:', data);
            setAddressConfirmed(data?.address_confirmed ?? false);
            setPhoneVerified(data?.phone_verified ?? false);
        } catch (error) {
            console.log('Error checking profile status:', error);
            setAddressConfirmed(false);
            setPhoneVerified(false);
        } finally {
            setIsChecking(false);
        }
    }

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === 'auth';
        const inOtpVerification = segments[0] === 'otp-verification';
        const inPhoneEntry = segments[0] === 'phone-entry';
        const inPhoneVerification = segments[0] === 'phone-verification';
        const inAddressConfirmation = segments[0] === 'address-confirmation';
        const inForgotPassword = segments[0] === 'forgot-password';
        const inResetPassword = segments[0] === 'reset-password';

        // Public routes that don't require auth
        const isPublicRoute = inAuthGroup || inOtpVerification || inForgotPassword || inResetPassword;
        // Onboarding routes where we shouldn't redirect away from
        const isOnboardingRoute = inPhoneEntry || inPhoneVerification || inAddressConfirmation;

        console.log('NAV STATE:', {
            segments,
            sessionUser: session?.user?.id,
            isPublicRoute,
            phoneVerified,
            addressConfirmed,
            isChecking,
            isPasswordRecovery
        });

        // Don't redirect if user is in password recovery flow
        if (isPasswordRecovery && inResetPassword) {
            console.log('NAV: In password recovery - staying on reset-password');
            return;
        }

        if (!session && !isPublicRoute) {
            // Redirect to Login if not authenticated
            console.log('NAV: Redirecting to Auth (No Session)');
            router.replace('/auth');
        } else if (session) {
            // Authenticated user logic
            if (isChecking) {
                console.log('NAV: Waiting for profile check...');
                return;
            }

            // Skip onboarding checks if in password recovery mode
            if (isPasswordRecovery) {
                console.log('NAV: Password recovery mode - skipping onboarding checks');
                return;
            }

            // 1. Phone Verification Check
            // Also skip redirect if already on address-confirmation to prevent race condition
            // when profile data is stale but user has already progressed to next step
            if (phoneVerified === false) {
                if (!inPhoneEntry && !inPhoneVerification && !inOtpVerification && !inAddressConfirmation) {
                    console.log('NAV: Redirecting to Phone Entry');
                    router.replace('/phone-entry');
                }
            }
            // 2. Address Confirmation Check
            else if (phoneVerified === true && addressConfirmed === false) {
                if (!inAddressConfirmation) {
                    console.log('NAV: Phone Verified - Redirecting to Address Confirmation');
                    router.replace('/address-confirmation');
                }
            }
            // 3. All Verified - Send to Main App
            else if (phoneVerified === true && addressConfirmed === true && (isPublicRoute || isOnboardingRoute)) {
                console.log('NAV: All Verified - Redirecting to Main Tabs');
                router.replace('/(tabs)/');
            }
        }
    }, [session, segments, initialized, addressConfirmed, phoneVerified, isChecking, isPasswordRecovery]);

    return (
        <ThemeProvider value={DarkTheme}>
            <PaystackProvider publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder'} currency="ZAR">
                <CartProvider>
                    <Slot />
                </CartProvider>
            </PaystackProvider>
        </ThemeProvider>
    );
}
