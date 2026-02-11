'use client';

import { motion } from 'framer-motion';
import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConversations } from '@/hooks/use-conversations';

export default function ChatPage() {
  const { createConversation } = useConversations();

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="flex flex-col items-center gap-6 max-w-md text-center"
      >
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{ duration: 5, repeat: Infinity }}
          className="h-24 w-24 rounded-3xl bg-gradient-to-br from-violet-600 via-purple-500 to-cyan-400 p-0.5 shadow-2xl shadow-purple-500/20"
          style={{ backgroundSize: '200% 200%' }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-[calc(1.5rem-2px)] bg-background">
            <Sparkles className="h-10 w-10 text-primary" />
          </div>
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold gradient-text">AI Chat</h1>
          <p className="text-muted-foreground">
            Start a new conversation or select one from the sidebar
          </p>
        </div>

        <Button
          onClick={createConversation}
          variant="gradient"
          size="lg"
          className="gap-2 rounded-xl"
        >
          <Plus className="h-5 w-5" />
          New Conversation
        </Button>
      </motion.div>
    </div>
  );
}
