import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { View, ActivityIndicator } from 'react-native';

export {
    ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
    const [session, setSession] = useState<Session | null>(null);
    const [userStatus, setUserStatus] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // 1. Initial Session Check with error handling
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("Session error:", error.message);
                // Clear invalid session data
                supabase.auth.signOut();
                setSession(null);
            } else {
                console.log("Creating Session:", session?.user?.email);
                setSession(session);
            }
            setInitialized(true);
        }).catch((err) => {
            console.error("Auth initialization error:", err);
            // Clear stale auth data on any error
            supabase.auth.signOut();
            setSession(null);
            setInitialized(true);
        });

        // 2. Listen for Auth Changes (Sign In, Sign Out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log("Auth Event:", _event);
            // Handle token refresh errors
            if (_event === 'TOKEN_REFRESHED' && !session) {
                supabase.auth.signOut();
            }
            setSession(session);
            if (!session) setUserStatus(null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!initialized) return;

        // Fetch User Status if logged in but unknown
        if (session && !userStatus) {
            supabase
                .from('profiles')
                .select('status')
                .eq('id', session.user.id)
                .single()
                .then(({ data }) => {
                    if (data) setUserStatus(data.status);
                    else setUserStatus('active'); // Fallback
                });
        }

        const inAuthGroup = segments[0] === 'auth';
        const inPending = segments[0] === 'pending_approval';

        if (session && userStatus) {
            if (userStatus === 'pending' || userStatus === 'rejected') {
                if (!inPending) router.replace('/pending_approval');
            } else if (inAuthGroup || inPending) {
                // Active user trying to access auth or pending pages
                router.replace('/(tabs)');
            }
        } else if (!session && !inAuthGroup) {
            // Not logged in, redirect to Auth
            router.replace('/auth');
        }
    }, [session, initialized, segments, userStatus]);

    if (!initialized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    return (
        <ThemeProvider value={DarkTheme}>
            <Slot />
        </ThemeProvider>
    );
}
