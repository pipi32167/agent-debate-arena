import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const createPrisma = () => new PrismaClient();

const defaultProviders = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: '',
    models: JSON.stringify([
      { id: 'gpt-4o', name: 'GPT-4o', enabled: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', enabled: true },
      { id: 'o3-mini', name: 'o3-mini', enabled: true },
    ]),
    isBuiltIn: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: '',
    models: JSON.stringify([
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', enabled: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', enabled: true },
    ]),
    isBuiltIn: true,
  },
];

export async function POST(req: NextRequest) {
  const prisma = createPrisma();
  try {
    for (const provider of defaultProviders) {
      const existing = await prisma.provider.findUnique({ where: { id: provider.id } });
      if (!existing) {
        await prisma.provider.create({ data: provider });
      }
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error('Init error:', error);
    return Response.json({ error: 'Failed to initialize' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
