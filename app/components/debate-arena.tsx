'use client';

import { useEffect, useRef, useState } from 'react';
import { AIAgent, DebateRound, DebateMessage } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Swords, 
  User, 
  Clock, 
  MessageCircle, 
  Play, 
  Pause,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface DebateArenaProps {
  round: DebateRound;
  isActive: boolean;
  onStart: () => void;
  onPause: () => void;
  onComplete: () => void;
}

export function DebateArena({ round, isActive, onStart, onPause, onComplete }: DebateArenaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    };
    
    requestAnimationFrame(scrollToBottom);
  }, [round.messages.length, round.currentMessage]);

  const getMessageTypeLabel = (type: DebateMessage['type']) => {
    const labels: Record<DebateMessage['type'], string> = {
      opening: '开场陈述',
      rebuttal: '反驳',
      cross: '自由辩论',
      closing: '总结陈词'
    };
    return labels[type];
  };

  const getMessageTypeColor = (type: DebateMessage['type']) => {
    const colors: Record<DebateMessage['type'], string> = {
      opening: 'bg-blue-500/10 text-blue-500',
      rebuttal: 'bg-orange-500/10 text-orange-500',
      cross: 'bg-purple-500/10 text-purple-500',
      closing: 'bg-green-500/10 text-green-500'
    };
    return colors[type];
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5" />
            辩论竞技场
            <Badge variant="outline">第 {round.roundNumber} 场</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {round.status === 'pending' && (
              <Button size="sm" onClick={onStart}>
                <Play className="h-4 w-4 mr-1" />
                开始
              </Button>
            )}
            {round.status === 'ongoing' && (
              <Button size="sm" variant="outline" onClick={onPause}>
                <Pause className="h-4 w-4 mr-1" />
                暂停
              </Button>
            )}
            {round.status === 'voting' && (
              <Button size="sm" variant="secondary" onClick={onComplete}>
                <Sparkles className="h-4 w-4 mr-1" />
                查看结果
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 辩手信息 */}
        <div className="flex items-center justify-between">
          <DebateParticipant 
            agent={round.debaterA} 
            isActive={round.currentSpeaker === round.debaterA.id}
            stance="支持"
          />
          
          <div className="flex flex-col items-center gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1">VS</Badge>
            {round.status === 'completed' && round.winner && (
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50">
                <Sparkles className="h-3 w-3 mr-1" />
                {round.winner.name} 胜
              </Badge>
            )}
          </div>
          
          <DebateParticipant 
            agent={round.debaterB} 
            isActive={round.currentSpeaker === round.debaterB.id}
            stance="反对"
          />
        </div>

        <Separator />

        {/* 评委信息 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>评委团 ({round.judges.length} 人)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {round.judges.map((judge) => (
              <TooltipProvider key={judge.id}>
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-8 w-8 cursor-help">
                      <AvatarFallback className="text-sm">{judge.avatar}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{judge.name}</p>
                    <p className="text-xs text-muted-foreground">{judge.persona}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        <Separator />

        {/* 辩论记录 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>辩论记录</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {round.messages.length} 轮发言
            </Badge>
          </div>

          <ScrollArea className="h-[400px] border rounded-lg p-4" ref={scrollRef}>
            <div className="space-y-4">
              {round.messages.length === 0 && round.status === 'pending' && (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2 opacity-50" />
                  <p>等待辩论开始...</p>
                </div>
              )}

              {round.messages.map((message, index) => (
                <DebateMessageBubble
                  key={message.id}
                  message={message}
                  isDebaterA={message.speakerId === round.debaterA.id}
                  debaterA={round.debaterA}
                  debaterB={round.debaterB}
                  getMessageTypeLabel={getMessageTypeLabel}
                  getMessageTypeColor={getMessageTypeColor}
                />
              ))}

              {/* 流式消息 */}
              {round.currentMessage && round.currentSpeaker && (
                <StreamingMessage
                  content={round.currentMessage}
                  speaker={round.currentSpeaker === round.debaterA.id ? round.debaterA : round.debaterB}
                  isDebaterA={round.currentSpeaker === round.debaterA.id}
                />
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function DebateParticipant({ 
  agent, 
  isActive, 
  stance 
}: { 
  agent: AIAgent; 
  isActive: boolean;
  stance: string;
}) {
  return (
    <div className={`
      flex items-center gap-3 p-3 rounded-lg transition-colors
      ${isActive ? 'bg-primary/10 ring-1 ring-primary' : 'bg-muted/50'}
    `}>
      <Avatar className="h-14 w-14 text-2xl">
        <AvatarFallback>{agent.avatar}</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{agent.name}</span>
          {isActive && (
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-muted-foreground max-w-[150px] truncate">
          {agent.persona}
        </p>
        <Badge variant="outline" className="mt-1 text-xs">
          {stance}
        </Badge>
      </div>
    </div>
  );
}

function DebateMessageBubble({
  message,
  isDebaterA,
  debaterA,
  debaterB,
  getMessageTypeLabel,
  getMessageTypeColor
}: {
  message: DebateMessage;
  isDebaterA: boolean;
  debaterA: AIAgent;
  debaterB: AIAgent;
  getMessageTypeLabel: (type: DebateMessage['type']) => string;
  getMessageTypeColor: (type: DebateMessage['type']) => string;
}) {
  const speaker = isDebaterA ? debaterA : debaterB;

  return (
    <div className={`flex gap-3 ${isDebaterA ? 'flex-row' : 'flex-row-reverse'}`}>
      <Avatar className="h-10 w-10 text-lg shrink-0">
        <AvatarFallback>{speaker.avatar}</AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isDebaterA ? 'text-left' : 'text-right'}`}>
        <div className={`
          inline-block max-w-[80%] rounded-lg p-3
          ${isDebaterA ? 'bg-muted text-left' : 'bg-primary text-primary-foreground text-left'}
        `}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium opacity-70">{speaker.name}</span>
            <Badge className={`text-xs ${getMessageTypeColor(message.type)}`}>
              {getMessageTypeLabel(message.type)}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function StreamingMessage({
  content,
  speaker,
  isDebaterA
}: {
  content: string;
  speaker: AIAgent;
  isDebaterA: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isDebaterA ? 'flex-row' : 'flex-row-reverse'}`}>
      <Avatar className="h-10 w-10 text-lg shrink-0">
        <AvatarFallback>{speaker.avatar}</AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isDebaterA ? 'text-left' : 'text-right'}`}>
        <div className={`
          inline-block max-w-[80%] rounded-lg p-3
          ${isDebaterA ? 'bg-muted' : 'bg-primary text-primary-foreground'}
        `}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium opacity-70">{speaker.name}</span>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <p className="text-sm leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  );
}
