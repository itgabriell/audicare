import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Server, 
  Globe,
  MessageSquare,
  FileJson,
  ExternalLink,
  Wrench
} from "lucide-react";
import { API_BASE_URL, UAZAPI_ENDPOINTS } from '@/config/apiConfig';
import ConfigValidator from '@/services/configValidator';

export default function ConfigurationSummary() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [statusData, setStatusData] = useState(null);

  const runChecks = async () => {
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      // 1. Run base config validation
      const report = await ConfigValidator.generateReport();
      
      // 2. Run specific integration checks (parallel)
      const [waHealth, uazapiStatus] = await Promise.all([
        // WhatsApp Health - Try catch individually to not fail the whole group
        fetch(UAZAPI_ENDPOINTS.WA_HEALTH_CHECK)
          .then(r => r.ok ? 'ok' : 'error')
          .catch(() => 'error'),
        // UAZAPI Status (Gateway)
        fetch(UAZAPI_ENDPOINTS.CHECK_STATUS)
          .then(r => r.ok ? 'ok' : 'error')
          .catch(() => 'error')
      ]);

      // Update report with integration data
      report.integrations = {
        whatsapp: waHealth,
        uazapi: uazapiStatus
      };

      setStatusData({
        ...report,
        duration: Math.round(performance.now() - startTime)
      });
      setLastCheck(new Date());

      if (report.overallStatus === 'CRITICAL' || report.overallStatus === 'FAIL') {
        toast({
          title: "System Issues Detected",
          description: "Critical connectivity issues found.",
          variant: "destructive"
        });
      } else if (report.overallStatus === 'WARN') {
        toast({
          title: "Configuration Warning",
          description: "System operational but check configuration.",
          className: "bg-yellow-50 border-yellow-200 text-yellow-800"
        });
      } else {
        toast({
          title: "System Healthy",
          description: "All systems operational.",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (error) {
      console.error("Check failed:", error);
      toast({
        title: "Validation Failed",
        description: "Could not complete system checks.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  const handleExport = () => {
    if (!statusData) return;
    const exportData = JSON.stringify(statusData, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config-summary-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!statusData && isLoading) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin text-primary/50" />
          <p className="text-sm text-muted-foreground">Analyzing configuration...</p>
        </CardContent>
      </Card>
    );
  }

  if (!statusData) return null;

  const isCritical = statusData.overallStatus === 'CRITICAL' || statusData.overallStatus === 'FAIL';
  const isWarn = statusData.overallStatus === 'WARN';
  const isProd = statusData.environment.includes('Production');

  const getStatusIcon = () => {
    if (isCritical) return <XCircle className="text-red-500 h-5 w-5" />;
    if (isWarn) return <AlertTriangle className="text-yellow-500 h-5 w-5" />;
    return <ShieldCheck className="text-green-500 h-5 w-5" />;
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              {getStatusIcon()}
              Configuration Summary
            </CardTitle>
            <CardDescription>
              System health and environment overview
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runChecks} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <FileJson className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Warning/Error Banner */}
        {(isCritical || isWarn) && (
          <Alert variant={isCritical ? "destructive" : "default"} className={isWarn ? "bg-yellow-50 border-yellow-200 text-yellow-900" : "bg-red-50 border-red-200 text-red-900"}>
            <AlertTriangle className={`h-4 w-4 ${isWarn ? "text-yellow-600" : "text-red-600"}`} />
            <AlertTitle>{isCritical ? "Critical Issues Found" : "Warnings Detected"}</AlertTitle>
            <AlertDescription>
              {statusData.details.baseUrl || statusData.details.connectivity || "Check specific component status below."}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Environment Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusData.config.baseUrlValid ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium">API Environment</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">{statusData.environment}</p>
                </div>
              </div>
              <Badge variant={isProd ? 'default' : 'secondary'}>{isProd ? 'PROD' : 'DEV'}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusData.connectivity.connected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Backend API</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">{API_BASE_URL}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={statusData.connectivity.connected ? 'outline' : 'destructive'} className={statusData.connectivity.connected ? "text-green-600 border-green-200 bg-green-50" : ""}>
                  {statusData.connectivity.connected ? 'Online' : 'Offline'}
                </Badge>
                {statusData.connectivity.connected && (
                  <p className="text-[10px] text-muted-foreground mt-1">{statusData.connectivity.latency}ms</p>
                )}
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusData.integrations.whatsapp === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp API</p>
                  <p className="text-xs text-muted-foreground">/api/wa/health-check</p>
                </div>
              </div>
              <Badge variant={statusData.integrations.whatsapp === 'ok' ? 'outline' : 'destructive'} className={statusData.integrations.whatsapp === 'ok' ? "text-green-600 border-green-200 bg-green-50" : ""}>
                {statusData.integrations.whatsapp === 'ok' ? 'Active' : 'Error'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${statusData.integrations.uazapi === 'ok' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Gateway Status</p>
                  <p className="text-xs text-muted-foreground">Z-API Connection</p>
                </div>
              </div>
              <Badge variant={statusData.integrations.uazapi === 'ok' ? 'outline' : 'destructive'} className={statusData.integrations.uazapi === 'ok' ? "text-green-600 border-green-200 bg-green-50" : ""}>
                {statusData.integrations.uazapi === 'ok' ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Quick Links */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
             <Button variant="secondary" size="sm" className="h-8" asChild>
               <a href="/settings/diagnostics">
                 <Wrench className="w-3 h-3 mr-2" /> Advanced Diagnostics
               </a>
             </Button>
             <Button variant="secondary" size="sm" className="h-8" asChild>
               <a href="https://api.audicarefono.com.br/docs" target="_blank" rel="noreferrer">
                 <ExternalLink className="w-3 h-3 mr-2" /> API Documentation
               </a>
             </Button>
             <Button variant="ghost" size="sm" className="h-8" onClick={() => window.location.reload()}>
               Reload Application
             </Button>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/10 border-t py-2 px-6">
        <div className="flex justify-between w-full text-xs text-muted-foreground">
          <span>Validated in {statusData.duration}ms</span>
          <span>Last check: {lastCheck ? lastCheck.toLocaleTimeString() : 'Never'}</span>
        </div>
      </CardFooter>
    </Card>
  );
}