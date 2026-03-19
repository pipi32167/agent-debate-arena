'use client';

import { Tournament } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Crown, 
  Star, 
  Target,
  Zap,
  Award,
  RotateCcw,
  Share2,
  Sparkles
} from 'lucide-react';

interface WinnerDisplayProps {
  tournament: Tournament;
  onRestart: () => void;
}

export function WinnerDisplay({ tournament, onRestart }: WinnerDisplayProps) {
  if (!tournament.champion) return null;

  const champion = tournament.champion;
  
  // 计算统计
  const totalMatches = tournament.rounds.filter(
    r => r.winner?.id === champion.id
  ).length;
  
  const totalVotes = tournament.rounds
    .filter(r => r.winner?.id === champion.id)
    .reduce((acc, r) => acc + r.votes.filter(v => v.votedForId === champion.id).length, 0);
  
  const totalVotesAgainst = tournament.rounds
    .filter(r => r.winner?.id === champion.id)
    .reduce((acc, r) => acc + r.votes.filter(v => v.votedForId !== champion.id).length, 0);

  return (
    <Card className="w-full border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-transparent">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
            <Avatar className="h-24 w-24 text-5xl relative ring-4 ring-yellow-500/50 ring-offset-4 ring-offset-background">
              <AvatarFallback>{champion.avatar}</AvatarFallback>
            </Avatar>
            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1.5">
              <Crown className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
        
        <CardTitle className="text-3xl font-bold">
          {champion.name}
        </CardTitle>
        <p className="text-muted-foreground">{champion.persona}</p>
        
        <Badge className="mx-auto mt-2 bg-yellow-500 text-white text-base px-4 py-1">
          <Trophy className="h-4 w-4 mr-2" />
          辩论冠军
        </Badge>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="参赛场次"
            value={totalMatches}
          />
          <StatCard
            icon={<Star className="h-4 w-4" />}
            label="获得票数"
            value={totalVotes}
          />
          <StatCard
            icon={<Zap className="h-4 w-4" />}
            label="击败对手"
            value={totalMatches}
          />
          <StatCard
            icon={<Award className="h-4 w-4" />}
            label="胜率"
            value={100}
            suffix="%"
          />
        </div>

        <Separator />

        {/* 晋级之路 */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            晋级之路
          </h3>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {tournament.rounds
                .filter(r => r.winner?.id === champion.id)
                .map((round, index) => (
                  <div 
                    key={round.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">vs {round.debaterA.id === champion.id ? round.debaterB.name : round.debaterA.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {round.votes.filter(v => v.votedForId === champion.id).length} - {round.votes.filter(v => v.votedForId !== champion.id).length}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {round.messages.length} 轮发言 · {round.votes.length} 位评委
                      </p>
                    </div>

                    <Trophy className="h-4 w-4 text-yellow-500" />
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center pt-4">
          <Button onClick={onRestart} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            开始新比赛
          </Button>
          <Button variant="secondary" className="gap-2" onClick={() => {
            const data = JSON.stringify(tournament, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `debate-tournament-${tournament.id}.json`;
            a.click();
          }}>
            <Share2 className="h-4 w-4" />
            导出结果
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix = ''
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}{suffix}</span>
    </div>
  );
}
