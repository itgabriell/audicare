import React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  const handleInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    if (props.onInput) {
      props.onInput(e);
    }
  };

  return (
    <textarea
      className={cn(
        "flex min-h-[40px] max-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto",
        className
      )}
      ref={ref}
      onInput={handleInput}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }