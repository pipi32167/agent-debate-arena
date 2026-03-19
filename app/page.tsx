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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<DebateRound | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const {
    tournament,
    history,
    providers,
    participants,
    createTournament,
    chooseStances,
    startTournament,
    addMessage,
    updateCurrentMessage,
    setCurrentSpeaker,
    setRoundStatus,
    completeDebate,
    advanceToNextMatch,
    resetTournament,
    deleteTournament,
    addToHistory,
    setProviders,
    loadProviders,
    loadTournament,
    loadHistory,
    loadParticipants,
    setParticipants,
    clearParticipants
  } = useDebateStore();

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          loadProviders(),
          loadTournament(),
          loadHistory(),
          loadParticipants()
        ]);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadProviders, loadTournament, loadHistory, loadParticipants]);

  // 创建锦标赛
  const handleCreateTournament = () => {
    const isPowerOfTwo = (n: number) => n >= 4 && (n & (n - 1)) === 0;
    if (!isPowerOfTwo(participants.length)) {
      setError('参与者数量必须是 2 的次方数（4, 8, 16...）');
      return;
    }
    if (!topic.trim()) {
      setError('请输入辩论议题');
      return;
    }
    
    createTournament(topic, description, participants, 3);
    setError(null);
  };

  const handleStartChooseStance = async () => {
    if (!tournament) return;
    await chooseStances(tournament.topic, providers);
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
    setRoundStatus(currentRound.id, 'ongoing');
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
          messages: round.messages.slice(-8), // 保留最近8条消息作为上下文
          provider: speakerProvider
        })
      });

      if (!response.ok) throw new Error('AI 响应失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      let content = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        updateCurrentMessage(round.id, content);
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
    const currentTournament = useDebateStore.getState().tournament;
    if (!currentTournament) return;
    
    const currentRound = currentTournament.rounds[currentTournament.currentRoundIndex];
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
        }

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
    clearParticipants();
    setTopic('');
    setDescription('');
  };

  const handleExitTournament = async () => {
    await deleteTournament();
    clearParticipants();
    setTopic('');
    setDescription('');
    setIsAutoMode(false);
  };

  const handleAutoRun = async () => {
    if (!tournament) return;
    
    setIsAutoMode(true);
    startTournament();
    
    try {
      while (true) {
        const currentTournament = useDebateStore.getState().tournament;
        if (!currentTournament || currentTournament.status === 'completed') break;
        
        const currentRound = currentTournament.rounds[currentTournament.currentRoundIndex];
        if (!currentRound) {
          advanceToNextMatch();
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }
        
        if (currentRound.status === 'completed') {
          advanceToNextMatch();
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }
        
        setRoundStatus(currentRound.id, 'ongoing');
        setIsDebating(true);
        await runDebate(currentRound);
        setIsDebating(false);
        
        setIsVoting(true);
        await handleStartVoting();
        setIsVoting(false);
        
        advanceToNextMatch();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '全自动模式运行错误');
    } finally {
      setIsAutoMode(false);
      setIsDebating(false);
      setIsVoting(false);
    }
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
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center gap-1 text-sm text-muted-foreground"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-4 w-4" />
                <span>{history.length} 场历史</span>
              </Button>
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
                      {participants.length >= 4 && (participants.length & (participants.length - 1)) === 0 ? (
                        <Badge className="bg-green-500/20 text-green-600">
                          <Sparkles className="h-3 w-3 mr-1" />
                          符合要求
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          需 2 的次方数
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {participants.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <ScrollArea className="h-[120px]">
                        <div className="flex flex-wrap gap-2">
                          {participants.map((p) => (
                            <Badge key={p.id} variant="outline" className="text-sm">
                              {p.avatar} {p.name}
                            </Badge>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                  
                  <Separator className="my-4" />
                  
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleCreateTournament}
                    disabled={participants.length < 4 || (participants.length & (participants.length - 1)) !== 0 || !topic.trim()}
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
        ) : tournament.status === 'choosing_stance' ? (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">选择阵营</CardTitle>
                <p className="text-muted-foreground">
                  AI 辩手正在根据自己的角色设定选择立场...
                </p>
              </CardHeader>
              <CardContent>
                {tournament.stanceChoices && tournament.stanceChoices.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h3 className="font-semibold text-green-600">支持方</h3>
                        {tournament.stanceChoices
                          .filter(c => c.stance === 'for')
                          .map(choice => (
                            <div key={choice.agentId} className="border rounded-lg p-3">
                              <div className="font-medium">{choice.agentName}</div>
                              <p className="text-sm text-muted-foreground mt-1">{choice.reason}</p>
                            </div>
                          ))}
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-red-600">反对方</h3>
                        {tournament.stanceChoices
                          .filter(c => c.stance === 'against')
                          .map(choice => (
                            <div key={choice.agentId} className="border rounded-lg p-3">
                              <div className="font-medium">{choice.agentName}</div>
                              <p className="text-sm text-muted-foreground mt-1">{choice.reason}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                    <Button className="w-full" size="lg" onClick={startTournament}>
                      <Play className="h-4 w-4 mr-2" />
                      开始辩论
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Button onClick={handleStartChooseStance} size="lg">
                      <Sparkles className="h-4 w-4 mr-2" />
                      让 AI 选择阵营
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : tournament.status === 'completed' && tournament.champion ? (
          // 冠军展示界面
          <div className="max-w-2xl mx-auto">
            <WinnerDisplay 
              tournament={tournament} 
              onRestart={handleRestart}
              onViewDetail={setSelectedRound}
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
                
                {tournament.rounds.filter(r => r.status === 'completed').length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">历史比赛</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {tournament.rounds.filter(r => r.status === 'completed').map((round) => (
                            <div 
                              key={round.id} 
                              className="border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => setSelectedRound(round)}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{round.debaterA.avatar}</span>
                                  <span className="font-medium">{round.debaterA.name}</span>
                                  <span className="text-muted-foreground">VS</span>
                                  <span className="text-lg">{round.debaterB.avatar}</span>
                                  <span className="font-medium">{round.debaterB.name}</span>
                                </div>
                                {round.winner && (
                                  <Badge className="bg-yellow-500/20 text-yellow-600">
                                    <Trophy className="h-3 w-3 mr-1" />
                                    {round.winner.name} 胜
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-muted-foreground mb-2">
                                {round.messages.length} 条发言 · {round.votes.length} 票
                              </div>
                              
                              {round.votes.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium">投票结果</div>
                                  <div className="flex gap-4">
                                    <div className="flex items-center gap-1">
                                      <span>{round.debaterA.avatar}</span>
                                      <span>{round.votes.filter(v => v.votedForId === round.debaterA.id).length} 票</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>{round.debaterB.avatar}</span>
                                      <span>{round.votes.filter(v => v.votedForId === round.debaterB.id).length} 票</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {tournament.rounds[tournament.currentRoundIndex] && (
                  <VotingPanel
                    round={tournament.rounds[tournament.currentRoundIndex]}
                    isVoting={isVoting}
                    onStartVoting={handleStartVoting}
                    hideStartButton={isAutoMode}
                  />
                )}

                {/* 控制面板 */}
                <Card>
                  <CardContent className="py-4 space-y-3">
                    <h4 className="font-medium">比赛控制</h4>
                    
                    {tournament.status === 'configuring' && !isAutoMode && (
                      <Button className="w-full" onClick={handleAutoRun}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        全自动模式
                      </Button>
                    )}
                    
                    {isAutoMode && (
                      <Button className="w-full" variant="secondary" disabled>
                        <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                        自动运行中...
                      </Button>
                    )}
                    
                    {tournament.rounds[tournament.currentRoundIndex]?.status === 'completed' && !isAutoMode && (
                      <Button className="w-full" onClick={handleNextMatch}>
                        <ChevronRight className="h-4 w-4 mr-2" />
                        {tournament.winners.length === 1 && tournament.rounds.filter(r => r.status === 'completed').length === tournament.rounds.length
                          ? '查看冠军'
                          : '下一场比赛'
                        }
                      </Button>
                    )}
                    
                    <Button variant="outline" className="w-full" onClick={handleRestart} disabled={isAutoMode}>
                      重新开始
                    </Button>
                    
                    <Button variant="destructive" className="w-full" onClick={handleExitTournament}>
                      退出当前辩论
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      <Dialog open={!!selectedRound} onOpenChange={() => setSelectedRound(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              比赛详情 - {selectedRound?.debaterA.name} VS {selectedRound?.debaterB.name}
            </DialogTitle>
          </DialogHeader>
          {selectedRound && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <Avatar className="h-16 w-16 text-3xl mx-auto mb-2">
                    <AvatarFallback>{selectedRound.debaterA.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="font-semibold">{selectedRound.debaterA.name}</div>
                  <Badge variant="outline" className="mt-1">支持</Badge>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
                <div className="text-center">
                  <Avatar className="h-16 w-16 text-3xl mx-auto mb-2">
                    <AvatarFallback>{selectedRound.debaterB.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="font-semibold">{selectedRound.debaterB.name}</div>
                  <Badge variant="outline" className="mt-1">反对</Badge>
                </div>
              </div>

              {selectedRound.winner && (
                <div className="text-center">
                  <Badge className="bg-yellow-500/20 text-yellow-600 text-lg px-4 py-2">
                    <Trophy className="h-4 w-4 mr-2" />
                    {selectedRound.winner.name} 获胜
                  </Badge>
                </div>
              )}

              <Separator />

              <div>
                <h4 className="font-medium mb-3">辩论记录 ({selectedRound.messages.length} 条)</h4>
                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  <div className="space-y-4">
                    {selectedRound.messages.map((message) => (
                      <div 
                        key={message.id} 
                        className={`flex gap-3 ${message.speakerId === selectedRound.debaterA.id ? 'flex-row' : 'flex-row-reverse'}`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback>
                            {message.speakerId === selectedRound.debaterA.id 
                              ? selectedRound.debaterA.avatar 
                              : selectedRound.debaterB.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex-1 ${message.speakerId === selectedRound.debaterA.id ? 'text-left' : 'text-right'}`}>
                          <div className={`inline-block max-w-[80%] rounded-lg p-3 ${
                            message.speakerId === selectedRound.debaterA.id 
                              ? 'bg-muted' 
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            <div className="text-xs font-medium opacity-70 mb-1">
                              {message.speakerName}
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {selectedRound.votes.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">投票详情 ({selectedRound.votes.length} 票)</h4>
                    <div className="space-y-3">
                      {selectedRound.votes.map((vote) => (
                        <div key={vote.judgeId} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>{vote.judgeName[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{vote.judgeName}</span>
                            </div>
                            <Badge variant={vote.votedForId === selectedRound.debaterA.id ? "default" : "secondary"}>
                              投给 {vote.votedForId === selectedRound.debaterA.id ? selectedRound.debaterA.name : selectedRound.debaterB.name}
                            </Badge>
                          </div>
                          {vote.reason && (
                            <p className="text-sm text-muted-foreground">"{vote.reason}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>历史比赛</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pt-4">
              {history.map((t) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{t.topic}</CardTitle>
                    {t.champion && (
                      <Badge className="w-fit bg-yellow-500/20 text-yellow-600">
                        <Trophy className="h-3 w-3 mr-1" />
                        冠军: {t.champion.name}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground mb-3">
                      {t.participants.length} 位辩手 · {t.rounds.length} 场比赛
                    </div>
                    <div className="space-y-2">
                      {t.rounds.filter(r => r.status === 'completed').map((round) => (
                        <div 
                          key={round.id}
                          className="flex items-center justify-between p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted"
                          onClick={() => {
                            setSelectedRound(round);
                            setShowHistory(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span>{round.debaterA.avatar}</span>
                            <span className="text-sm">{round.debaterA.name}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span>{round.debaterB.avatar}</span>
                            <span className="text-sm">{round.debaterB.name}</span>
                          </div>
                          {round.winner && (
                            <Badge variant="outline" className="text-xs">
                              {round.winner.name} 胜
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
