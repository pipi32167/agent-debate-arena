import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const createPrisma = () => new PrismaClient();

export async function GET(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const tournament = await prisma.tournament.findFirst({
      where: { status: { in: ['configuring', 'ongoing'] } },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!tournament) return Response.json({ tournament: null });
    
    return Response.json({
      tournament: {
        ...tournament,
        participants: JSON.parse(tournament.participants),
        rounds: JSON.parse(tournament.rounds),
        winners: JSON.parse(tournament.winners),
        champion: tournament.champion ? JSON.parse(tournament.champion) : null,
        createdAt: new Date(tournament.createdAt).getTime(),
      }
    });
  } catch (error) {
    console.error('GET tournament error:', error);
    return Response.json({ error: 'Failed to get tournament' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const tournament = await req.json();
    const existing = await prisma.tournament.findUnique({ where: { id: tournament.id } });
    
    const data = {
      topic: tournament.topic,
      description: tournament.description || '',
      participants: JSON.stringify(tournament.participants),
      rounds: JSON.stringify(tournament.rounds),
      currentRoundIndex: tournament.currentRoundIndex || 0,
      currentMatchIndex: tournament.currentMatchIndex || 0,
      winners: JSON.stringify(tournament.winners || []),
      champion: tournament.champion ? JSON.stringify(tournament.champion) : null,
      status: tournament.status,
      maxDebateRounds: tournament.maxDebateRounds || 3,
    };
    
    if (existing) {
      await prisma.tournament.update({ where: { id: tournament.id }, data });
    } else {
      await prisma.tournament.create({
        data: { id: tournament.id, ...data, createdAt: new Date(tournament.createdAt || Date.now()) }
      });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('POST tournament error:', error);
    return Response.json({ error: 'Failed to save tournament' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const { id } = await req.json();
    await prisma.tournament.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE tournament error:', error);
    return Response.json({ error: 'Failed to delete tournament' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
