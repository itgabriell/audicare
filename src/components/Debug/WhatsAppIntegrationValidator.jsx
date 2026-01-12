import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  RefreshCw, 
  Copy, 
  Server,
  ShieldCheck,
  Globe
} from "lucide-react";
import ConfigValidator from '@/services/configValidator';
import { API_BASE_URL } from '@/config/apiConfig';

const StatusBadge = ({ status }) => {
  if (status === 'PASS') {
    return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Healthy</Badge>;
  }
  if (status === 'Loading') {
    return <Badge variant="outline" className="animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking</Badge>;
  }
  return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Issues Detected</Badge>;
};

const ResultRow = ({ label, result }) => {
  if (!result) return null;
  
  // Determine icon and color based on boolean success or direct status string
  const isSuccess = result.isValid || result.success || result.isLocalhost === false; 
  // Note: isLocalhost should be false for success
  
  return (
    <div className="flex items-center justify-between py-2 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs ${isSuccess ? 'text-green-600' : 'text-red-500'}`}>
          {result.message || (isSuccess ? 'OK' : 'Failed')}
        </span>
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
      </div>
    </div>
  );
};

export default function WhatsAppIntegrationValidator() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [showFixDialog, setShowFixDialog] = useState(false);

  const runValidation = async () => {
    setIsRunning(true);
    try {
      const result = await ConfigValidator.generateReport();
      setReport(result);
      
      if (result.overallStatus === 'PASS') {
        toast({
          title: "Validation Successful",
          description: "System configuration looks correct for production.",
          variant: "success", // using custom variant or default
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else {
        toast({
          title: "Validation Issues Found",
          description: "Please review the configuration errors below.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Validation Failed",
        description: "An unexpected error occurred during validation.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Run specific checks on mount just to populate initial state if needed, 
  // or wait for user action. Let's wait for user action to be explicit, 
  // but show static config immediately.
  
  const copyConfigFix = () => {
    const fixContent = `VITE_API_BASE_URL=https://api.audicarefono.com.br\nVITE_API_URL=https://api.audicarefono.com.br`;
    navigator.clipboard.writeText(fixContent);
    toast({
      title: "Copied to Clipboard",
      description: "Paste these values into your .env.local file",
    });
  };

  const isConfigError = report && (
    !report.config.baseUrlValid || 
    report.config.isLocalhost || 
    !report.config.urlFormatValid
  );

  return (
    <div className="space-y-6">
      {/* Configuration Status Header */}
      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                System Configuration Validator
              </CardTitle>
              <CardDescription>
                Verify environment settings and backend connectivity for Audicare API
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={isRunning ? 'Loading' : report?.overallStatus || 'Unknown'} />
              <div className="text-xs text-muted-foreground font-mono">
                {report?.environment || 'Environment: Unknown'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-muted/50 p-3 rounded-md border">
              <div className="text-xs font-medium text-muted-foreground mb-1">Current API Endpoint</div>
              <div className="font-mono text-sm truncate flex items-center gap-2" title={API_BASE_URL}>
                <Globe className="w-3 h-3" />
                {API_BASE_URL}
              </div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md border">
              <div className="text-xs font-medium text-muted-foreground mb-1">Environment Mode</div>
              <div className="font-mono text-sm flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" />
                {import.meta.env.DEV ? 'Development Mode' : 'Production Build'}
              </div>
            </div>
          </div>

          {/* Localhost Warning */}
          {API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1') ? (
            <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertTitle>Localhost Configuration Detected</AlertTitle>
              <AlertDescription>
                The application is pointed to a local server. This will fail in production deployments.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Quick Fix Prompt */}
          {isConfigError && (
            <Alert className="mb-4 bg-blue-50 text-blue-900 border-blue-200">
              <Settings className="w-4 h-4 text-blue-600" />
              <AlertTitle>Configuration Mismatch Detected</AlertTitle>
              <AlertDescription className="flex flex-col gap-2 mt-2">
                <p>Your environment variables do not match the required production settings.</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={copyConfigFix}
                  className="w-fit gap-2 bg-white hover:bg-blue-50 border-blue-300 text-blue-700"
                >
                  <Copy className="w-3 h-3" />
                  Copy Correct Config
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="bg-muted/20 border-t flex justify-between items-center py-3">
          <span className="text-xs text-muted-foreground">
            Last check: {report?.timestamp ? new Date(report.timestamp).toLocaleTimeString() : 'Never'}
          </span>
          <Button onClick={runValidation} disabled={isRunning} className="gap-2">
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Run Validation
          </Button>
        </CardFooter>
      </Card>

      {/* Detailed Results */}
      {report && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Config Checks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" /> Configuration Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow 
                label="Base URL Accuracy" 
                result={{ 
                  isValid: report.config.baseUrlValid, 
                  message: report.details.baseUrl 
                }} 
              />
              <ResultRow 
                label="Production Target" 
                result={{ 
                  isValid: !report.config.isLocalhost, 
                  message: report.details.localhost 
                }} 
              />
              <ResultRow 
                label="URL Syntax" 
                result={{ 
                  isValid: report.config.urlFormatValid, 
                  message: report.config.urlFormatValid ? 'Valid URI format' : 'Invalid syntax'
                }} 
              />
            </CardContent>
          </Card>

          {/* Connectivity Checks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Server className="w-4 h-4" /> Connectivity Checks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <ResultRow 
                label="Server Reachability" 
                result={{ 
                  isValid: report.connectivity.connected, 
                  message: report.details.connectivity 
                }} 
              />
              <ResultRow 
                label="Health Endpoint (/health)" 
                result={{ 
                  isValid: report.connectivity.healthCheckPassed, 
                  message: report.details.health 
                }} 
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}