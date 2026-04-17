import { useState } from 'react';
import { Vehicle } from '@/types/vehicle';
import { Message, ChatArtifact, StreamEvent } from './types';
import { isAddressQuery, containsStreetAddress } from './utils';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CHAT_URL = `${API_BASE}/api/ai/v3/chat`;

const WELCOME_MESSAGE = (vehicle: Vehicle): Message => ({
  role: 'assistant',
  content: `Hi! I'm your AI Fleet Companion for **${vehicle.name}** (${vehicle.plateNumber}). Ask me anything about this vehicle — status, fuel, maintenance, driving patterns, or recommendations!`,
});

export function useAIChat(vehicle: Vehicle) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE(vehicle)]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolProgress, setToolProgress] = useState<string[]>([]);

  const upsertAssistant = (assistantSoFar: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && prev.length > 1 && last.content !== WELCOME_MESSAGE(vehicle).content) {
        return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
      }
      return [...prev, { role: 'assistant', content: assistantSoFar }];
    });
  };

  const appendArtifacts = (artifacts: ChatArtifact[]) => {
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === 'assistant') {
        last.artifacts = [...(last.artifacts ?? []), ...artifacts];
      } else {
        next.push({ role: 'assistant', content: '', artifacts });
      }
      return next;
    });
  };

  const appendAddressFallback = (userText: string, assistantText: string) => {
    if (!isAddressQuery(userText)) return;
    if (containsStreetAddress(assistantText)) return;
    if (!vehicle.location.address) return;

    const coordsLink = `https://www.google.com/maps?q=${vehicle.location.lat},${vehicle.location.lng}`;
    setMessages(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role !== 'assistant') return next;
      return [
        ...next.slice(0, -1),
        {
          ...last,
          content: `${last.content}\n\n**Latest known address:** ${vehicle.location.address}\n\n[Open in Google Maps](${coordsLink})`,
        },
      ];
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setToolProgress([]);

    let assistantSoFar = '';
    let doneStream = false;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          thread_id: `vehicle-${vehicle.id}`,
          device_id: String(vehicle.id),
          device_name: vehicle.name,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get response');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (jsonStr === '' || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr) as StreamEvent;

            if (parsed.type === 'token' && parsed.content) {
              assistantSoFar += parsed.content;
              upsertAssistant(assistantSoFar);
              continue;
            }

            if (parsed.type === 'tool_start' && parsed.tool) {
              setToolProgress(prev => [...prev, parsed.tool!]);
              continue;
            }

            if (parsed.type === 'tool_end' && parsed.output) {
              assistantSoFar += `\n\n${parsed.output}`;
              upsertAssistant(assistantSoFar);
              continue;
            }

            if (parsed.type === 'artifact') {
              const artifacts: ChatArtifact[] = [];
              if (parsed['text/csv']) artifacts.push({ csv: parsed['text/csv'] });
              if (parsed['text/html']) artifacts.push({ html: parsed['text/html'] });
              if (parsed['plotly_fig/json']) artifacts.push({ plotlyJson: parsed['plotly_fig/json'] });
              if (artifacts.length > 0) appendArtifacts(artifacts);
              continue;
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.message || 'Stream error');
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
      doneStream = true;
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${e.message}` }]);
    } finally {
      if (doneStream && assistantSoFar) {
        appendAddressFallback(userMsg.content, assistantSoFar);
      }
      if (!doneStream && !assistantSoFar) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response received. Please try again.' }]);
      }
      setToolProgress([]);
      setIsLoading(false);
    }
  };

  return { messages, input, setInput, isLoading, toolProgress, sendMessage };
}
