import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Auth from './Auth';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Loader: () => <div data-testid="loader" />,
    CheckCircle: () => <div data-testid="check-circle" />,
    Upload: () => <div data-testid="upload" />,
    Eye: () => <div data-testid="eye" />,
    EyeOff: () => <div data-testid="eye-off" />,
    Store: () => <div data-testid="store" />,
    MapPin: () => <div data-testid="map-pin" />,
    FileText: () => <div data-testid="file-text" />,
    Calendar: () => <div data-testid="calendar" />,
    User: () => <div data-testid="user" />
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        }
    }
}));

describe('Auth Page (Merchant Portal)', () => {
    it('renders the login view by default', () => {
        render(
            <AuthProvider>
                <Auth />
            </AuthProvider>
        );
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
        expect(screen.getByText(/Apply now/i)).toBeInTheDocument();
    });

    it('toggles to partner application mode', () => {
        render(
            <AuthProvider>
                <Auth />
            </AuthProvider>
        );

        const applyBtn = screen.getByText(/Apply now/i);
        fireEvent.click(applyBtn);

        expect(screen.getByText('Partner Application')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Store Name')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Application/i })).toBeInTheDocument();
        expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
    });
});
