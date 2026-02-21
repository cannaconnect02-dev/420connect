import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../Auth';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Lock: () => <div data-testid="lock" />,
}));

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

// Create generic query chain mock
const createMockChain = (returnData: any = null) => {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: returnData, error: null }))
    };
    return chain;
};

// Mock Supabase Auth
let mockSignInWithPassword = vi.fn();
let mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
let mockOnAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
let mockFrom = vi.fn((table: string) => {
    if (table === 'profiles') {
        return createMockChain({ role: 'admin' });
    }
    return createMockChain();
});

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
            getSession: () => mockGetSession(),
            onAuthStateChange: () => mockOnAuthStateChange()
        },
        from: (table: string) => mockFrom(table)
    }
}));

describe('Admin Auth Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSession.mockResolvedValue({ data: { session: null } });
        mockSignInWithPassword.mockReset();
    });

    it('renders the login page correctly', () => {
        render(
            <BrowserRouter>
                <Auth />
            </BrowserRouter>
        );

        expect(screen.getByText('Admin Access')).toBeInTheDocument();
        expect(screen.getByText('Restricted area. Authorized personnel only.')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Enter Dashboard/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({
            data: { user: { id: 'admin-user', role: 'admin' } },
            error: null
        });

        render(
            <BrowserRouter>
                <Auth />
            </BrowserRouter>
        );

        const emailInput = screen.getByPlaceholderText('Email Address');
        const passwordInput = screen.getByPlaceholderText('Password');
        const submitButton = screen.getByRole('button', { name: /Enter Dashboard/i });

        fireEvent.change(emailInput, { target: { value: 'admin@420connect.com' } });
        fireEvent.change(passwordInput, { target: { value: 'securepassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockSignInWithPassword).toHaveBeenCalledWith({
                email: 'admin@420connect.com',
                password: 'securepassword',
            });
            expect(mockFrom).toHaveBeenCalledWith('profiles');
        });
    });

    it('displays error message on failed login', async () => {
        mockSignInWithPassword.mockResolvedValueOnce({
            data: { user: null },
            error: { message: 'Invalid credentials' }
        });

        render(
            <BrowserRouter>
                <Auth />
            </BrowserRouter>
        );

        const emailInput = screen.getByPlaceholderText('Email Address');
        const passwordInput = screen.getByPlaceholderText('Password');
        const submitButton = screen.getByRole('button', { name: /Enter Dashboard/i });

        fireEvent.change(emailInput, { target: { value: 'wrong@admin.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

});
