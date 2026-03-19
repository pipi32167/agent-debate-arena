'use client';

import { Tournament, DebateRound } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy, Users, GitBranch, CheckCircle2, Clock, Swords } from 'lucide-react';

interface TournamentBracketProps {
  tournament: Tournament;
}

export function TournamentBracket({ tournament }: TournamentBracketProps) {
  const roundsByLevel: DebateRound[][] = [];
  let processedMatches = 0;
  let matchesInLevel = Math.floor(tournament.participants.length / 2);

  while (processedMatches < tournament.rounds.length) {
    const count = Math.min(matchesInLevel, tournament.rounds.length - processedMatches);
    if (count <= 0) break;
    roundsByLevel.push(tournament.rounds.slice(processedMatches, processedMatches + count));
    processedMatches += count;
    matchesInLevel = Math.ceil(matchesInLevel / 2);
  }

  const getRoundName = (level: number, totalLevels: number) => {
    if (level === totalLevels - 1 && tournament.champion) return '决赛';
    if (level === totalLevels - 2) return '半决赛';
    if (level === totalLevels - 3) return '四分之一决赛';
    return `第 ${level + 1} 轮`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GitBranch className="h-5 w-5" />
          锦标赛进程
          {tournament.champion && (
            <Badge className="bg-yellow-500/20 text-yellow-600 ml-2">
              <Trophy className="h-3 w-3 mr-1" />
              已结束
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-6 min-w-max p-2">
            {roundsByLevel.map((levelRounds, levelIndex) => (
              <div key={levelIndex} className="flex flex-col gap-4">
                <div className="text-center font-medium text-sm text-muted-foreground">
                  {getRoundName(levelIndex, roundsByLevel.length)}
                </div>
                
                <div className="flex flex-col justify-around h-full gap-3">
                  {levelRounds.map((round, matchIndex) => (
                    <MatchCard
                      key={round.id}
                      round={round}
                      isCurrent={
                        tournament.currentRoundIndex === tournament.rounds.indexOf(round)
                      }
                      isLast={levelIndex === roundsByLevel.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* 冠军 */}
            {tournament.champion && (
              <div className="flex flex-col gap-4">
                <div className="text-center font-medium text-sm text-yellow-600">
                  冠军
                </div>
                <div className="flex items-center justify-center h-full">
                  <div className="p-4 rounded-lg border-2 border-yellow-500/50 bg-yellow-500/10 text-center">
                    <Avatar className="h-16 w-16 text-3xl mx-auto mb-2">
                      <AvatarFallback>{tournament.champion.avatar}</AvatarFallback>
                    </Avatar>
                    <p className="font-bold">{tournament.champion.name}</p>
                    <Badge className="mt-1 bg-yellow-500 text-white">
                      <Trophy className="h-3 w-3 mr-1" />
                      冠军
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* 统计信息 */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-4 gap-4 text-center">
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="参赛人数"
              value={tournament.participants.length}
            />
            <StatCard
              icon={<Swords className="h-4 w-4" />}
              label="总场次"
              value={tournament.rounds.length}
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="已完成"
              value={tournament.rounds.filter(r => r.status === 'completed').length}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="进行中"
              value={tournament.rounds.filter(r => r.status === 'ongoing' || r.status === 'voting').length}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({
  round,
  isCurrent,
  isLast
}: {
  round: DebateRound;
  isCurrent: boolean;
  isLast: boolean;
}) {
  const getStatusColor = () => {
    switch (round.status) {
      case 'completed':
        return round.winner 
          ? 'border-green-500/50 bg-green-500/5' 
          : 'border-muted';
      case 'ongoing':
      case 'voting':
        return 'border-primary/50 bg-primary/5 animate-pulse';
      default:
        return 'border-muted bg-muted/30';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={`
              w-48 p-3 rounded-lg border-2 transition-all cursor-pointer
              ${getStatusColor()}
              ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
            `}
          >
            {/* 辩手 A */}
            <div className={`
              flex items-center gap-2 p-1.5 rounded
              ${round.winner?.id === round.debaterA.id ? 'bg-yellow-500/20' : ''}
            `}>
              <Avatar className="h-6 w-6 text-xs">
                <AvatarFallback>{round.debaterA.avatar}</AvatarFallback>
              </Avatar>
              <span className={`
                text-sm truncate flex-1
                ${round.winner?.id === round.debaterA.id ? 'font-semibold' : ''}
              `}>
                {round.debaterA.name}
              </span>
              {round.winner?.id === round.debaterA.id && (
                <Trophy className="h-3 w-3 text-yellow-600" />
              )}
            </div>

            {/* VS */}
            <div className="flex items-center justify-center my-1">
              <span className="text-xs text-muted-foreground">VS</span>
            </div>

            {/* 辩手 B */}
            <div className={`
              flex items-center gap-2 p-1.5 rounded
              ${round.winner?.id === round.debaterB.id ? 'bg-yellow-500/20' : ''}
            `}>
              <Avatar className="h-6 w-6 text-xs">
                <AvatarFallback>{round.debaterB.avatar}</AvatarFallback>
              </Avatar>
              <span className={`
                text-sm truncate flex-1
                ${round.winner?.id === round.debaterB.id ? 'font-semibold' : ''}
              `}>
                {round.debaterB.name}
              </span>
              {round.winner?.id === round.debaterB.id && (
                <Trophy className="h-3 w-3 text-yellow-600" />
              )}
            </div>

            {/* 状态标签 */}
            <div className="mt-2 flex justify-center">
              <Badge variant="outline" className="text-xs">
                {round.status === 'pending' && '待开始'}
                {round.status === 'ongoing' && '进行中'}
                {round.status === 'voting' && '投票中'}
                {round.status === 'completed' && '已完成'}
              </Badge>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{round.debaterA.name} vs {round.debaterB.name}</p>
          <p className="text-xs text-muted-foreground">
            {round.messages.length} 轮发言 · {round.votes.length} 票
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StatCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
