import { useState } from 'react';
import { Vehicle } from '@/types/vehicle';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAIChat } from './ai-chat/useAIChat';
import { ChatHeader } from './ai-chat/ChatHeader';
import { MessageList } from './ai-chat/MessageList';
import { ChatInput } from './ai-chat/ChatInput';

interface VehicleAIChatProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const QUICK_QUESTIONS = [
  'Vehicle health summary',
  'Fuel efficiency analysis',
  'Maintenance recommendations',
];

const VehicleAIChat = ({ vehicle, onClose }: VehicleAIChatProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { messages, input, setInput, isLoading, toolProgress, sendMessage } = useAIChat(vehicle);

  return (
    <Card
      className={cn(
        'flex flex-col shadow-2xl border-2 border-primary/20 overflow-hidden',
        isExpanded
          ? 'fixed inset-3 sm:inset-6 z-50 w-auto h-auto'
          : 'w-[420px] max-w-[95vw] h-[520px] sm:h-[560px]'
      )}
    >
      <ChatHeader
        vehicleName={vehicle.name}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(prev => !prev)}
        onClose={onClose}
      />

      <CardContent className="flex-1 flex flex-col p-3 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoading} toolProgress={toolProgress} />

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={sendMessage}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};

export default VehicleAIChat;