import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Wand2, Database, PlusCircle, CheckCircle } from 'lucide-react';

const AITrainer = () => {
  const [mode, setMode] = useState('manual'); // 'manual' | 'extract' | 'bulk'
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  
  const [transcript, setTranscript] = useState('');
  const [extractedPairs, setExtractedPairs] = useState([]);
  
  const [bulkJson, setBulkJson] = useState(''); // Para o JSON massivo

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // --- 1. SALVAR ÚNICO (MANUAL OU EXTRAÍDO) ---
  const saveToMemory = async (q, a) => {
    const { data: embedData, error: embedError } = await supabase.functions.invoke('generate-embedding', {
      body: { input: q }
    });
    if (embedError) throw embedError;

    const { error } = await supabase.from('ai_knowledge_base').insert({
      content: q,
      response: a,
      embedding: embedData.embedding
    });
    if (error) throw error;
  };

  const handleSaveManual = async () => {
    if (!question || !answer) return;
    setLoading(true);
    try {
      await saveToMemory(question, answer);
      setQuestion('');
      setAnswer('');
      toast({ title: "Salvo!", description: "Conhecimento adicionado." });
    } catch (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- 2. EXTRAÇÃO DE TEXTO ---
  const handleAnalyze = async () => {
    if (!transcript) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-knowledge', {
        body: { transcript }
      });
      if (error) throw error;
      setExtractedPairs(data.pairs || []);
      toast({ title: "Análise concluída", description: `${data.pairs.length} pares encontrados.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro na análise", description: "Verifique o texto e tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePair = async (pair, index) => {
    const newPairs = [...extractedPairs];
    newPairs[index].saving = true;
    setExtractedPairs(newPairs);

    try {
      await saveToMemory(pair.question, pair.answer);
      newPairs[index].saving = false;
      newPairs[index].saved = true;
      setExtractedPairs(newPairs);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar par.", variant: "destructive" });
      newPairs[index].saving = false;
      setExtractedPairs(newPairs);
    }
  };

  // --- 3. IMPORTAÇÃO EM MASSA (JSON) ---
  const handleBulkImport = async () => {
    if (!bulkJson) return;
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
        const pairs = JSON.parse(bulkJson);
        if (!Array.isArray(pairs)) throw new Error("O formato deve ser uma Lista []");

        toast({ title: "Iniciando Importação", description: `Processando ${pairs.length} itens. Isso pode demorar...` });

        for (const pair of pairs) {
            try {
                if(!pair.question || !pair.answer) continue;
                await saveToMemory(pair.question, pair.answer);
                successCount++;
            } catch (e) {
                console.error("Falha no item:", pair, e);
                failCount++;
            }
        }

        toast({ 
            title: "Importação Finalizada", 
            description: `✅ ${successCount} salvos. ❌ ${failCount} falhas.` 
        });
        setBulkJson('');

    } catch (error) {
        toast({ title: "Erro no JSON", description: "Verifique a formatação do JSON.", variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-lg">
            🎓 Cérebro da Clara
            </CardTitle>
            <div className="flex bg-white rounded-lg border p-1">
                <Button variant={mode === 'manual' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('manual')}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Manual
                </Button>
                <Button variant={mode === 'extract' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('extract')}>
                    <Wand2 className="h-4 w-4 mr-2" /> Extrair
                </Button>
                <Button variant={mode === 'bulk' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('bulk')}>
                    <Database className="h-4 w-4 mr-2" /> Em Massa
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {mode === 'manual' && (
            <div className="space-y-4 animate-in fade-in">
                <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ex: Qual o valor da consulta?" />
                <Textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Sua resposta..." rows={3} />
                <Button onClick={handleSaveManual} disabled={loading} className="w-full">
                    {loading ? 'Salvando...' : 'Salvar na Memória'}
                </Button>
            </div>
        )}

        {mode === 'extract' && (
            <div className="space-y-4 animate-in fade-in">
                {!extractedPairs.length ? (
                    <>
                        <Textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Cole o histórico da conversa aqui..." rows={6} className="font-mono text-xs" />
                        <Button onClick={handleAnalyze} disabled={loading || !transcript} className="w-full">
                            {loading ? 'Analisando...' : 'Analisar Conversa'}
                        </Button>
                    </>
                ) : (
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                        <Button variant="outline" size="sm" onClick={() => { setExtractedPairs([]); setTranscript(''); }} className="mb-2">Analisar Outra</Button>
                        {extractedPairs.map((pair, idx) => (
                            <div key={idx} className={`p-3 rounded border bg-white text-sm ${pair.saved ? 'border-green-500 bg-green-50' : ''}`}>
                                <div className="font-semibold text-blue-800">P: {pair.question}</div>
                                <div className="text-gray-700">R: {pair.answer}</div>
                                {!pair.saved ? (
                                    <Button size="sm" variant="secondary" className="w-full mt-2" onClick={() => handleSavePair(pair, idx)} disabled={pair.saving}>
                                        {pair.saving ? 'Salvando...' : 'Salvar'}
                                    </Button>
                                ) : <div className="text-green-600 text-xs font-bold mt-2">✅ Salvo</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {mode === 'bulk' && (
            <div className="space-y-4 animate-in fade-in">
                <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                    <strong>Como usar:</strong> Prepare um arquivo JSON com suas conversas antigas. Cole o conteúdo abaixo.<br/>
                    Formato esperado: <code>[{`{"question": "...", "answer": "..."}`}, ...]</code>
                </div>
                <Textarea 
                    value={bulkJson} 
                    onChange={e => setBulkJson(e.target.value)} 
                    placeholder='[ {"question": "Onde fica?", "answer": "Rua X..."}, {"question": "Preço?", "answer": "Depende..."} ]' 
                    rows={10} 
                    className="font-mono text-xs"
                />
                <Button onClick={handleBulkImport} disabled={loading || !bulkJson} className="w-full">
                    {loading ? 'Processando Lote (Pode demorar)...' : 'Importar Todos'}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AITrainer;