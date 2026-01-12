import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, WifiOff, ServerCrash } from "lucide-react";
import useConfigurationValidator from '@/hooks/useConfigurationValidator';

/**
 * Component that displays a prominent warning banner if the application
 * configuration is invalid or the backend is unreachable.
 * Intended to be placed at the root of the layout or dashboard.
 */
const ConfigValidationBanner = () => {
  const { isValidating, configStatus, retry } = useConfigurationValidator();

  if (isValidating || configStatus.isValid) {
    return null; // Don't show anything if loading or if everything is fine
  }

  const isConnectivityIssue = !configStatus.isReachable;
  const isUrlIssue = !configStatus.isProductionUrl;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <Alert variant="destructive" className="max-w-4xl mx-auto border-red-600 shadow-lg bg-red-50 dark:bg-red-950/50">
        <div className="flex items-start gap-4">
          {isConnectivityIssue ? (
            <WifiOff className="h-6 w-6 text-red-600 mt-1" />
          ) : (
            <ServerCrash className="h-6 w-6 text-red-600 mt-1" />
          )}
          
          <div className="flex-1">
            <AlertTitle className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
              {isConnectivityIssue ? 'Connection Error' : 'Configuration Error'}
            </AlertTitle>
            
            <AlertDescription className="text-red-600 dark:text-red-300 space-y-2">
              <p>{configStatus.message}</p>
              
              {isUrlIssue && (
                <div className="text-xs font-mono bg-black/5 dark:bg-white/10 p-2 rounded mt-2 border border-red-200 dark:border-red-800">
                  Expected: https://api.audicarefono.com.br<br/>
                  Found: {import.meta.env.VITE_API_BASE_URL || 'undefined'}
                </div>
              )}

              {isUrlIssue && (
                 <p className="text-sm mt-2 font-medium">
                   Please update your <code className="font-mono bg-red-200 dark:bg-red-900 px-1 rounded">.env</code> file and restart the application.
                 </p>
              )}
            </AlertDescription>

            <div className="mt-4 flex gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retry}
                className="border-red-300 text-red-700 hover:bg-red-100 hover:text-red-900 dark:border-red-800 dark:text-red-400"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              
              {isUrlIssue && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-red-700 underline"
                    onClick={() => window.open('https://api.audicarefono.com.br/health', '_blank')}
                  >
                    Test Endpoint in Browser
                  </Button>
              )}
            </div>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default ConfigValidationBanner;