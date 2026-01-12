import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bug, 
  Activity, 
  ListTodo, 
  Settings, 
  FileJson, 
  PlayCircle,
  CheckCircle2
} from "lucide-react";

// Import Panels
import DiagnosticsPanel from '@/components/Debug/DiagnosticsPanel';
import ValidationChecklist from '@/components/Debug/ValidationChecklist';
import ConfigurationStatusPanel from '@/components/Debug/ConfigurationStatusPanel';
import IntegrationAuditPanel from '@/components/Debug/IntegrationAuditPanel';

export default function InboxDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("diagnostics");

  // Handler for "Run All Validations" - In a real scenario, we might coordinate refs,
  // but here we'll rely on each component's auto-run or user initiation for simplicity,
  // or just trigger a toast as a placeholder for a complex orchestration.
  const handleRunAll = () => {
    // This button serves as a global trigger idea, but each panel manages its own state complexly.
    // We will switch to the Checklist tab which has the "Run Full Validation" flow that covers most bases.
    setActiveTab("checklist");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" title="Debug & Diagnostics">
          <Bug className="h-5 w-5 text-muted-foreground hover:text-primary" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:w-[600px] sm:max-w-[600px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b bg-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Inbox Debugger
              </SheetTitle>
              <SheetDescription>
                System diagnostics, validation, and logs.
              </SheetDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleRunAll} className="hidden sm:flex">
              <PlayCircle className="w-4 h-4 mr-2" />
              Run All Checks
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab} 
            className="flex-1 flex flex-col h-full"
          >
            <div className="px-6 pt-4 border-b bg-background">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-1 pb-3 mb-0 overflow-x-auto flex-nowrap">
                <TabsTrigger 
                  value="diagnostics" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 px-4 py-2 rounded-md"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Diagnostics
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 px-4 py-2 rounded-md"
                >
                  <ListTodo className="w-4 h-4 mr-2" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger 
                  value="config" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 px-4 py-2 rounded-md"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Config
                </TabsTrigger>
                <TabsTrigger 
                  value="logs" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 px-4 py-2 rounded-md"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Logs
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 bg-muted/5">
              <div className="p-6 pb-20">
                <TabsContent value="diagnostics" className="mt-0 space-y-4">
                   <div className="mb-4">
                     <h3 className="text-sm font-medium text-muted-foreground mb-1">Connectivity & Endpoints</h3>
                     <DiagnosticsPanel />
                   </div>
                </TabsContent>

                <TabsContent value="checklist" className="mt-0">
                   <div className="mb-4">
                     <h3 className="text-sm font-medium text-muted-foreground mb-1">Validation Steps</h3>
                     <ValidationChecklist />
                   </div>
                </TabsContent>

                <TabsContent value="config" className="mt-0">
                   <div className="mb-4">
                     <h3 className="text-sm font-medium text-muted-foreground mb-1">System Configuration</h3>
                     <ConfigurationStatusPanel />
                   </div>
                </TabsContent>

                <TabsContent value="logs" className="mt-0">
                   <div className="mb-4">
                     <h3 className="text-sm font-medium text-muted-foreground mb-1">Integration Audit Logs</h3>
                     <IntegrationAuditPanel />
                   </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}