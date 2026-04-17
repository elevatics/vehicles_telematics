import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask about this vehicle..."
        className="flex-1 h-9 text-sm"
        disabled={isLoading}
      />
      <Button type="submit" size="icon" className="h-9 w-9" disabled={isLoading || !value.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
