'use client';

import { useState } from 'react';
import { DebateRound, Vote, AIAgent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Scale, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  Sparkles,
  Loader2
} from 'lucide-react';

interface VotingPanelProps {
  round: DebateRound;
  isVoting: boolean;
  onStartVoting: () => void;
}

export function VotingPanel({ round, isVoting, onStartVoting }: VotingPanelProps) {
  const [showResults, setShowResults] = useState(false);

  const voteCountA = round.votes.filter(v => v.votedForId === round.debaterA.id).length;
  const voteCountB = round.votes.filter(v => v.votedForId === round.debaterB.id).length;
  const totalVotes = round.votes.length;

  const getVotePercentage = (count: number) => {
    return totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Scale className="h-5 w-5" />
          评委投票
          {round.status === 'voting' && isVoting && (
            <Badge variant="secondary" className="animate-pulse">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              进行中
            </Badge>
          )}
          {round.status === 'completed' && (
            <Badge className="bg-green-500/20 text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              已完成
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 投票按钮 */}
        {round.status === 'ongoing' && !isVoting && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">辩论已结束，准备开始评委投票</p>
            <Button onClick={onStartVoting} size="lg">
              <Scale className="h-4 w-4 mr-2" />
              开始投票
            </Button>
          </div>
        )}

        {/* 投票进度 */}
        {(isVoting || round.status === 'completed') && (
          <>
            {/* 投票统计 */}
            <div className="grid grid-cols-2 gap-4">
              <VoteResultCard
                agent={round.debaterA}
                voteCount={voteCountA}
                percentage={getVotePercentage(voteCountA)}
                isWinner={round.winner?.id === round.debaterA.id}
                totalVotes={totalVotes}
              />
              <VoteResultCard
                agent={round.debaterB}
                voteCount={voteCountB}
                percentage={getVotePercentage(voteCountB)}
                isWinner={round.winner?.id === round.debaterB.id}
                totalVotes={totalVotes}
              />
            </div>

            {/* 详细投票记录 */}
            {round.votes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">投票详情</span>
                    <Badge variant="outline">{round.votes.length} / {round.judges.length}</Badge>
                  </div>
                  
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {round.votes.map((vote, index) => (
                        <VoteCard 
                          key={vote.judgeId} 
                          vote={vote} 
                          index={index}
                          debaterA={round.debaterA}
                          debaterB={round.debaterB}
                        />
                      ))}
                      {isVoting && round.votes.length < round.judges.length && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            等待 {round.judges.length - round.votes.length} 位评委投票...
                          </span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VoteResultCard({
  agent,
  voteCount,
  percentage,
  isWinner,
  totalVotes
}: {
  agent: AIAgent;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
  totalVotes: number;
}) {
  return (
    <div className={`
      relative p-4 rounded-lg border-2 transition-all
      ${isWinner 
        ? 'border-yellow-500/50 bg-yellow-500/10' 
        : 'border-muted bg-muted/30'
      }
    `}>
      {isWinner && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-yellow-500 text-white">
            <Trophy className="h-3 w-3 mr-1" />
            胜
          </Badge>
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10 text-lg">
          <AvatarFallback>{agent.avatar}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{agent.name}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[120px]">
            {agent.persona}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">得票数</span>
          <span className="font-semibold">{voteCount} 票</span>
        </div>
        
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isWinner ? 'bg-yellow-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <p className="text-xs text-muted-foreground text-right">
          {percentage}% ({voteCount}/{totalVotes})
        </p>
      </div>
    </div>
  );
}

function VoteCard({
  vote,
  index,
  debaterA,
  debaterB
}: {
  vote: Vote;
  index: number;
  debaterA: AIAgent;
  debaterB: AIAgent;
}) {
  const votedFor = vote.votedForId === debaterA.id ? debaterA : debaterB;
  const isCorrectVote = vote.votedForId === votedFor.id;

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-medium shrink-0">
        {index + 1}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="h-6 w-6 text-xs">
            <AvatarFallback>{vote.judgeName.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{vote.judgeName}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant={vote.votedForId === debaterA.id ? "default" : "secondary"}
                  className="text-xs cursor-help"
                >
                  投给 {votedFor.name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>评委选择了 {votedFor.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {vote.reason && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            "{vote.reason}"
          </p>
        )}
      </div>
    </div>
  );
}
