import { create } from 'zustand';
import { AIAgent, DebateRound, Tournament, Vote, DebateMessage, ProviderConfig } from '@/types';

interface DebateState {
  // 当前锦标赛
  tournament: Tournament | null;
  
  // 历史记录
  history: Tournament[];
  
  // Provider 配置
  providers: ProviderConfig[];
  
  // 加载状态
  isLoading: boolean;
  
  // Actions
  createTournament: (topic: string, description: string, participants: AIAgent[], maxDebateRounds?: number) => Promise<void>;
  startTournament: () => void;
  addMessage: (roundId: string, message: DebateMessage) => void;
  updateCurrentMessage: (roundId: string, content: string) => void;
  setCurrentSpeaker: (roundId: string, speakerId: string | null) => void;
  completeDebate: (roundId: string, votes: Vote[]) => void;
  advanceToNextMatch: () => void;
  resetTournament: () => void;
  addToHistory: (tournament: Tournament) => Promise<void>;
  clearHistory: () => Promise<void>;
  
  // Provider Actions
  loadProviders: () => Promise<void>;
  addProvider: (provider: Omit<ProviderConfig, 'id'>) => Promise<void>;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setProviders: (providers: ProviderConfig[]) => void;
  
  // 数据加载
  loadTournament: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

// 生成唯一 ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// 默认内置 Providers
export const defaultProviders: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '', // 从环境变量读取
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', enabled: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', enabled: true },
      { id: 'o3-mini', name: 'o3-mini', enabled: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', enabled: true },
    ],
    isBuiltIn: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: '', // 从环境变量读取
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', enabled: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', enabled: true },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', enabled: true },
    ],
    isBuiltIn: true,
  },
];

// 创建辩论轮次
function createDebateRounds(participants: AIAgent[], topic: string): DebateRound[] {
  const rounds: DebateRound[] = [];
  let roundNumber = 1;
  let currentParticipants = [...participants];
  
  // 打乱参与者顺序
  currentParticipants.sort(() => Math.random() - 0.5);
  
  while (currentParticipants.length > 1) {
    const round: DebateRound = {
      id: generateId(),
      roundNumber,
      topic,
      debaterA: currentParticipants[0],
      debaterB: currentParticipants[1],
      messages: [],
      judges: currentParticipants.slice(2),
      votes: [],
      winner: null,
      status: 'pending',
      currentSpeaker: null,
      currentMessage: ''
    };
    
    rounds.push(round);
    currentParticipants = currentParticipants.slice(2);
    roundNumber++;
  }
  
  return rounds;
}

