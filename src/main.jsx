import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import ErrorBoundary from '@/components/ErrorBoundary';
import { TooltipProvider } from "@/components/ui/tooltip";

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </TooltipProvider>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </>
);