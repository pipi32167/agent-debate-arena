import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const createPrisma = () => new PrismaClient();

export async function GET(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const participants = await prisma.participant.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return Response.json({ participants });
  } catch (error) {
    console.error('GET participants error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get participants' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const { participants } = await req.json();
    
    await prisma.participant.deleteMany();
    
    for (const p of participants) {
      await prisma.participant.create({
        data: {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          providerId: p.providerId,
          modelId: p.modelId,
          persona: p.persona,
          systemPrompt: p.systemPrompt,
        }
      });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('PUT participants error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to save participants' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = createPrisma();
  try {
    await prisma.participant.deleteMany();
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE participants error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to delete participants' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