export const useDebateStore = create<DebateState>()(
  (set, get) => ({
    tournament: null,
    history: [],
    providers: defaultProviders,
    isLoading: false,

    // 加载 Providers
    loadProviders: async () => {
      try {
        const response = await fetch('/api/db/providers');
        if (!response.ok) throw new Error('Failed to load providers');
        const { providers } = await response.json();
        if (providers && providers.length > 0) {
          set({ providers });
        } else {
          // 初始化默认 providers
          for (const provider of defaultProviders) {
            await fetch('/api/db/providers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(provider)
            });
          }
          set({ providers: defaultProviders });
        }
      } catch (error) {
        console.error('Load providers error:', error);
      }
    },

    createTournament: async (topic, description, participants, maxDebateRounds = 3) => {
      const rounds = createDebateRounds(participants, topic);
      const tournament: Tournament = {
        id: generateId(),
        topic,
        description,
        participants,
        rounds,
        currentRoundIndex: 0,
        currentMatchIndex: 0,
        winners: [],
        champion: null,
        status: 'configuring',
        createdAt: Date.now(),
        maxDebateRounds
      };
      
      // 保存到数据库
      try {
        await fetch('/api/db/tournament', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tournament)
        });
      } catch (error) {
        console.error('Save tournament error:', error);
      }
      
      set({ tournament });
    },

    startTournament: () => {
      set(state => {
        if (!state.tournament) return state;
        return {
          tournament: {
            ...state.tournament,
            status: 'ongoing'
          }
        };
      });
    },

    addMessage: (roundId, message) => {
      set(state => {
        if (!state.tournament) return state;
        const rounds = state.tournament.rounds.map(r =>
          r.id === roundId
            ? { ...r, messages: [...r.messages, message], currentMessage: '' }
            : r
        );
        return {
          tournament: { ...state.tournament, rounds }
        };
      });
    },

    updateCurrentMessage: (roundId, content) => {
      set(state => {
        if (!state.tournament) return state;
        const rounds = state.tournament.rounds.map(r =>
          r.id === roundId ? { ...r, currentMessage: content } : r
        );
        return {
          tournament: { ...state.tournament, rounds }
        };
      });
    },

    setCurrentSpeaker: (roundId, speakerId) => {
      set(state => {
        if (!state.tournament) return state;
        const rounds = state.tournament.rounds.map(r =>
          r.id === roundId ? { ...r, currentSpeaker: speakerId } : r
        );
        return {
          tournament: { ...state.tournament, rounds }
        };
      });
    },

    completeDebate: (roundId, votes) => {
      set(state => {
        if (!state.tournament) return state;
        
        const round = state.tournament.rounds.find(r => r.id === roundId);
        if (!round) return state;
        
        // 计算票数
        const voteCountA = votes.filter(v => v.votedForId === round.debaterA.id).length;
        const voteCountB = votes.filter(v => v.votedForId === round.debaterB.id).length;
        const winner = voteCountA > voteCountB ? round.debaterA : round.debaterB;
        
        const rounds = state.tournament.rounds.map(r =>
          r.id === roundId
            ? { ...r, votes, winner, status: 'completed' as const }
            : r
        );
        
        const newWinners = [...state.tournament.winners, winner];
        
        return {
          tournament: {
            ...state.tournament,
            rounds,
            winners: newWinners
          }
        };
      });
    },

    advanceToNextMatch: () => {
      set(state => {
        if (!state.tournament) return state;
        
        const { rounds, currentRoundIndex, winners, participants } = state.tournament;
        
        // 检查是否还有未完成的比赛
        const remainingMatches = rounds.slice(currentRoundIndex + 1);
        
        if (remainingMatches.length > 0) {
          // 继续下一场比赛
          return {
            tournament: {
              ...state.tournament,
              currentRoundIndex: currentRoundIndex + 1
            }
          };
        }
        
        // 当前轮次结束，检查是否决出冠军
        if (winners.length === 1) {
          return {
            tournament: {
              ...state.tournament,
              champion: winners[0],
              status: 'completed'
            }
          };
        }
        
        // 创建下一轮
        const nextRoundRounds = createDebateRounds(winners, state.tournament.topic);
        
        return {
          tournament: {
            ...state.tournament,
            rounds: [...rounds, ...nextRoundRounds],
            currentRoundIndex: currentRoundIndex + 1,
            winners: []
          }
        };
      });
    },

    resetTournament: () => {
      set({ tournament: null });
    },

    addToHistory: async (tournament) => {
      try {
        await fetch('/api/db/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tournament)
        });
      } catch (error) {
        console.error('Add to history error:', error);
      }
      
      set(state => ({
        history: [tournament, ...state.history].slice(0, 10)
      }));
    },

    clearHistory: async () => {
      try {
        await fetch('/api/db/history', { method: 'DELETE' });
      } catch (error) {
        console.error('Clear history error:', error);
      }
      set({ history: [] });
    },

    // Provider Actions
    addProvider: async (provider) => {
      try {
        const response = await fetch('/api/db/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...provider, id: generateId() })
        });
        const { provider: created } = await response.json();
        set(state => ({
          providers: [...state.providers, created]
        }));
      } catch (error) {
        console.error('Add provider error:', error);
      }
    },

    updateProvider: async (id, updates) => {
      try {
        const response = await fetch('/api/db/providers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...updates })
        });
        const { provider: updated } = await response.json();
        set(state => ({
          providers: state.providers.map(p => p.id === id ? updated : p)
        }));
      } catch (error) {
        console.error('Update provider error:', error);
      }
    },

    removeProvider: async (id) => {
      try {
        await fetch('/api/db/providers', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        set(state => ({
          providers: state.providers.filter(p => p.id !== id)
        }));
      } catch (error) {
        console.error('Remove provider error:', error);
      }
    },

    setProviders: (providers) => {
      set({ providers });
    },
    
    // 加载当前锦标赛
    loadTournament: async () => {
      try {
        const response = await fetch('/api/db/tournament');
        if (response.ok) {
          const { tournament } = await response.json();
          if (tournament) {
            set({ tournament });
          }
        }
      } catch (error) {
        console.error('Load tournament error:', error);
      }
    },
    
    // 加载历史记录
    loadHistory: async () => {
      try {
        const response = await fetch('/api/db/history');
        if (response.ok) {
          const { history } = await response.json();
          if (history) {
            set({ history });
          }
        }
      } catch (error) {
        console.error('Load history error:', error);
      }
    },
  })
);
