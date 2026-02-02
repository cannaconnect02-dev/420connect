import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Auth from './Auth';

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
    Calendar: () => <div data-testid="calendar" />
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: vi.fn(),
            signUp: vi.fn()
        }
    }
}));

describe('Auth Page (Merchant Portal)', () => {
    it('renders the login view by default', () => {
        render(<Auth />);
        expect(screen.getByText('420connect')).toBeInTheDocument();
        expect(screen.getByText('Merchant Portal')).toBeInTheDocument();
        expect(screen.getByText('Welcome Back')).toBeInTheDocument();

        expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
        expect(screen.getByText('New Merchant?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Apply to Join/i })).toBeInTheDocument();
    });

    it('toggles to partner application mode', () => {
        render(<Auth />);

        const applyBtn = screen.getByRole('button', { name: /Apply to Join/i });
        fireEvent.click(applyBtn);

        expect(screen.getByText('Partner Application')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. John Doe')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g. Green Leaf Dispensary')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Submit Application/i })).toBeInTheDocument();
        expect(screen.getByText('Already registered?')).toBeInTheDocument();
    });
});
