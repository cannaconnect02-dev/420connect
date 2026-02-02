import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/error-handler';

type AppRole = 'customer' | 'driver' | 'store_admin' | 'store_staff' | 'admin';

interface UserProfile {
    id: string;
    user_id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    phone_number: string | null;
    phone_verified: boolean;
    email_verified: boolean;
    avatar_url: string | null;
    date_of_birth: string | null;
}

interface RoleRequestResult {
    success: boolean;
    status: 'approved' | 'pending' | 'already_assigned' | 'error';
    error?: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    roles: AppRole[];
    isLoading: boolean;
    signUp: (email: string, password: string, fullName: string, role?: AppRole, dateOfBirth?: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    hasRole: (role: AppRole) => boolean;
    requestRole: (role: AppRole) => Promise<RoleRequestResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [roles, setRoles] = useState<AppRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            logError('Fetch profile', error);
            return null;
        }
        return data as UserProfile | null;
    };

    const fetchRoles = async (userId: string) => {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId);

        if (error) {
            logError('Fetch roles', error);
            return [];
        }
        return data.map(r => r.role as AppRole);
    };

    useEffect(() => {
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, currentSession) => {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    // Use setTimeout to avoid potential race conditions
                    setTimeout(async () => {
                        const [userProfile, userRoles] = await Promise.all([
                            fetchProfile(currentSession.user.id),
                            fetchRoles(currentSession.user.id)
                        ]);
                        setProfile(userProfile);
                        setRoles(userRoles);
                        setIsLoading(false);
                    }, 0);
                } else {
                    setProfile(null);
                    setRoles([]);
                    setIsLoading(false);
                }
            }
        );

        // THEN check for existing session
        supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
            if (!existingSession) {
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, fullName: string, role?: AppRole, dateOfBirth?: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                        full_name: fullName,
                        pending_role: role && role !== 'customer' ? role : undefined,
                        date_of_birth: dateOfBirth,
                    }
                }
            });

            if (error) throw error;

            // If signup succeeded and we have a user, update the profile with date_of_birth
            if (data.user && dateOfBirth) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ date_of_birth: dateOfBirth })
                    .eq('user_id', data.user.id);

                if (profileError) {
                    logError('Update profile DOB', profileError);
                }
            }

            // Store the pending role request for processing after login
            if (role && role !== 'customer') {
                localStorage.setItem('pending_role_request', role);
            }

            toast({
                title: "Account created!",
                description: role && role !== 'customer'
                    ? "Please sign in to complete your store setup."
                    : "Welcome to 420Connect.",
            });

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const requestRole = async (role: AppRole): Promise<RoleRequestResult> => {
        if (!session) {
            return { success: false, status: 'error', error: 'Not authenticated' };
        }

        try {
            const response = await supabase.functions.invoke('request-role', {
                body: { role }
            });

            if (response.error) {
                logError('Request role', response.error);
                return { success: false, status: 'error', error: response.error.message };
            }

            const responseData = response.data;
            if (responseData?.status === 'approved') {
                // Refresh roles
                const userRoles = await fetchRoles(user!.id);
                setRoles(userRoles);
                return { success: true, status: 'approved' };
            } else if (responseData?.status === 'already_assigned') {
                // Refresh roles to ensure we have latest
                const userRoles = await fetchRoles(user!.id);
                setRoles(userRoles);
                return { success: true, status: 'already_assigned' };
            } else if (responseData?.status === 'pending') {
                return { success: true, status: 'pending' };
            }

            return { success: false, status: 'error', error: 'Unexpected response' };
        } catch (error) {
            logError('Role function', error);
            return { success: false, status: 'error', error: 'Failed to request role' };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            toast({
                title: "Welcome back!",
                description: "You've successfully signed in.",
            });

            return { error: null };
        } catch (error) {
            return { error: error as Error };
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        setRoles([]);
        toast({
            title: "Signed out",
            description: "You've been signed out successfully.",
        });
    };

    const hasRole = (role: AppRole) => roles.includes(role);

    return (
        <AuthContext.Provider value={{
            user,
            session,
            profile,
            roles,
            isLoading,
            signUp,
            signIn,
            signOut,
            hasRole,
            requestRole,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
