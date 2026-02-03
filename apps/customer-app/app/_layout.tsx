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
        const { data } = await supabase
            .from('profiles')
            .select('address_confirmed')
            .eq('id', userId)
            .single();

        setAddressConfirmed(data?.address_confirmed ?? false);
    }

    useEffect(() => {
        if (!initialized) return;

        const inAuthGroup = segments[0] === 'auth';
        const inAddressConfirmation = segments[0] === 'address-confirmation';

        if (!session && !inAuthGroup) {
            // Redirect to Login if not authenticated
            router.replace('/auth');
        } else if (session && inAuthGroup) {
            // After login, check if address is confirmed
            if (addressConfirmed === false) {
                router.replace('/address-confirmation');
            } else if (addressConfirmed === true) {
                router.replace('/(tabs)/');
            }
            // If addressConfirmed is null, still loading
        } else if (session && !inAuthGroup && !inAddressConfirmation && addressConfirmed === false) {
            // Redirect to address confirmation if not confirmed
            router.replace('/address-confirmation');
        }
    }, [session, segments, initialized, addressConfirmed]);

    return (
        <ThemeProvider value={DarkTheme}>
            <CartProvider>
                <Slot />
            </CartProvider>
        </ThemeProvider>
    );
}
