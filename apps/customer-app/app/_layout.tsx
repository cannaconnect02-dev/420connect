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
    const [isChecking, setIsChecking] = useState(false);
    const segments = useSegments();
    const router = useRouter();
    const colorScheme = useColorScheme();

    useEffect(() => {
        // Listen for Auth Changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setInitialized(true);

            // Check address confirmation status
            if (session?.user) {
                checkAddressConfirmation(session.user.id);
            } else {
                setAddressConfirmed(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function checkAddressConfirmation(userId: string) {
        setIsChecking(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('address_confirmed')
                .eq('id', userId)
                .single();

            setAddressConfirmed(data?.address_confirmed ?? false);
        } catch (error) {
            console.log('Error checking address confirmation:', error);
            setAddressConfirmed(false);
        } finally {
            setIsChecking(false);
        }
    }

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === 'auth';
        const inOtpVerification = segments[0] === 'otp-verification';
        const inAddressConfirmation = segments[0] === 'address-confirmation';
        const inForgotPassword = segments[0] === 'forgot-password';
        const inResetPassword = segments[0] === 'reset-password';

        if (!session && !inAuthGroup && !inOtpVerification && !inForgotPassword && !inResetPassword) {
            // Redirect to Login if not authenticated
            router.replace('/auth');
        } else if (session && inAuthGroup) {
            // After login, check if address is confirmed
            if (!isChecking) {
                if (addressConfirmed === false) {
                    router.replace('/address-confirmation');
                } else if (addressConfirmed === true) {
                    router.replace('/(tabs)/');
                }
            }
            // If addressConfirmed is null, still loading
        } else if (session && !inAuthGroup && !inAddressConfirmation && !inResetPassword && addressConfirmed === false && !isChecking) {
            // Redirect to address confirmation if not confirmed
            router.replace('/address-confirmation');
        }
    }, [session, segments, initialized, addressConfirmed, isChecking]);

    return (
        <ThemeProvider value={DarkTheme}>
            <CartProvider>
                <Slot />
            </CartProvider>
        </ThemeProvider>
    );
}
