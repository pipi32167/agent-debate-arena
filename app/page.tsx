'use client';

import { useState, useCallback, useEffect } from 'react';
import { AIAgent, DebateMessage, Vote, DebateRound, ProviderConfig } from '@/types';
import { useDebateStore } from '@/stores/debate-store';
import { AIConfig } from './components/ai-config';
import { TopicConfig } from './components/topic-config';
import { ProviderConfigPanel } from './components/provider-config';
import { DebateArena } from './components/debate-arena';
import { VotingPanel } from './components/voting-panel';
import { TournamentBracket } from './components/tournament-bracket';
import { WinnerDisplay } from './components/winner-display';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Users, 
  MessageSquare, 
  Play, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  History
} from 'lucide-react';

export default function Home() {
  const [participants, setParticipants] = useState<AIAgent[]>([]);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    tournament,
    history,
    providers,
    createTournament,
    startTournament,
    addMessage,
    updateCurrentMessage,
    setCurrentSpeaker,
    completeDebate,
    advanceToNextMatch,
    resetTournament,
    addToHistory,
    setProviders,
    loadProviders,
    loadTournament,
    loadHistory
  } = useDebateStore();

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadProviders(),
          loadTournament(),
          loadHistory()
        ]);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadProviders, loadTournament, loadHistory]);

  // 创建锦标赛
  const handleCreateTournament = () => {
    if (participants.length < 5 || participants.length % 2 === 0) {
      setError('参与者数量必须 >= 5 且为奇数');
      return;
    }
    if (!topic.trim()) {
      setError('请输入辩论议题');
      return;
    }
    
    // 随机分配立场
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const withStance = shuffled.map((p, i) => ({
      ...p,
      stance: (i % 2 === 0 ? 'for' : 'against') as 'for' | 'against'
    }));
    
    createTournament(topic, description, withStance, 3);
    setError(null);
  };

  // 获取 provider 配置（用于 API 调用）
  const getProviderConfig = (providerId: string): ProviderConfig | undefined => {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return undefined;
    
    // 对于内置 provider，使用环境变量中的 API Key
    if (provider.isBuiltIn) {
      return {
        ...provider,
        apiKey: '' // 服务器端会从环境变量读取
      };
    }
    
    return provider;
  };

  // 开始辩论
  const handleStartDebate = async () => {
    if (!tournament) return;
    
    const currentRound = tournament.rounds[tournament.currentRoundIndex];
    if (!currentRound) return;

    startTournament();
    setIsDebating(true);

    try {
      await runDebate(currentRound);
    } catch (err) {
      setError(err instanceof Error ? err.message : '辩论过程中出现错误');
    } finally {
      setIsDebating(false);
    }
  };

  // 运行辩论流程
  const runDebate = async (round: DebateRound) => {
    const debateSteps: Array<{
      speakerId: string;
      opponentId: string;
      type: DebateMessage['type'];
      round: number;
    }> = [];

    // 构建辩论流程: 开场 -> 反驳 -> 自由辩论 -> 总结
    for (let i = 1; i <= 2; i++) {
      debateSteps.push(
        { speakerId: round.debaterA.id, opponentId: round.debaterB.id, type: 'opening', round: i },
        { speakerId: round.debaterB.id, opponentId: round.debaterA.id, type: 'opening', round: i }
      );
    }
    
    for (let i = 1; i <= 2; i++) {
      debateSteps.push(
        { speakerId: round.debaterA.id, opponentId: round.debaterB.id, type: 'rebuttal', round: i },
        { speakerId: round.debaterB.id, opponentId: round.debaterA.id, type: 'rebuttal', round: i }
      );
    }

    for (let i = 1; i <= 2; i++) {
      debateSteps.push(
        { speakerId: round.debaterA.id, opponentId: round.debaterB.id, type: 'cross', round: i },
        { speakerId: round.debaterB.id, opponentId: round.debaterA.id, type: 'cross', round: i }
      );
    }

    debateSteps.push(
      { speakerId: round.debaterA.id, opponentId: round.debaterB.id, type: 'closing', round: 1 },
      { speakerId: round.debaterB.id, opponentId: round.debaterA.id, type: 'closing', round: 1 }
    );

    for (const step of debateSteps) {
      const speaker = step.speakerId === round.debaterA.id ? round.debaterA : round.debaterB;
      const opponent = step.opponentId === round.debaterA.id ? round.debaterA : round.debaterB;
      const speakerProvider = getProviderConfig(speaker.providerId);
      
      setCurrentSpeaker(round.id, speaker.id);
      updateCurrentMessage(round.id, '');

      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'debate',
          agent: speaker,
          opponent,
          topic: round.topic,
          stance: speaker.stance,
          round: step.round,
          messageType: step.type,
          messages: round.messages.slice(-4), // 只保留最近4条消息作为上下文
          provider: speakerProvider
        })
      });

      if (!response.ok) throw new Error('AI 响应失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                content += parsed.choices[0].delta.content;
                updateCurrentMessage(round.id, content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      const message: DebateMessage = {
        id: Math.random().toString(36).substring(2),
        speakerId: speaker.id,
        speakerName: speaker.name,
        content,
        timestamp: Date.now(),
        round: step.round,
        type: step.type
      };

      addMessage(round.id, message);
      setCurrentSpeaker(round.id, null);
      
      // 短暂延迟，让用户能看清
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // 开始投票
  const handleStartVoting = async () => {
    if (!tournament) return;
    
    const currentRound = tournament.rounds[tournament.currentRoundIndex];
    if (!currentRound) return;

    setIsVoting(true);
    const votes: Vote[] = [];

    try {
      for (const judge of currentRound.judges) {
        const judgeProvider = getProviderConfig(judge.providerId);
        
        const response = await fetch('/api/debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'judge',
            judge,
            debaterA: currentRound.debaterA,
            debaterB: currentRound.debaterB,
            topic: currentRound.topic,
            debateMessages: currentRound.messages,
            provider: judgeProvider
          })
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.vote) {
          votes.push(data.vote);
          // 更新状态显示实时投票
          completeDebate(currentRound.id, [...votes]);
        }

        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      completeDebate(currentRound.id, votes);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投票过程中出现错误');
    } finally {
      setIsVoting(false);
    }
  };

  // 进入下一场比赛
  const handleNextMatch = () => {
    advanceToNextMatch();
  };

  // 重新开始
  const handleRestart = () => {
    if (tournament) {
      addToHistory(tournament);
    }
    resetTournament();
    setParticipants([]);
    setTopic('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="text-xl font-bold">AI 辩论投票群</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {tournament && (
              <Badge variant="outline">
                {tournament.status === 'configuring' && '配置中'}
                {tournament.status === 'ongoing' && '进行中'}
                {tournament.status === 'completed' && '已完成'}
              </Badge>
            )}
            
            {history.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <History className="h-4 w-4" />
                <span>{history.length} 场历史</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-2 py-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-auto"
                onClick={() => setError(null)}
              >
                关闭
              </Button>
            </CardContent>
          </Card>
        )}

        {!tournament ? (
          // 配置界面
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <TopicConfig
                topic={topic}
                description={description}
                onTopicChange={setTopic}
                onDescriptionChange={setDescription}
              />
              
              <ProviderConfigPanel
                providers={providers}
                onProvidersChange={setProviders}
              />
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span className="font-medium">参与人数</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{participants.length}</span>
                      {participants.length >= 5 && participants.length % 2 === 1 ? (
                        <Badge className="bg-green-500/20 text-green-600">
                          <Sparkles className="h-3 w-3 mr-1" />
                          符合要求
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          需 {'>'}= 5 且为奇数
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCreateTournament}
                    disabled={participants.length < 5 || participants.length % 2 === 0 || !topic.trim()}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    开始锦标赛
                  </Button>
                </CardContent>
              </Card>
            </div>

            <AIConfig
              participants={participants}
              providers={providers}
              onParticipantsChange={setParticipants}
            />
          </div>
        ) : tournament.status === 'completed' && tournament.champion ? (
          // 冠军展示界面
          <div className="max-w-2xl mx-auto">
            <WinnerDisplay 
              tournament={tournament} 
              onRestart={handleRestart}
            />
          </div>
        ) : (
          // 辩论界面
          <div className="space-y-6">
            {/* 当前议题 */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <MessageSquare className="h-4 w-4" />
                  当前议题
                </div>
                <h2 className="text-lg font-semibold">{tournament.topic}</h2>
                {tournament.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {tournament.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 主要区域 */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {tournament.rounds[tournament.currentRoundIndex] && (
                  <DebateArena
                    round={tournament.rounds[tournament.currentRoundIndex]}
                    isActive={isDebating}
                    onStart={handleStartDebate}
                    onPause={() => setIsDebating(false)}
                    onComplete={handleNextMatch}
                  />
                )}

                <TournamentBracket tournament={tournament} />
              </div>

              <div className="space-y-6">
                {tournament.rounds[tournament.currentRoundIndex] && (
                  <VotingPanel
                    round={tournament.rounds[tournament.currentRoundIndex]}
                    isVoting={isVoting}
                    onStartVoting={handleStartVoting}
                  />
                )}

                {/* 控制面板 */}
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <h4 className="font-medium">比赛控制</h4>
                    
                    {tournament.rounds[tournament.currentRoundIndex]?.status === 'completed' && (
                      <Button className="w-full" onClick={handleNextMatch}>
                        <ChevronRight className="h-4 w-4 mr-2" />
                        {tournament.winners.length === 1 && tournament.rounds.filter(r => r.status === 'completed').length === tournament.rounds.length
                          ? '查看冠军'
                          : '下一场比赛'
                        }
                      </Button>
                    )}
                    
                    <Button variant="outline" className="w-full" onClick={handleRestart}>
                      重新开始
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
