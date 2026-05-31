export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  systemInstruction?: string;
  searchGrounding: boolean;
  createdAt: string;
}

export interface PersonaPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstruction: string;
}
