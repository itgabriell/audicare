import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AudioRecorder = ({ onAudioRecorded, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      // Verificar se a API está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta gravação de áudio. Use Chrome, Firefox ou Edge.');
      }

      // Solicitar permissão com mensagem mais clara
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Verificar codecs suportados
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      
      let errorMessage = 'Não foi possível acessar o microfone.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador e tente novamente.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhum microfone encontrado. Verifique se há um microfone conectado ao dispositivo.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'O microfone está sendo usado por outro aplicativo. Feche outros aplicativos que possam estar usando o microfone.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'As configurações do microfone não são suportadas. Tente usar outro navegador.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao acessar microfone', 
        description: errorMessage,
        duration: 8000
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onAudioRecorded(audioBlob);
      // Reset
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setRecordingTime(0);
    }
  };

  const handleCancel = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  if (audioBlob && !isRecording) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
        <audio src={audioUrl} controls className="flex-1 h-8" />
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSend}>
            Enviar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {formatTime(recordingTime)}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={pauseRecording}
            className="h-9 w-9"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={stopRecording}
            className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        </>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          onClick={startRecording}
          disabled={disabled}
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5"
          title="Gravar áudio"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default AudioRecorder;

