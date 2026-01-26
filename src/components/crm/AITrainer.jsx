import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const AITrainer = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!question || !answer) return;
    setLoading(true);

    try {
      // 1. Gerar o Embedding (Vetor) usando a Edge Function (vamos criar já já)
      const { data: embeddingData, error: embedError } = await supabase.functions.invoke('generate-embedding', {
        body: { input: question }
      });

      if (embedError) throw embedError;

      // 2. Salvar no Banco
      const { error } = await supabase.from('ai_knowledge_base').insert({
        content: question,
        response: answer,
        embedding: embeddingData.embedding // O vetor matemático
      });

      if (error) throw error;

      toast({ title: "Aprendizado Salvo! 🧠", description: "A IA agora sabe responder isso." });
      setQuestion('');
      setAnswer('');

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          🎓 Treinador da IA (Audicare)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ensine a IA como responder. Quanto mais exemplos, mais parecida com você ela fica.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Pergunta/Situação do Cliente:</label>
          <Input 
            value={question} 
            onChange={e => setQuestion(e.target.value)} 
            placeholder="Ex: Quanto custa a audiometria?" 
          />
        </div>
        <div>
          <label className="text-sm font-medium">Sua Resposta Ideal (Tom Humanizado):</label>
          <Textarea 
            value={answer} 
            onChange={e => setAnswer(e.target.value)} 
            placeholder="Ex: Olá! Tudo bem? O valor depende... (sua resposta completa)" 
            rows={4}
          />
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Processando...' : 'Salvar na Memória da IA'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AITrainer;