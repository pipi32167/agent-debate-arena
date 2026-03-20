import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';
import { NextRequest } from 'next/server';
import { AIAgent, DebateMessage, ProviderConfig } from '@/types';
import { generateDebaterPrompt, generateJudgePrompt } from '@/lib/presets';

export const maxDuration = 300;

const MOCK_MODE = process.env.MOCK_MODE === 'true';

const mockDebateResponses = [
  '我认为这个观点存在根本性的逻辑漏洞。让我们仔细分析一下...',
  '对方的论证虽然听起来有道理，但实际上忽略了一个关键因素...',
  '从历史经验来看，这种观点已经被多次证明是错误的...',
  '我同意对方的某些观点，但结论完全相反...',
  '这是一个复杂的问题，需要我们从多个角度来分析...',
];

const mockJudgeReasons = [
  '辩手A的论证更有说服力，逻辑更加严密。',
  '辩手B提供了更多的证据支持其观点。',
  '从整体表现来看，辩手A更胜一筹。',
  '辩手B的反驳更加有力，成功指出了对方的弱点。',
  '两位辩手都表现不错，但辩手A的总结更加到位。',
];

function getMockStreamResponse(agent: AIAgent) {
  const response = mockDebateResponses[Math.floor(Math.random() * mockDebateResponses.length)];
  const fullResponse = `[${agent.name}] ${response}`;
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullResponse.length) {
          controller.enqueue(encoder.encode(fullResponse[index]));
          index++;
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 10);
    }
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

function getMockVote(judge: AIAgent, debaterA: AIAgent, debaterB: AIAgent) {
  const votedForId = Math.random() > 0.5 ? debaterA.id : debaterB.id;
  const votedForName = votedForId === debaterA.id ? debaterA.name : debaterB.name;
  const reason = mockJudgeReasons[Math.floor(Math.random() * mockJudgeReasons.length)];
  
  return {
    vote: {
      judgeId: judge.id,
      judgeName: judge.name,
      votedForId,
      reason: `[${judge.name}] 投票给 ${votedForName}。${reason}`
    }
  };
}

function getMockStance(agent: AIAgent, topic: string) {
  const stance = Math.random() > 0.5 ? 'for' : 'against';
  const reasons = [
    `基于我的核心理念，我认为${stance === 'for' ? '支持' : '反对'}这个观点更符合逻辑。`,
    `从我的专业角度来看，这个议题需要${stance === 'for' ? '支持' : '反对'}的态度。`,
    `经过深思熟虑，我选择${stance === 'for' ? '支持' : '反对'}这个立场。`,
  ];
  return {
    stance,
    reason: reasons[Math.floor(Math.random() * reasons.length)]
  };
}

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
    const body = await req.json();
    const {
      type,
      agent,
      opponent,
      topic,
      stance,
      round,
      messageType,
      messages,
      provider,
      judge,
      debaterA,
      debaterB,
      debateMessages,
    } = body;

    if (type === 'debate') {
      if (MOCK_MODE) {
        return getMockStreamResponse(agent as AIAgent);
      }

      const prompt = generateDebaterPrompt(
        agent as AIAgent,
        opponent as AIAgent,
        topic,
        stance,
        round,
        messageType as DebateMessage['type']
      );

      const historyMessages = ((messages || []) as DebateMessage[]).map(m => ({
        role: m.speakerId === agent.id ? 'assistant' as const : 'user' as const,
        content: m.content
      }));

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

    if (type === 'choose_stance') {
      if (MOCK_MODE) {
        return Response.json(getMockStance(agent as AIAgent, topic));
      }

      const prompt = `你是一位名为"${agent.name}"的辩论者，你的角色设定是：${agent.persona}

现在有一个辩论议题："${topic}"

请根据你的角色设定和价值观，思考你对这个议题的立场。你应该选择一个明确的立场（支持或反对），并给出理由。

请以 JSON 格式回复：
{
  "stance": "for" 或 "against",
  "reason": "你选择这个立场的原因（50-100字）"
}

注意：请根据你的角色设定来选择立场，而不是简单地随机选择。`;

      const model = getModel(agent as AIAgent, provider as ProviderConfig);

      const result = await generateText({
        model,
        system: agent.systemPrompt,
        prompt: prompt,
        temperature: 0.7,
        maxTokens: 300,
        providerOptions: {
          openai: {
            compatibility: 'strict'
          }
        }
      } as any);

      const response = result.text;

      let stance = 'for';
      let reason = response;

      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          stance = parsed.stance === 'against' ? 'against' : 'for';
          reason = parsed.reason || response;
        }
      } catch {
        const stanceMatch = response.match(/(?:立场|选择|stance)[:：]\s*(支持|反对|for|against)/i);
        if (stanceMatch) {
          const s = stanceMatch[1].toLowerCase();
          stance = (s === '反对' || s === 'against') ? 'against' : 'for';
        }
      }

      return Response.json({ stance, reason });
    }

    if (type === 'judge') {
      if (MOCK_MODE) {
        return Response.json(getMockVote(judge as AIAgent, debaterA as AIAgent, debaterB as AIAgent));
      }

      const messageHistory = (debateMessages as DebateMessage[])
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

      const response = result.text;

      let votedFor = '';
      let reason = response;

      const voteMatch = response.match(/(?:投票|投票给|支持|胜者|winner|vote)[:：]\s*(.+)/i);
      if (voteMatch) {
        votedFor = voteMatch[1].trim().split(/[,，。.\n]/)[0].trim();
      }

      const reasonMatch = response.match(/(?:理由|原因|reason)[:：]\s*([\s\S]+)/i);
      if (reasonMatch) {
        reason = reasonMatch[1].trim();
      }

      let votedForId = '';
      const aName = debaterA.name;
      const bName = debaterB.name;

      if (response.includes(aName) && !response.includes(bName)) {
        votedForId = debaterA.id;
      } else if (response.includes(bName) && !response.includes(aName)) {
        votedForId = debaterB.id;
      } else if (votedFor) {
        const aIndex = votedFor.indexOf(aName);
        const bIndex = votedFor.indexOf(bName);
        if (aIndex >= 0 && (bIndex < 0 || aIndex < bIndex)) {
          votedForId = debaterA.id;
        } else if (bIndex >= 0) {
          votedForId = debaterB.id;
        }
      }

      if (!votedForId) {
        const aCount = (response.match(new RegExp(aName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const bCount = (response.match(new RegExp(bName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (aCount > bCount) votedForId = debaterA.id;
        else if (bCount > aCount) votedForId = debaterB.id;
        else votedForId = Math.random() > 0.5 ? debaterA.id : debaterB.id;
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
