import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Paperclip, Mic, StopCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ChatActionBar = ({ onEmojiSelect, onFileAttach, onAudioRecordStart, onAudioRecordFinish }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = React.useRef(null);

  const handleMicClick = () => {
    if (isRecording) {
        stopRecording(true);
    } else {
        startRecording();
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    onAudioRecordStart();
    recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
    }, 1000);
  };
  
  const stopRecording = (send) => {
    setIsRecording(false);
    clearInterval(recordingIntervalRef.current);
    if(send) {
        onAudioRecordFinish({ duration: recordingTime });
    }
    setRecordingTime(0);
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="pt-2 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onEmojiSelect} disabled={isRecording}>
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Emoji</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onFileAttach} disabled={isRecording}>
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Anexar arquivo</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 flex justify-end items-center gap-2">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-full"
            >
               <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
               <span>{formatTime(recordingTime)}</span>
               <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => stopRecording(false)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
               </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={isRecording ? 'destructive' : 'ghost'} size="icon" onClick={handleMicClick}>
                {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isRecording ? 'Parar gravação' : 'Gravar áudio'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export default ChatActionBar;