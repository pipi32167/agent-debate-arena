'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MessageSquare, Sparkles } from 'lucide-react';

interface TopicConfigProps {
  topic: string;
  description: string;
  onTopicChange: (topic: string) => void;
  onDescriptionChange: (description: string) => void;
}

const presetTopics = [
  {
    topic: '人工智能应该拥有法律人格',
    description: '随着 AI 能力的快速发展，我们应该赋予 AI 类似法人的法律地位吗？这将带来哪些权利和责任？'
  },
  {
    topic: '远程办公比现场办公更高效',
    description: '在疫情后时代，远程办公成为常态。但它在效率、协作和员工福祉方面真的优于传统办公模式吗？'
  },
  {
    topic: '社交媒体对民主制度利大于弊',
    description: '社交媒体改变了信息传播和政治参与的方式。它是促进了民主还是加剧了极化和虚假信息传播？'
  },
  {
    topic: '人类应该优先探索火星而非月球',
    description: '在有限的资源和时间内，我们应该优先建立月球基地作为跳板，还是直接瞄准火星殖民？'
  },
  {
    topic: '全民基本收入是解决不平等的有效方案',
    description: 'UBI（Universal Basic Income）能否有效缓解贫富差距和技术性失业问题？'
  },
  {
    topic: '基因编辑技术应该用于人类增强',
    description: 'CRISPR 等技术不仅能治疗疾病，还能增强人类能力。我们应该允许这种应用吗？'
  }
];

export function TopicConfig({
  topic,
  description,
  onTopicChange,
  onDescriptionChange
}: TopicConfigProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleSelectPreset = (preset: typeof presetTopics[0]) => {
    onTopicChange(preset.topic);
    onDescriptionChange(preset.description);
    setSelectedPreset(preset.topic);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          设置议题
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 预设议题 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            <Label className="text-sm font-medium">快速选择</Label>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {presetTopics.map((preset) => (
                <button
                  key={preset.topic}
                  onClick={() => handleSelectPreset(preset)}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-full text-sm
                    border transition-colors whitespace-nowrap
                    ${selectedPreset === preset.topic
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-input'
                    }
                  `}
                >
                  {preset.topic}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* 自定义议题 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">辩论议题</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="输入一个有趣的话题..."
              className="text-base"
            />
            {topic && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">字符数:</span>
                <Badge variant="outline" className="text-xs">
                  {topic.length}
                </Badge>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">议题描述</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="详细描述议题背景和争论焦点..."
              rows={4}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
