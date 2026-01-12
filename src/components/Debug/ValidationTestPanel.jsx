import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, CheckCircle2, XCircle, AlertTriangle, Clock, 
  Download, History, BarChart2, RefreshCw, Bug, 
  ChevronRight, ChevronDown, Trash2, Settings, Search,
  FileJson, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { validationRunner } from '@/utils/validationScript';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const ValidationTestPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState({});
  const [history, setHistory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('execution');
  const { toast } = useToast();

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('validation_test_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveHistory = (newEntry) => {
    const updatedHistory = [newEntry, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('validation_test_history', JSON.stringify(updatedHistory));
  };

  const allTests = validationRunner.getTests();

  const filteredTests = useMemo(() => {
    return allTests.filter(test => {
      const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || test.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allTests, searchTerm, selectedCategory]);

  const runTest = async (testId) => {
    const test = allTests.find(t => t.id === testId);
    if (!test) return;

    setResults(prev => ({ ...prev, [testId]: { status: 'running', startTime: Date.now() } }));
    
    const result = await validationRunner.runTest(test.name, test.fn);
    
    setResults(prev => ({ 
      ...prev, 
      [testId]: { ...result, timestamp: Date.now() } 
    }));

    return { id: testId, ...result };
  };

  const runAll = async () => {
    setIsRunning(true);
    setResults({}); // Clear current results
    const sessionResults = [];
    
    for (const test of filteredTests) {
      const res = await runTest(test.id);
      sessionResults.push(res);
      // Small delay for visual smoothness
      await new Promise(r => setTimeout(r, 200));
    }
    
    setIsRunning(false);
    
    // Save to history
    const passCount = sessionResults.filter(r => r.status === 'pass').length;
    saveHistory({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      total: sessionResults.length,
      passed: passCount,
      failed: sessionResults.length - passCount,
      details: sessionResults
    });

    if (passCount === sessionResults.length) {
        toast({ title: "Todos os testes passaram!", className: "bg-green-50 text-green-900" });
    } else {
        toast({ variant: "destructive", title: "Alguns testes falharam." });
    }
  };

  const exportResults = (format) => {
    const data = {
      timestamp: new Date().toISOString(),
      results: results,
      summary: {
        total: Object.keys(results).length,
        passed: Object.values(results).filter(r => r.status === 'pass').length
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Calculate Stats for Chart
  const chartData = useMemo(() => {
    return history.slice(0, 10).reverse().map(h => ({
      date: new Date(h.timestamp).toLocaleTimeString(),
      passed: h.passed,
      failed: h.failed
    }));
  }, [history]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'pass': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const TestItem = ({ test }) => {
    const res = results[test.id];
    const [showDetails, setShowDetails] = useState(false);

    return (
      <div className="border rounded-lg mb-3 bg-card hover:bg-accent/5 transition-colors overflow-hidden">
        <div className="flex items-center p-3 gap-3">
           <div className="p-2 rounded-full bg-secondary/50">
               {getStatusIcon(res?.status)}
           </div>
           <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2">
                   <h4 className="text-sm font-medium">{test.name}</h4>
                   <Badge variant="outline" className="text-[10px] h-5 capitalize">{test.category}</Badge>
               </div>
               {res?.status === 'fail' && <p className="text-xs text-red-500 truncate">{res.error}</p>}
               {res?.status === 'pass' && <p className="text-xs text-muted-foreground truncate">Duração: {res.duration?.toFixed(0)}ms</p>}
           </div>
           <div className="flex items-center gap-2">
               {res && (
                   <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowDetails(!showDetails)}>
                       {showDetails ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                   </Button>
               )}
               <Button variant="ghost" size="sm" onClick={() => runTest(test.id)} disabled={res?.status === 'running'}>
                   <Play className="h-3 w-3" />
               </Button>
           </div>
        </div>
        {showDetails && res && (
            <div className="px-4 pb-3 pt-0 bg-secondary/10 text-xs font-mono border-t">
                <div className="mt-2 space-y-1">
                    <div className="flex gap-2"><span className="font-bold text-muted-foreground">Status:</span> {res.status.toUpperCase()}</div>
                    <div className="flex gap-2"><span className="font-bold text-muted-foreground">Duration:</span> {res.duration.toFixed(2)}ms</div>
                    {res.data && (
                        <div className="mt-2">
                            <span className="font-bold text-muted-foreground">Output:</span>
                            <pre className="bg-background p-2 rounded border mt-1 overflow-x-auto">
                                {JSON.stringify(res.data, null, 2)}
                            </pre>
                        </div>
                    )}
                    {res.error && (
                        <div className="mt-2 text-red-600">
                            <span className="font-bold">Error:</span>
                            <pre className="bg-red-50 dark:bg-red-900/10 p-2 rounded border border-red-200 mt-1 overflow-x-auto whitespace-pre-wrap">
                                {res.error}
                                {res.stack && `\n\n${res.stack}`}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-background/50 hover:bg-background border-dashed">
            <Bug className="h-4 w-4 text-indigo-500" />
            <span className="hidden md:inline">Validação</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-secondary/10">
            <div>
                <DialogTitle className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-indigo-500" />
                    Painel de Validação & Testes
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">Execute testes automatizados para garantir a integridade do sistema.</p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportResults('json')} disabled={Object.keys(results).length === 0}>
                    <Download className="h-4 w-4 mr-2" /> Exportar
                </Button>
                <Button size="sm" onClick={runAll} disabled={isRunning} className="bg-indigo-600 hover:bg-indigo-700">
                    {isRunning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    Executar Todos
                </Button>
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-2 border-b bg-background">
                <TabsList className="w-full justify-start bg-transparent border-b-0 rounded-none h-auto p-0 gap-4">
                    <TabsTrigger value="execution" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2">Execução</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2">Histórico</TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 py-2">Analytics</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="execution" className="flex-1 flex overflow-hidden m-0">
                <div className="w-64 border-r bg-secondary/5 p-4 flex flex-col gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Buscar</label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                className="h-8 text-xs pl-8" 
                                placeholder="Filtrar testes..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Todas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="security">Segurança</SelectItem>
                                <SelectItem value="network">Rede & API</SelectItem>
                                <SelectItem value="messaging">Mensagens</SelectItem>
                                <SelectItem value="data">Dados</SelectItem>
                                <SelectItem value="performance">Performance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mt-auto border-t pt-4 space-y-2">
                        <div className="flex justify-between text-xs">
                            <span>Total de Testes</span>
                            <span className="font-mono">{filteredTests.length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>Passou</span>
                            <span className="font-mono text-green-600">{Object.values(results).filter(r => r.status === 'pass').length}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span>Falhou</span>
                            <span className="font-mono text-red-600">{Object.values(results).filter(r => r.status === 'fail').length}</span>
                        </div>
                        <Progress value={(Object.keys(results).length / filteredTests.length) * 100} className="h-1.5 mt-2" />
                    </div>
                </div>

                <div className="flex-1 bg-background">
                    <ScrollArea className="h-full p-4">
                        <div className="max-w-3xl mx-auto">
                            {filteredTests.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">Nenhum teste encontrado para os filtros atuais.</div>
                            ) : (
                                filteredTests.map(test => (
                                    <TestItem key={test.id} test={test} />
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden m-0 p-4 bg-muted/10">
                 <ScrollArea className="h-full">
                     <div className="space-y-3 max-w-4xl mx-auto">
                         {history.length === 0 && (
                             <div className="text-center py-12 text-muted-foreground">Nenhum histórico de execução.</div>
                         )}
                         {history.map((entry, i) => (
                             <Card key={i} className="overflow-hidden">
                                 <div className="flex items-center p-3 gap-4 hover:bg-secondary/10 transition-colors cursor-pointer">
                                     <div className="flex flex-col items-center justify-center w-16 text-xs text-muted-foreground border-r pr-4">
                                         <span className="font-bold">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                         <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                     </div>
                                     <div className="flex-1">
                                         <div className="flex items-center gap-2 mb-1">
                                             <h4 className="font-medium text-sm">Execução Automática</h4>
                                             {entry.failed === 0 ? 
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-[10px]">SUCESSO</Badge> : 
                                                <Badge variant="destructive" className="text-[10px]">{entry.failed} FALHAS</Badge>
                                             }
                                         </div>
                                         <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                             <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> {entry.passed}</span>
                                             <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> {entry.failed}</span>
                                             <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3" /> Total: {entry.total}</span>
                                         </div>
                                     </div>
                                     <Button variant="ghost" size="icon" onClick={() => {
                                        const newHistory = history.filter(h => h.id !== entry.id);
                                        setHistory(newHistory);
                                        localStorage.setItem('validation_test_history', JSON.stringify(newHistory));
                                     }}>
                                         <Trash2 className="h-4 w-4 text-muted-foreground" />
                                     </Button>
                                 </div>
                             </Card>
                         ))}
                     </div>
                 </ScrollArea>
            </TabsContent>
            
            <TabsContent value="analytics" className="flex-1 p-6 overflow-auto">
                 <div className="max-w-4xl mx-auto space-y-6">
                     <Card>
                         <CardHeader>
                             <CardTitle className="text-sm font-medium">Taxa de Sucesso (Últimas 10 execuções)</CardTitle>
                         </CardHeader>
                         <CardContent className="h-[300px]">
                             <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={chartData}>
                                     <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                     <XAxis dataKey="date" tick={{fontSize: 12}} />
                                     <YAxis tick={{fontSize: 12}} />
                                     <RechartsTooltip 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                                     />
                                     <Bar dataKey="passed" name="Passou" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                                     <Bar dataKey="failed" name="Falhou" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                                 </BarChart>
                             </ResponsiveContainer>
                         </CardContent>
                     </Card>
                 </div>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ValidationTestPanel;