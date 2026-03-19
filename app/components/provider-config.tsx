'use client';

import { useState } from 'react';
import { ProviderConfig, ProviderModel } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Server, 
  Plus, 
  Trash2, 
  Settings, 
  Check, 
  RefreshCw,
  AlertCircle,
  Key,
  Globe,
  Cpu
} from 'lucide-react';

interface ProviderConfigPanelProps {
  providers: ProviderConfig[];
  onProvidersChange: (providers: ProviderConfig[]) => void;
}

export function ProviderConfigPanel({ providers, onProvidersChange }: ProviderConfigPanelProps) {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const handleAddProvider = () => {
    const newProvider: ProviderConfig = {
      id: generateId(),
      name: '',
      baseURL: '',
      apiKey: '',
      models: [],
      isBuiltIn: false,
    };
    setEditingProvider(newProvider);
    setFetchError(null);
    setIsDialogOpen(true);
  };

  const handleEditProvider = (provider: ProviderConfig) => {
    setEditingProvider({ ...provider });
    setFetchError(null);
    setIsDialogOpen(true);
  };

  const handleSaveProvider = () => {
    if (!editingProvider) return;

    // 验证必填字段
    if (!editingProvider.name.trim() || !editingProvider.baseURL.trim()) {
      setFetchError('请填写名称和 Base URL');
      return;
    }

    const existing = providers.find(p => p.id === editingProvider.id);
    if (existing) {
      // 更新
      onProvidersChange(providers.map(p => p.id === editingProvider.id ? editingProvider : p));
    } else {
      // 新增
      onProvidersChange([...providers, editingProvider]);
    }
    setIsDialogOpen(false);
    setEditingProvider(null);
    setFetchError(null);
  };

  const handleRemoveProvider = (id: string) => {
    onProvidersChange(providers.filter(p => p.id !== id));
  };

  const handleFetchModels = async () => {
    if (!editingProvider?.baseURL || !editingProvider?.apiKey) {
      setFetchError('请先填写 Base URL 和 API Key');
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch('/api/provider/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseURL: editingProvider.baseURL,
          apiKey: editingProvider.apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取模型列表失败');
      }

      // 合并现有模型选择状态
      const existingModels = editingProvider.models || [];
      const mergedModels = data.models.map((m: ProviderModel) => ({
        ...m,
        enabled: existingModels.find((em: ProviderModel) => em.id === m.id)?.enabled ?? true
      }));

      setEditingProvider({
        ...editingProvider,
        models: mergedModels
      });
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : '获取模型列表失败');
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggleModel = (modelId: string) => {
    if (!editingProvider) return;
    
    setEditingProvider({
      ...editingProvider,
      models: editingProvider.models.map(m =>
        m.id === modelId ? { ...m, enabled: !m.enabled } : m
      )
    });
  };

  const getEnabledModelsCount = (provider: ProviderConfig) => {
    return provider.models.filter(m => m.enabled).length;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Provider 配置
          <Badge variant="secondary" className="ml-2">
            {providers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider 列表 */}
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
                  {provider.isBuiltIn ? (
                    <Cpu className="h-5 w-5 text-primary" />
                  ) : (
                    <Globe className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{provider.name}</span>
                    {provider.isBuiltIn && (
                      <Badge variant="outline" className="text-xs">内置</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {provider.baseURL}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getEnabledModelsCount(provider)} 个模型已启用
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!provider.isBuiltIn && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditProvider(provider)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                {!provider.isBuiltIn && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveProvider(provider.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {providers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>还没有配置 Provider</p>
              <p className="text-sm">添加 OpenAI 兼容的 API 提供商</p>
            </div>
          )}
        </div>

        <Button onClick={handleAddProvider} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          添加 Provider
        </Button>

        {/* Provider 编辑对话框 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {providers.find(p => p.id === editingProvider?.id) ? '编辑' : '添加'} Provider
              </DialogTitle>
            </DialogHeader>
            
            {editingProvider && (
              <div className="space-y-4 pt-4">
                {/* 名称 */}
                <div className="space-y-2">
                  <Label htmlFor="provider-name">显示名称</Label>
                  <Input
                    id="provider-name"
                    placeholder="如：OpenRouter, SiliconFlow"
                    value={editingProvider.name}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, name: e.target.value })
                    }
                  />
                </div>

                {/* Base URL */}
                <div className="space-y-2">
                  <Label htmlFor="provider-baseurl" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Base URL
                  </Label>
                  <Input
                    id="provider-baseurl"
                    placeholder="https://api.openai.com/v1"
                    value={editingProvider.baseURL}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, baseURL: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    OpenAI 兼容格式的 API 基础地址，需包含 /v1 路径
                  </p>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="provider-apikey" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    API Key
                  </Label>
                  <Input
                    id="provider-apikey"
                    type="password"
                    placeholder="sk-..."
                    value={editingProvider.apiKey}
                    onChange={(e) =>
                      setEditingProvider({ ...editingProvider, apiKey: e.target.value })
                    }
                  />
                </div>

                <Separator />

                {/* 获取模型按钮 */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleFetchModels}
                    disabled={isFetching}
                    variant="secondary"
                    className="flex-1"
                  >
                    {isFetching ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    {isFetching ? '获取中...' : '获取模型列表'}
                  </Button>
                </div>

                {/* 错误提示 */}
                {fetchError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                )}

                {/* 模型列表 */}
                {editingProvider.models.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>可用模型</Label>
                      <span className="text-xs text-muted-foreground">
                        {editingProvider.models.filter(m => m.enabled).length} / {editingProvider.models.length} 已启用
                      </span>
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      <div className="space-y-1">
                        {editingProvider.models.map((model) => (
                          <div
                            key={model.id}
                            className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleToggleModel(model.id)}
                          >
                            <Checkbox
                              checked={model.enabled}
                              onCheckedChange={() => handleToggleModel(model.id)}
                            />
                            <span className="text-sm flex-1 truncate">{model.name}</span>
                            {model.enabled && (
                              <Check className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <Button onClick={handleSaveProvider} className="w-full">
                  保存 Provider
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
