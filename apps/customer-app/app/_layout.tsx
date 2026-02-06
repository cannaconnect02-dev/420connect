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

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [initialized, setInitialized] = useState(false);
    const [addressConfirmed, setAddressConfirmed] = useState<boolean | null>(null);
    const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const segments = useSegments();
    const router = useRouter();
    const colorScheme = useColorScheme();

    useEffect(() => {
        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setInitialized(true);

            // Check profile status
            if (session?.user) {
                checkProfileStatus(session.user.id);
            } else {
                setAddressConfirmed(null);
                setPhoneVerified(null);
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
            isChecking
        });

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

            // 1. Phone Verification Check
            if (phoneVerified === false) {
                if (!inPhoneEntry && !inPhoneVerification && !inOtpVerification) {
                    console.log('NAV: Redirecting to Phone Entry');
                    router.replace('/phone-entry');
                }
            }
            // 2. Phone Verified - Send to Main App (address confirmation step removed)
            else if (inAuthGroup || isOnboardingRoute) {
                console.log('NAV: Phone Verified - Redirecting to Main Tabs');
                router.replace('/(tabs)/');
            }
        }
    }, [session, segments, initialized, addressConfirmed, phoneVerified, isChecking]);

    return (
        <ThemeProvider value={DarkTheme}>
            <CartProvider>
                <Slot />
            </CartProvider>
        </ThemeProvider>
    );
}
