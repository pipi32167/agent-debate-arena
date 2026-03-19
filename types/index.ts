// Provider 配置
export interface ProviderConfig {
  id: string;
  name: string;           // 显示名称，如 "OpenRouter", "SiliconFlow"
  baseURL: string;        // API 基础地址
  apiKey: string;         // API 密钥
  models: ProviderModel[]; // 该 provider 支持的模型列表
  isBuiltIn: boolean;     // 是否是内置 provider (OpenAI/Anthropic)
}

// Provider 模型
export interface ProviderModel {
  id: string;            // 模型 ID，如 "gpt-4o"
  name: string;          // 显示名称
  enabled: boolean;      // 是否启用
}

// AI Agent
export interface AIAgent {
  id: string;
  name: string;
  avatar: string;
  providerId: string;     // 关联的 provider ID
  modelId: string;        // 模型 ID
  persona: string;
  systemPrompt: string;
  stance: 'for' | 'against'; // 在特定议题上的立场
}

// 辩论消息
export interface DebateMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  content: string;
  timestamp: number;
  round: number;
  type: 'opening' | 'rebuttal' | 'cross' | 'closing';
}

// 投票
export interface Vote {
  judgeId: string;
  judgeName: string;
  votedForId: string;
  reason: string;
}

// 辩论轮次
export interface DebateRound {
  id: string;
  roundNumber: number;
  topic: string;
  debaterA: AIAgent;
  debaterB: AIAgent;
  messages: DebateMessage[];
  judges: AIAgent[];
  votes: Vote[];
  winner: AIAgent | null;
  status: 'pending' | 'ongoing' | 'voting' | 'completed';
  currentSpeaker: string | null;
  currentMessage: string; // 流式消息缓冲
}

// 锦标赛
export interface Tournament {
  id: string;
  topic: string;
  description: string;
  participants: AIAgent[];
  rounds: DebateRound[];
  currentRoundIndex: number;
  currentMatchIndex: number;
  winners: AIAgent[]; // 当前轮次的胜者
  champion: AIAgent | null;
  status: 'configuring' | 'ongoing' | 'completed';
  createdAt: number;
  maxDebateRounds: number; // 每场辩论的最大回合数
}

// 预设 AI Persona
export interface PresetPersona {
  id: string;
  name: string;
  avatar: string;
  persona: string;
  systemPrompt: string;
}

// 流式响应更新
export interface StreamUpdate {
  type: 'message' | 'vote' | 'status';
  data: DebateMessage | Vote | { status: DebateRound['status'] };
}

// 模型配置（已弃用，保留用于兼容）
export interface ModelConfig {
  provider: 'openai' | 'anthropic';
  model: string;
  temperature: number;
  maxTokens: number;
}
