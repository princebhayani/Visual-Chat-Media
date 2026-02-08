'use client';

import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, Code, Brain, FileText, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/hooks/use-socket';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import type { ConversationType } from '@ai-chat/shared';

const SUGGESTIONS = [
  { icon: Lightbulb, text: 'Explain quantum computing in simple terms', color: 'text-yellow-500' },
  { icon: Code, text: 'Write a Python function to sort a list', color: 'text-blue-500' },
  { icon: Brain, text: 'Help me brainstorm startup ideas', color: 'text-purple-500' },
  { icon: FileText, text: 'Summarize the key points of a topic', color: 'text-green-500' },
];

interface EmptyStateProps {
  conversationId: string;
  conversationType?: ConversationType;
}

export function EmptyState({ conversationId, conversationType }: EmptyStateProps) {
  const { socket } = useSocket();

  const handleSuggestion = (text: string) => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, { conversationId, content: text });
  };

  if (conversationType === 'DIRECT') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/20">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Start a conversation</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Send a message to start chatting. You can also use @AI to get AI assistance.
          </p>
        </motion.div>
      </div>
    );
  }

  if (conversationType === 'GROUP') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-xl shadow-orange-500/20">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold">Group created!</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Be the first to send a message in this group. Use @AI to invoke AI assistance.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, type: 'spring' }} className="mb-8 flex flex-col items-center gap-4">
        <div className="relative">
          <motion.div animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }} transition={{ duration: 5, repeat: Infinity }} className="h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-500 to-cyan-400 p-0.5 shadow-xl shadow-purple-500/20" style={{ backgroundSize: '200% 200%' }}>
            <div className="flex h-full w-full items-center justify-center rounded-[calc(1.5rem-2px)] bg-background">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </motion.div>
          <motion.div animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-cyan-400 blur-sm" />
        </div>
        <h2 className="text-2xl font-bold gradient-text">How can I help you today?</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">I&apos;m your AI assistant powered by Google Gemini. Ask me anything!</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {SUGGESTIONS.map((suggestion, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}>
            <Button variant="outline" className="w-full h-auto py-3 px-4 justify-start gap-3 text-left hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group" onClick={() => handleSuggestion(suggestion.text)}>
              <suggestion.icon className={`h-5 w-5 shrink-0 ${suggestion.color} group-hover:scale-110 transition-transform`} />
              <span className="text-xs leading-relaxed">{suggestion.text}</span>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
