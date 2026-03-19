import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

// 创建 Prisma 客户端实例 - Prisma 7 自动从 prisma.config.ts 读取配置
const createPrisma = () => new PrismaClient();

// 获取所有 Providers
export async function GET(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    // 反序列化
    const deserialized = providers.map(p => ({
      ...p,
      models: JSON.parse(p.models)
    }));
    
    return Response.json({ providers: deserialized });
  } catch (error) {
    console.error('GET providers error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get providers' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 创建 Provider
export async function POST(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const data = await req.json();
    const id = data.id || Math.random().toString(36).substring(2, 15);
    
    const provider = await prisma.provider.create({
      data: {
        id,
        name: data.name,
        baseURL: data.baseURL,
        apiKey: data.apiKey || '',
        models: JSON.stringify(data.models || []),
        isBuiltIn: data.isBuiltIn || false,
      }
    });
    
    return Response.json({ 
      provider: { ...provider, models: JSON.parse(provider.models) } 
    });
  } catch (error) {
    console.error('POST provider error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create provider' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 更新 Provider
export async function PUT(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const body = await req.json();
    
    if (body.providers && Array.isArray(body.providers)) {
      await prisma.provider.deleteMany();
      for (const p of body.providers) {
        await prisma.provider.upsert({
          where: { id: p.id },
          update: {
            name: p.name,
            baseURL: p.baseURL,
            apiKey: p.apiKey || '',
            models: JSON.stringify(p.models || []),
            isBuiltIn: p.isBuiltIn || false,
          },
          create: {
            id: p.id,
            name: p.name,
            baseURL: p.baseURL,
            apiKey: p.apiKey || '',
            models: JSON.stringify(p.models || []),
            isBuiltIn: p.isBuiltIn || false,
          }
        });
      }
      return Response.json({ success: true });
    }
    
    const { id, ...updates } = body;
    
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.baseURL) updateData.baseURL = updates.baseURL;
    if (updates.apiKey !== undefined) updateData.apiKey = updates.apiKey;
    if (updates.models) updateData.models = JSON.stringify(updates.models);
    
    const provider = await prisma.provider.update({
      where: { id },
      data: updateData
    });
    
    return Response.json({ 
      provider: { ...provider, models: JSON.parse(provider.models) } 
    });
  } catch (error) {
    console.error('PUT provider error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to update provider' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// 删除 Provider
export async function DELETE(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const { id } = await req.json();
    await prisma.provider.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE provider error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete provider' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
