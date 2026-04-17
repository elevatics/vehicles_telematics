import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { X, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

interface ChatHeaderProps {
  vehicleName: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
}

export function ChatHeader({ vehicleName, isExpanded, onToggleExpand, onClose }: ChatHeaderProps) {
  return (
    <CardHeader className="pb-2 flex-shrink-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-sm">AI Fleet Companion</CardTitle>
            <p className="text-xs text-muted-foreground">{vehicleName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Collapse chat window' : 'Expand chat window'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7" aria-label="Close chat">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
