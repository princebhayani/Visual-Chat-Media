interface ContextMessage {
  type: string; // MessageType from Prisma: TEXT, AI_RESPONSE, etc.
  content: string;
  senderId: string | null;
}

const MAX_CONTEXT_MESSAGES = 20;
const MAX_CONTEXT_CHARS = 30000;

export function buildContext(
  messages: ContextMessage[],
  currentMessage: string,
): ContextMessage[] {
  // Filter to only TEXT and AI_RESPONSE messages (skip SYSTEM, IMAGE, etc.)
  const relevant = messages.filter((m) => m.type === 'TEXT' || m.type === 'AI_RESPONSE');

  // Take the most recent messages
  let contextMessages = relevant.slice(-MAX_CONTEXT_MESSAGES);

  // Trim by character count, keeping most recent
  let totalChars = currentMessage.length;
  const trimmed: ContextMessage[] = [];

  for (let i = contextMessages.length - 1; i >= 0; i--) {
    const msg = contextMessages[i];
    totalChars += msg.content.length;

    if (totalChars > MAX_CONTEXT_CHARS) {
      break;
    }

    trimmed.unshift(msg);
  }

  return trimmed;
}
