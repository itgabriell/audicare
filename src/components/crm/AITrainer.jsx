import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Wand2, Save, PlusCircle, CheckCircle } from 'lucide-react';

const AITrainer = () => {
  const [mode, setMode] = useState('manual'); // 'manual' | 'extract'
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  
  const [transcript, setTranscript] = useState('');
  const [extractedPairs, setExtractedPairs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // --- MODO MANUAL ---
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

  // --- MODO EXTRAÇÃO ---
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
    // Marca visualmente como salvando...
    const newPairs = [...extractedPairs];
    newPairs[index].saving = true;
    setExtractedPairs(newPairs);

    try {
      await saveToMemory(pair.question, pair.answer);
      
      // Marca como salvo
      newPairs[index].saving = false;
      newPairs[index].saved = true;
      setExtractedPairs(newPairs);
      toast({ title: "Salvo!", description: "Par adicionado à base." });
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao salvar par.", variant: "destructive" });
      newPairs[index].saving = false;
      setExtractedPairs(newPairs);
    }
  };

  // --- FUNÇÃO CENTRAL DE SALVAR ---
  const saveToMemory = async (q, a) => {
    // 1. Gera Embedding
    const { data: embedData, error: embedError } = await supabase.functions.invoke('generate-embedding', {
      body: { input: q }
    });
    if (embedError) throw embedError;

    // 2. Salva no Banco
    const { error } = await supabase.from('ai_knowledge_base').insert({
      content: q,
      response: a,
      embedding: embedData.embedding
    });
    if (error) throw error;
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
            🎓 Treinador da IA
            </CardTitle>
            <div className="flex bg-white rounded-lg border p-1">
                <Button 
                    variant={mode === 'manual' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setMode('manual')}
                >
                    <PlusCircle className="h-4 w-4 mr-2" /> Manual
                </Button>
                <Button 
                    variant={mode === 'extract' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setMode('extract')}
                >
                    <Wand2 className="h-4 w-4 mr-2" /> Extrair de Conversa
                </Button>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {mode === 'manual' ? (
            // MODO MANUAL
            <div className="space-y-4 animate-in fade-in">
                <div>
                <label className="text-sm font-medium">Pergunta/Situação:</label>
                <Input 
                    value={question} 
                    onChange={e => setQuestion(e.target.value)} 
                    placeholder="Ex: Qual o valor da consulta?" 
                />
                </div>
                <div>
                <label className="text-sm font-medium">Resposta Ideal:</label>
                <Textarea 
                    value={answer} 
                    onChange={e => setAnswer(e.target.value)} 
                    placeholder="Sua melhor resposta..." 
                    rows={3}
                />
                </div>
                <Button onClick={handleSaveManual} disabled={loading} className="w-full">
                    {loading ? 'Salvando...' : 'Salvar na Memória'}
                </Button>
            </div>
        ) : (
            // MODO EXTRAÇÃO
            <div className="space-y-4 animate-in fade-in">
                {!extractedPairs.length ? (
                    <>
                        <div>
                            <label className="text-sm font-medium">Cole aqui o histórico de uma conversa (WhatsApp/Chatwoot):</label>
                            <Textarea 
                                value={transcript} 
                                onChange={e => setTranscript(e.target.value)} 
                                placeholder="[10:00] Cliente: Olá, gostaria de saber sobre aparelho... Atendente: Olá! Claro..." 
                                rows={6}
                                className="font-mono text-xs"
                            />
                        </div>
                        <Button onClick={handleAnalyze} disabled={loading || !transcript} className="w-full">
                            {loading ? 'Analisando Conversa...' : '✨ Analisar e Extrair Pares'}
                        </Button>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-sm">Pares Identificados:</h4>
                            <Button variant="outline" size="sm" onClick={() => { setExtractedPairs([]); setTranscript(''); }}>
                                Analisar Outra
                            </Button>
                        </div>
                        <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
                            {extractedPairs.map((pair, idx) => (
                                <div key={idx} className={`p-3 rounded border bg-white text-sm ${pair.saved ? 'border-green-500 bg-green-50' : ''}`}>
                                    <div className="font-semibold text-blue-800 mb-1">P: {pair.question}</div>
                                    <div className="text-gray-700 mb-2">R: {pair.answer}</div>
                                    {!pair.saved ? (
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="w-full h-8"
                                            onClick={() => handleSavePair(pair, idx)}
                                            disabled={pair.saving}
                                        >
                                            {pair.saving ? 'Salvando...' : 'Confirmar e Salvar'}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center justify-center text-green-600 gap-1 text-xs font-bold">
                                            <CheckCircle className="h-4 w-4" /> Salvo
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AITrainer;