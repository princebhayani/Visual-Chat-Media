export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export const PROMPT_SUGGESTIONS = [
  {
    icon: 'Lightbulb',
    text: 'Explain quantum computing in simple terms',
  },
  {
    icon: 'Code',
    text: 'Write a Python function to sort a list',
  },
  {
    icon: 'Brain',
    text: 'Help me brainstorm startup ideas',
  },
  {
    icon: 'FileText',
    text: 'Summarize the key points of a topic',
  },
] as const;

export const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Search conversations', mac: ['Cmd', 'K'] },
  { keys: ['Ctrl', 'N'], description: 'New conversation', mac: ['Cmd', 'N'] },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle sidebar', mac: ['Cmd', 'Shift', 'S'] },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle theme', mac: ['Cmd', 'Shift', 'D'] },
  { keys: ['Escape'], description: 'Stop generation / Close', mac: ['Escape'] },
  { keys: ['Ctrl', 'Shift', 'C'], description: 'Copy last response', mac: ['Cmd', 'Shift', 'C'] },
] as const;
