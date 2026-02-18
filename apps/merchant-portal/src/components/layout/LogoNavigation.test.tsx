import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Layout from './Layout';
import * as AuthContext from '@/contexts/AuthContext';

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signOut: vi.fn(),
        },
    },
}));

describe('Layout Logo Navigation', () => {
    it('navigates to settings when logo is clicked', () => {
        // Setup mock return value for useAuth
        (AuthContext.useAuth as any).mockReturnValue({
            user: { id: 'test-user' },
            session: { access_token: 'token' },
        });

        render(
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        );

        // Find the logo by text '420Connect'
        const logoText = screen.getByText('420Connect');
        expect(logoText).toBeInTheDocument();

        // The logo should be wrapped in a link pointing to /settings
        const logoLink = screen.getByRole('link', { name: /420Connect/i });
        expect(logoLink).toHaveAttribute('href', '/settings');

        // Alternatively, we can check if clicking it changes location, 
        // but checking the href attribute is usually sufficient for Link components in unit tests.
    });
});
