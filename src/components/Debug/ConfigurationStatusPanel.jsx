import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {

  Globe,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Copy,
  Download,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Zap
} from "lucide-react";
import ConfigValidator from '@/services/configValidator';
import { API_BASE_URL } from '@/config/apiConfig';

export default function ConfigurationStatusPanel() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const runValidation = async () => {
    setIsRunning(true);
    try {
      const result = await ConfigValidator.generateReport();
      setReport(result);
      setLastChecked(new Date());

      if (result.overallStatus === 'PASS') {
        toast({
          title: "Configuration Healthy",
          description: "System is correctly configured for production.",
          variant: "success",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else if (result.overallStatus.includes('Connectivity')) {
        toast({
          title: "Connectivity Issues",
          description: "Configuration looks okay, but backend is unreachable.",
          variant: "warning",
          className: "bg-yellow-50 border-yellow-200 text-yellow-800"
        });
      } else {
        toast({
          title: "Configuration Error",
          description: "Critical environment configuration mismatch detected.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, []);

  const copyCorrectConfig = () => {
    const fixContent = `VITE_API_BASE_URL=https://api.audicarefono.com.br\nVITE_API_URL=https://api.audicarefono.com.br`;
    navigator.clipboard.writeText(fixContent);
    toast({
      title: "Copied to Clipboard",
      description: "Paste these values into your .env.local file",
    });
  };

  const exportReport = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `config_report_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (!report) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing environment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConfigError = !report.config.baseUrlValid || report.config.isLocalhost;
  const isProduction = report.environment.toLowerCase().includes('production');

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={`border-l-4 shadow-sm ${isConfigError ? 'border-l-red-500' : 'border-l-green-500'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                {isConfigError ? <AlertTriangle className="text-red-500" /> : <ShieldCheck className="text-green-500" />}
                System Health & Configuration
              </CardTitle>
              <CardDescription>
                {report.environment} • Checked {lastChecked?.toLocaleTimeString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={runValidation} disabled={isRunning}>
                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Alerts */}
          {report.config.isLocalhost && (
            <Alert variant="destructive" className="mb-4 bg-red-50 text-red-900 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertTitle>Production Warning: Localhost Detected</AlertTitle>
              <AlertDescription>
                Your API is pointing to localhost. This will fail in production.
              </AlertDescription>
              <Button size="sm" variant="outline" className="mt-2 bg-white text-red-900 border-red-200 hover:bg-red-100" onClick={copyCorrectConfig}>
                <Copy className="w-3 h-3 mr-2" /> Copy Production Config
              </Button>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Environment Card */}
            <div className="bg-muted/30 p-4 rounded-lg border flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Environment
                </h3>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={isProduction ? "default" : "secondary"}>
                    {report.environment}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate" title={API_BASE_URL}>
                  Base URL: {API_BASE_URL}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Config Status</span>
                  {report.config.baseUrlValid ? (
                    <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 className="w-3 h-3" /> Valid</span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1 font-medium"><XCircle className="w-3 h-3" /> Invalid</span>
                  )}
                </div>
              </div>
            </div>

            {/* Connectivity Card */}
            <div className="bg-muted/30 p-4 rounded-lg border flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Connectivity
                </h3>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-2xl font-bold ${report.connectivity.connected ? 'text-green-600' : 'text-red-600'}`}>
                    {report.connectivity.connected ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.details.connectivity}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Latency</span>
                  <span className={`font-mono flex items-center gap-1 ${report.connectivity.latency > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                    <Zap className="w-3 h-3" /> {report.connectivity.latency}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Env Vars Card */}
            <div className="bg-muted/30 p-4 rounded-lg border flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Terminal className="w-3 h-3" /> Variables
                </h3>
                <div className="space-y-1">
                  {Object.entries(report.envVars).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-[10px] font-mono text-muted-foreground">{key}</span>
                      <span className="text-xs font-mono truncate bg-background px-1 py-0.5 rounded border" title={value}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details & Troubleshooting */}
      <Tabs defaultValue="details">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details">Detailed Report</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" /> API URL Mismatch?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Please update your <code className="bg-muted px-1 rounded">.env.local</code> file with the production URL provided above. Don&apos;t forget to restart the dev server.
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-500" /> Backend Unreachable?
                </h4>
                <p className="text-sm text-muted-foreground">
                  If the config is correct but the backend is offline:
                  <ul className="list-disc list-inside mt-1 ml-2">
                    <li>Check if your internet connection is stable.</li>
                    <li>Verify if the backend server is down for maintenance.</li>
                    <li>Check the browser console for CORS errors.</li>
                  </ul>
                </p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-500" /> Env Vars Not Updating?
                </h4>
                <p className="text-sm text-muted-foreground">
                  Vite caches environment variables. If you changed <code className="bg-muted px-1 rounded">.env.local</code>, you MUST restart the development server (Control+C, then npm run dev).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}