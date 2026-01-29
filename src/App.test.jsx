import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { MemoryRouter } from 'react-router-dom';

// Mock contexts
vi.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: () => ({
        session: null,
        loading: true, // Force loading state to check spinner
    }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
    useTheme: () => ({
        theme: 'light',
    }),
}));

describe('App Smoke Test', () => {
    it('renders loading spinner on mount', () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        );

        // Check for the text in FullPageSpinner
        expect(screen.getByText(/Carregando Audicare/i)).toBeInTheDocument();
    });
});
