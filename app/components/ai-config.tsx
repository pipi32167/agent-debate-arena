'use client';

import { useState, useMemo } from 'react';
import { AIAgent, PresetPersona, ProviderConfig } from '@/types';
import { presetPersonas } from '@/lib/presets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, User, Bot, Settings, Server } from 'lucide-react';

interface AIConfigProps {
  participants: AIAgent[];
  providers: ProviderConfig[];
  onParticipantsChange: (participants: AIAgent[]) => void;
}

export function AIConfig({ participants, providers, onParticipantsChange }: AIConfigProps) {
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  // 获取默认 provider 和 model
  const getDefaultProviderAndModel = () => {
    const defaultProvider = providers.find(p => p.id === 'openai') || providers[0];
    const defaultModel = defaultProvider?.models.find(m => m.enabled) || defaultProvider?.models[0];
    return {
      providerId: defaultProvider?.id || 'openai',
      modelId: defaultModel?.id || 'gpt-4o'
    };
  };

  const handleAddPreset = (preset: PresetPersona) => {
    const { providerId, modelId } = getDefaultProviderAndModel();
    const newAgent: AIAgent = {
      id: generateId(),
      name: preset.name,
      avatar: preset.avatar,
      providerId,
      modelId,
      persona: preset.persona,
      systemPrompt: preset.systemPrompt,
      stance: 'for'
    };
    onParticipantsChange([...participants, newAgent]);
  };

  const handleAddCustom = () => {
    const { providerId, modelId } = getDefaultProviderAndModel();
    const newAgent: AIAgent = {
      id: generateId(),
      name: `AI ${participants.length + 1}`,
      avatar: '🤖',
      providerId,
      modelId,
      persona: '自定义 AI',
      systemPrompt: '你是一个有独特见解的 AI。',
      stance: 'for'
    };
    setEditingAgent(newAgent);
    setIsDialogOpen(true);
  };

  const handleSaveAgent = () => {
    if (!editingAgent) return;
    
    const existing = participants.find(p => p.id === editingAgent.id);
    if (existing) {
      onParticipantsChange(participants.map(p => p.id === editingAgent.id ? editingAgent : p));
    } else {
      onParticipantsChange([...participants, editingAgent]);
    }
    setIsDialogOpen(false);
    setEditingAgent(null);
  };

  const handleRemoveAgent = (id: string) => {
    onParticipantsChange(participants.filter(p => p.id !== id));
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent({ ...agent });
    setIsDialogOpen(true);
  };

  // 获取当前编辑 agent 对应的 provider
  const currentProvider = useMemo(() => {
    if (!editingAgent) return null;
    return providers.find(p => p.id === editingAgent.providerId);
  }, [editingAgent, providers]);

  // 获取当前 provider 可用的模型
  const availableModels = useMemo(() => {
    if (!currentProvider) return [];
    return currentProvider.models.filter(m => m.enabled);
  }, [currentProvider]);

  // 获取 provider 显示名称
  const getProviderName = (providerId: string) => {
    return providers.find(p => p.id === providerId)?.name || providerId;
  };

  // 获取 model 显示名称
  const getModelName = (providerId: string, modelId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.models.find(m => m.id === modelId)?.name || modelId;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          配置 AI 辩手
          <Badge variant="secondary" className="ml-2">
            {participants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="presets" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">预设角色</TabsTrigger>
            <TabsTrigger value="custom">当前阵容</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-1 gap-3">
                {presetPersonas.map((preset) => (
                  <Card
                    key={preset.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => handleAddPreset(preset)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-12 w-12 text-2xl">
                        <AvatarFallback>{preset.avatar}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{preset.name}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {preset.persona}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  已添加 {participants.length} 位辩手
                  {participants.length >= 5 && participants.length % 2 === 1 && (
                    <span className="text-green-500 ml-2">✓ 数量符合要求</span>
                  )}
                </span>
                <Button onClick={handleAddCustom} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  自定义
                </Button>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {participants.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>还没有添加辩手</p>
                      <p className="text-sm">从预设中选择或创建自定义角色</p>
                    </div>
                  ) : (
                    participants.map((agent, index) => (
                      <Card key={agent.id} className="group">
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <Avatar className="h-10 w-10 text-xl">
                              <AvatarFallback>{agent.avatar}</AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{agent.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {getProviderName(agent.providerId)} · {getModelName(agent.providerId, agent.modelId)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {agent.persona.slice(0, 30)}...
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditAgent(agent)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveAgent(agent.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {participants.find(p => p.id === editingAgent?.id) ? '编辑' : '添加'} AI 辩手
              </DialogTitle>
            </DialogHeader>
            {editingAgent && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">名称</Label>
                    <Input
                      value={editingAgent.name}
                      onChange={(e) =>
                        setEditingAgent({ ...editingAgent, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">头像 Emoji</Label>
                    <Input
                      value={editingAgent.avatar}
                      onChange={(e) =>
                        setEditingAgent({ ...editingAgent, avatar: e.target.value })
                      }
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* Provider 选择 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Provider
                  </Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={editingAgent.providerId}
                    onChange={(e) => {
                      const newProviderId = e.target.value;
                      const newProvider = providers.find(p => p.id === newProviderId);
                      const firstEnabledModel = newProvider?.models.find(m => m.enabled);
                      setEditingAgent({ 
                        ...editingAgent, 
                        providerId: newProviderId,
                        modelId: firstEnabledModel?.id || newProvider?.models[0]?.id || ''
                      });
                    }}
                  >
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.models.filter(m => m.enabled).length} 模型)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model 选择 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">模型</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={editingAgent.modelId}
                    onChange={(e) =>
                      setEditingAgent({ ...editingAgent, modelId: e.target.value })
                    }
                    disabled={availableModels.length === 0}
                  >
                    {availableModels.length === 0 ? (
                      <option value="">该 Provider 没有可用模型</option>
                    ) : (
                      availableModels.map(model => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))
                    )}
                  </select>
                  {availableModels.length === 0 && currentProvider && (
                    <p className="text-xs text-muted-foreground">
                      请先在 Provider 配置中获取并启用模型
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">角色简介</Label>
                  <Input
                    value={editingAgent.persona}
                    onChange={(e) =>
                      setEditingAgent({ ...editingAgent, persona: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">系统提示词</Label>
                  <Textarea
                    value={editingAgent.systemPrompt}
                    onChange={(e) =>
                      setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })
                    }
                    rows={6}
                  />
                </div>

                <Button onClick={handleSaveAgent} className="w-full">
                  保存
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
