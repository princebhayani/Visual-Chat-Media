import { geminiModel, SYSTEM_PROMPT } from '../../config/gemini';
import { buildContext } from './context-manager';
import { prisma } from '../../config/database';

interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}

export async function streamAIResponse(
  conversationId: string,
  userMessage: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  customSystemPrompt?: string | null,
) {
  // Guard: check if AI model is configured
  if (!geminiModel) {
    callbacks.onError(
      new Error('AI is not configured. Set a valid GEMINI_API_KEY in your .env file.'),
    );
    return;
  }

  try {
    // Fetch conversation history for context
    const messages = await prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      select: { type: true, content: true, senderId: true },
    });

    // Build context with trimming
    const contextMessages = buildContext(messages, userMessage);

    // Use custom system prompt if provided, otherwise default
    const systemPrompt = customSystemPrompt || SYSTEM_PROMPT;

    // Start Gemini chat session
    const chat = geminiModel.startChat({
      history: contextMessages.map((m) => ({
        role: m.type === 'AI_RESPONSE' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      systemInstruction: systemPrompt,
    });

    // Stream the response
    const result = await chat.sendMessageStream(userMessage);

    let fullContent = '';

    for await (const chunk of result.stream) {
      if (abortSignal?.aborted) {
        break;
      }
      const text = chunk.text();
      if (text) {
        fullContent += text;
        callbacks.onChunk(text);
      }
    }

    callbacks.onComplete(fullContent);
    return fullContent;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('AI generation failed');
    callbacks.onError(err);
    throw err;
  }
}
