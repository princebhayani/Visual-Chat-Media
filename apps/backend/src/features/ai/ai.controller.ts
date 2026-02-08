import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/async-handler';
import { prisma } from '../../config/database';
import { geminiModel } from '../../config/gemini';
import { ApiError } from '../../lib/api-error';

export const summarizeConversation = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversationId = req.params.id as string;

  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new ApiError(404, 'Conversation not found');

  // Fetch messages
  const messages = await prisma.message.findMany({
    where: { conversationId, isDeleted: false, type: { not: 'SYSTEM' } },
    orderBy: { createdAt: 'asc' },
    take: 100, // Limit to last 100 messages
    include: {
      sender: { select: { name: true } },
    },
  });

  if (messages.length === 0) {
    res.json({ summary: 'No messages to summarize.' });
    return;
  }

  if (!geminiModel) {
    throw new ApiError(503, 'AI is not configured. Set a valid GEMINI_API_KEY in your .env file.');
  }

  // Build conversation text
  const conversationText = messages
    .map((m) => {
      const sender =
        m.type === 'AI_RESPONSE' ? 'AI' : m.sender?.name || 'Unknown';
      return `${sender}: ${m.content}`;
    })
    .join('\n');

  // Ask Gemini to summarize
  const result = await geminiModel.generateContent(
    `Summarize the following conversation concisely. Highlight key points, decisions made, and action items if any.\n\n${conversationText}`,
  );

  const summary = result.response.text();
  res.json({ summary });
});

export const getSmartReplies = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversationId = req.params.id as string;

  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!member) throw new ApiError(404, 'Conversation not found');

  // Fetch last 5 messages for context
  const messages = await prisma.message.findMany({
    where: { conversationId, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      sender: { select: { name: true } },
    },
  });

  if (!geminiModel) {
    throw new ApiError(503, 'AI is not configured. Set a valid GEMINI_API_KEY in your .env file.');
  }

  if (messages.length === 0) {
    res.json({ suggestions: [] });
    return;
  }

  const context = messages
    .reverse()
    .map((m) => {
      const sender =
        m.type === 'AI_RESPONSE' ? 'AI' : m.sender?.name || 'Unknown';
      return `${sender}: ${m.content}`;
    })
    .join('\n');

  const result = await geminiModel.generateContent(
    `Based on this conversation context, suggest exactly 3 short, natural reply options (each under 50 characters). Return ONLY the 3 suggestions, one per line, no numbering.\n\n${context}`,
  );

  const text = result.response.text();
  const suggestions = text
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
    .slice(0, 3);

  res.json({ suggestions });
});
