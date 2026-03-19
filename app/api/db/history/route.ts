import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const createPrisma = () => new PrismaClient();

export async function GET(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const history = await prisma.tournamentHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    return Response.json({
      history: history.map(h => ({
        id: h.tournamentId,
        topic: h.topic,
        description: h.description || '',
        participants: JSON.parse(h.participants),
        rounds: JSON.parse(h.rounds),
        champion: JSON.parse(h.champion),
        status: 'completed',
        createdAt: new Date(h.createdAt).getTime(),
      }))
    });
  } catch (error) {
    console.error('GET history error:', error);
    return Response.json({ error: 'Failed to get history' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  const prisma = createPrisma();
  try {
    const tournament = await req.json();
    if (!tournament.champion) {
      return Response.json({ error: 'No champion' }, { status: 400 });
    }
    
    await prisma.tournamentHistory.create({
      data: {
        tournamentId: tournament.id,
        topic: tournament.topic,
        description: tournament.description || '',
        participants: JSON.stringify(tournament.participants),
        rounds: JSON.stringify(tournament.rounds),
        champion: JSON.stringify(tournament.champion),
        completedAt: new Date(),
      }
    });
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('POST history error:', error);
    return Response.json({ error: 'Failed to add to history' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = createPrisma();
  try {
    await prisma.tournamentHistory.deleteMany({});
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE history error:', error);
    return Response.json({ error: 'Failed to clear history' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
