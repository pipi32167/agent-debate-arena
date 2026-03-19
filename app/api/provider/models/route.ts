import { NextRequest } from 'next/server';

export const maxDuration = 60;

// 获取 provider 的模型列表
export async function POST(req: NextRequest) {
  try {
    const { baseURL, apiKey } = await req.json();

    if (!baseURL || !apiKey) {
      return Response.json(
        { error: 'Missing baseURL or apiKey' },
        { status: 400 }
      );
    }

    // 标准化 baseURL
    const normalizedBaseURL = baseURL.replace(/\/$/, '');
    const modelsEndpoint = `${normalizedBaseURL}/models`;

    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json(
        { error: `Failed to fetch models: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // 标准化模型列表格式
    // OpenAI 格式: { data: [{ id: string, object: 'model', ... }] }
    // 其他格式可能不同，我们尝试适配
    let models: Array<{ id: string; name?: string }> = [];
    
    if (data.data && Array.isArray(data.data)) {
      // OpenAI 标准格式
      models = data.data.map((m: any) => ({
        id: m.id,
        name: m.id, // 使用 id 作为默认名称
        ...m
      }));
    } else if (Array.isArray(data)) {
      // 直接返回数组的格式
      models = data.map((m: any) => ({
        id: m.id || m.modelId || m.name,
        name: m.name || m.id || m.modelId,
        ...m
      }));
    } else if (data.models && Array.isArray(data.models)) {
      // 嵌套在 models 字段中
      models = data.models.map((m: any) => ({
        id: m.id || m.modelId || m.name,
        name: m.name || m.id || m.modelId,
        ...m
      }));
    }

    // 过滤掉非聊天模型（根据常见命名规则）
    const chatModels = models.filter((m: any) => {
      const id = m.id.toLowerCase();
      // 排除嵌入、图像、音频等模型
      const excludePatterns = [
        'embedding', 'embed', 'tts', 'whisper', 'dall-e', 'image', 'audio',
        'moderation', 'instruct', 'davinci', 'curie', 'babbage', 'ada'
      ];
      return !excludePatterns.some(pattern => id.includes(pattern));
    });

    // 排序：优先显示 GPT 和 Claude 模型
    const sortedModels = chatModels.sort((a: any, b: any) => {
      const aId = a.id.toLowerCase();
      const bId = b.id.toLowerCase();
      const aScore = aId.includes('gpt') || aId.includes('claude') ? 2 : 
                     aId.includes('4') || aId.includes('3.5') ? 1 : 0;
      const bScore = bId.includes('gpt') || bId.includes('claude') ? 2 : 
                     bId.includes('4') || bId.includes('3.5') ? 1 : 0;
      return bScore - aScore;
    });

    return Response.json({ 
      models: sortedModels.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        enabled: true
      }))
    });

  } catch (error) {
    console.error('Fetch models error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
