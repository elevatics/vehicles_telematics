export type ChatArtifact = {
  csv?: string;
  html?: string;
  plotlyJson?: string;
};

export type Message = { role: 'user' | 'assistant'; content: string; artifacts?: ChatArtifact[] };

export type StreamEvent =
  | { type: 'token'; content?: string }
  | { type: 'tool_start'; tool?: string }
  | { type: 'tool_end'; output?: string }
  | { type: 'error'; message?: string }
  | { type: 'artifact'; 'text/csv'?: string; 'text/html'?: string; 'plotly_fig/json'?: string };
