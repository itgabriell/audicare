import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile } from 'lucide-react';

// Emojis mais usados no WhatsApp
const emojiCategories = {
  'Frequentes': ['😀', '😂', '🥰', '😍', '🤔', '😮', '👍', '❤️', '🙏', '👏'],
  'Carinhas': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
  'Gestos': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Corações': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objetos': ['📱', '💻', '⌚', '📷', '📹', '📺', '🔊', '📢', '📣', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡'],
};

const EmojiPicker = ({ onEmojiSelect, children }) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Frequentes');

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button
            type="button"
            className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            title="Adicionar emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {Object.keys(emojiCategories).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1 text-xs rounded-md whitespace-nowrap transition-colors ${
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <ScrollArea className="h-64">
          <div className="p-3 grid grid-cols-8 gap-2">
            {emojiCategories[activeCategory]?.map((emoji, index) => (
              <button
                key={`${activeCategory}-${index}`}
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl hover:bg-muted rounded-md p-2 transition-colors cursor-pointer"
                type="button"
              >
                {emoji}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;

