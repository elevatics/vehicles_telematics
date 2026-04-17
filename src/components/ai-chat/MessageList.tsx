import { useRef, useEffect } from 'react';
import { Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArtifactTabs } from './ArtifactTabs';
import { Message } from './types';
import { assistantNotStarted } from './utils';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  toolProgress: string[];
}

export function MessageList({ messages, isLoading, toolProgress }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1 mb-3 min-h-0">
      {messages.map((msg, i) => (
        <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
          {msg.role === 'assistant' && (
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="h-3 w-3 text-primary" />
            </div>
          )}
          <div className={cn(
            'rounded-xl px-3 py-2 text-sm max-w-[80%]',
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}>
            {msg.role === 'assistant' ? (
              <div className="space-y-2">
                <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:my-2 prose-code:break-all prose-a:text-primary prose-a:break-all prose-a:no-underline hover:prose-a:underline prose-table:block prose-table:overflow-x-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || '_Working on your request..._'}
                  </ReactMarkdown>
                </div>
                {msg.artifacts && msg.artifacts.length > 0 && (
                  <ArtifactTabs artifacts={msg.artifacts} summary={msg.content} />
                )}
              </div>
            ) : (
              <span className="whitespace-pre-wrap">{msg.content}</span>
            )}
          </div>
          {msg.role === 'user' && (
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
              <User className="h-3 w-3" />
            </div>
          )}
        </div>
      ))}

      {isLoading && assistantNotStarted(messages) && (
        <div className="flex gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Bot className="h-3 w-3 text-primary" />
          </div>
          <div className="bg-muted rounded-xl px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      {isLoading && toolProgress.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-xl px-3 py-2 max-w-[80%]">
            <div className="text-xs text-muted-foreground mb-1">Tools running</div>
            <div className="flex flex-wrap gap-1.5">
              {toolProgress.map((tool, i) => (
                <span key={`${tool}-${i}`} className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px]">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
