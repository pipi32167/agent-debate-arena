import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { NextRequest } from 'next/server';
import { AIAgent, DebateMessage, ProviderConfig } from '@/types';
import { generateDebaterPrompt, generateJudgePrompt } from '@/lib/presets';

// 允许最多 5 分钟的执行时间
export const maxDuration = 300;

// 获取模型客户端
function getModel(agent: AIAgent, provider?: ProviderConfig) {
  // 内置 provider
  if (agent.providerId === 'openai') {
    return openai(agent.modelId);
  }
  if (agent.providerId === 'anthropic') {
    return anthropic(agent.modelId);
  }

  // 自定义 provider - 使用 OpenAI 兼容格式
  if (provider) {
    const customOpenAI = createOpenAI({
      baseURL: provider.baseURL,
      apiKey: provider.apiKey,
    });
    return customOpenAI(agent.modelId);
  }

  // 默认 fallback
  return openai(agent.modelId);
}

// 生成辩论发言
export async function POST(req: NextRequest) {
  try {
    const { 
      type, 
      agent, 
      opponent, 
      topic, 
      stance, 
      round, 
      messageType,
      messages,
      provider
    } = await req.json();

    if (type === 'debate') {
      const prompt = generateDebaterPrompt(
        agent as AIAgent,
        opponent as AIAgent,
        topic,
        stance,
        round,
        messageType as DebateMessage['type']
      );

      // 构建消息历史 - 使用简单对象数组
      const historyMessages = ((messages || []) as DebateMessage[]).map(m => ({
        role: m.speakerId === agent.id ? 'assistant' as const : 'user' as const,
        content: m.content
      }));

      // 将当前 prompt 作为 user message
      const allMessages = [
        ...historyMessages,
        { role: 'user' as const, content: prompt }
      ];

      const model = getModel(agent as AIAgent, provider as ProviderConfig);

      const result = streamText({
        model,
        system: agent.systemPrompt,
        messages: allMessages,
        temperature: 0.8,
        maxTokens: 500
      } as any);

      return result.toTextStreamResponse();
    }

    if (type === 'judge') {
      const { judge, debaterA, debaterB, debateMessages, provider } = await req.json();
      
      const messageHistory = debateMessages
        .map((m: DebateMessage) => `${m.speakerName}: ${m.content}`)
        .join('\n\n');

      const prompt = generateJudgePrompt(
        judge as AIAgent,
        debaterA as AIAgent,
        debaterB as AIAgent,
        topic,
        messageHistory
      );

      const model = getModel(judge as AIAgent, provider as ProviderConfig);

      const result = await generateText({
        model,
        system: judge.systemPrompt,
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 300
      } as any);

      // 解析投票结果
      const response = result.text;
      const voteMatch = response.match(/投票[:：]\s*(.+)/i);
      const reasonMatch = response.match(/理由[:：]\s*([\s\S]+)/i);

      const votedFor = voteMatch ? voteMatch[1].trim() : '';
      const reason = reasonMatch ? reasonMatch[1].trim() : response;

      // 判断投票给谁
      let votedForId = '';
      if (votedFor.includes(debaterA.name) || votedFor.toLowerCase().includes('a')) {
        votedForId = debaterA.id;
      } else if (votedFor.includes(debaterB.name) || votedFor.toLowerCase().includes('b')) {
        votedForId = debaterB.id;
      }

      return Response.json({
        vote: {
          judgeId: judge.id,
          judgeName: judge.name,
          votedForId,
          reason
        }
      });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
