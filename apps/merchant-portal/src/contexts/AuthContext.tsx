import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/error-handler';

type AppRole = 'customer' | 'driver' | 'store_admin' | 'store_staff' | 'admin' | 'merchant';

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
    applicationStatus: 'pending' | 'approved' | 'rejected' | null;
    isLoading: boolean;
    signUp: (email: string, password: string, fullName: string, role?: AppRole, dateOfBirth?: string) => Promise<{ error: Error | null }>;
    createMerchant: (username: string, password: string, metadata: any) => Promise<{ error: Error | null }>;
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
    const [applicationStatus, setApplicationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
    const { toast } = useToast();

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
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

    const fetchApplicationStatus = async (userId: string) => {
        const { data, error } = await supabase
            .from('role_requests')
            .select('status')
            .eq('user_id', userId)
            .eq('role', 'store_admin')
            .order('requested_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            logError('Fetch app status', error);
        }
        return data?.status as 'pending' | 'approved' | 'rejected' | null;
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
                        const [userProfile, userRoles, appStatus] = await Promise.all([
                            fetchProfile(currentSession.user.id),
                            fetchRoles(currentSession.user.id),
                            fetchApplicationStatus(currentSession.user.id)
                        ]);
                        setProfile(userProfile);
                        setRoles(userRoles);
                        setApplicationStatus(appStatus);
                        setIsLoading(false);
                    }, 0);
                } else {
                    setProfile(null);
                    setRoles([]);
                    setApplicationStatus(null);
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
                    .eq('id', data.user.id);

                if (profileError) {
                    logError('Update profile DOB', profileError);
                }
            }

            // If it was a merchant signup, we know the status is pending because of the trigger
            if (role === 'store_admin' || role === 'merchant') {
                setApplicationStatus('pending');
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

    const createMerchant = async (username: string, password: string, metadata: any) => {
        try {
            // Construct dummy email
            const email = username.includes('@') ? username : `${username}@temp.420connect.local`;

            const { data, error } = await supabase.functions.invoke('create-merchant', {
                body: {
                    email,
                    password,
                    metadata: {
                        ...metadata,
                        email_confirm: true // redundant but good for clarity
                    }
                }
            });

            if (error) throw new Error(error.message || 'Failed to create merchant');
            if (data?.error) throw new Error(data.error);

            // Auto sign-in after creation (since email is confirmed)
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) throw signInError;

            // Update application status
            setApplicationStatus('pending');

            toast({
                title: "Account created!",
                description: "Your merchant account is under review.",
            });

            return { error: null };
        } catch (error: any) {
            logError('Create merchant', error);
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
            // Always refresh status after request
            const status = await fetchApplicationStatus(user!.id);
            setApplicationStatus(status);

            if (responseData?.status === 'approved') {
                const userRoles = await fetchRoles(user!.id);
                setRoles(userRoles);
                return { success: true, status: 'approved' };
            } else if (responseData?.status === 'already_assigned') {
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
        setApplicationStatus(null);
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
            applicationStatus,
            isLoading,
            signUp,
            createMerchant,
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
