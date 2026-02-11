export const SOCKET_EVENTS = {
  // Client -> Server: Conversation
  JOIN_CONVERSATION: 'join-conversation',
  LEAVE_CONVERSATION: 'leave-conversation',

  // Client -> Server: Messaging
  SEND_MESSAGE: 'send-message',
  EDIT_MESSAGE: 'edit-message',
  DELETE_MESSAGE: 'delete-message',
  MESSAGE_REACTION: 'message-reaction',

  // Client -> Server: AI
  STOP_GENERATION: 'stop-generation',
  REGENERATE_RESPONSE: 'regenerate-response',

  // Client -> Server: Typing
  TYPING_START: 'typing-start',
  TYPING_STOP: 'typing-stop',

  // Client -> Server: Message Status
  MESSAGE_DELIVERED: 'message-delivered',
  MESSAGE_READ: 'message-read',

  // Client -> Server: Calls
  CALL_INITIATE: 'call-initiate',
  CALL_ACCEPT: 'call-accept',
  CALL_REJECT: 'call-reject',
  CALL_END: 'call-end',
  CALL_ICE_CANDIDATE: 'call-ice-candidate',
  CALL_OFFER: 'call-offer',
  CALL_ANSWER: 'call-answer',

  // Server -> Client: Messaging
  NEW_MESSAGE: 'new-message',
  MESSAGE_DELETED: 'message-deleted',
  MESSAGE_UPDATED: 'message-updated',
  MESSAGE_REACTION_UPDATED: 'message-reaction-updated',

  // Server -> Client: AI
  AI_STREAM_START: 'ai-stream-start',
  AI_STREAM_CHUNK: 'ai-stream-chunk',
  AI_STREAM_END: 'ai-stream-end',
  AI_STREAM_ERROR: 'ai-stream-error',

  // Server -> Client: Conversation
  CONVERSATION_UPDATED: 'conversation-updated',

  // Server -> Client: Typing
  TYPING: 'typing',

  // Server -> Client: Message Status
  MESSAGE_STATUS_UPDATE: 'message-status-update',

  // Server -> Client: Presence
  USER_ONLINE: 'user-online',
  USER_OFFLINE: 'user-offline',

  // Server -> Client: Group
  GROUP_MEMBER_ADDED: 'group-member-added',
  GROUP_MEMBER_REMOVED: 'group-member-removed',
  GROUP_UPDATED: 'group-updated',

  // Server -> Client: Calls
  CALL_RINGING: 'call-ringing',
  CALL_ACCEPTED: 'call-accepted',
  CALL_REJECTED: 'call-rejected',
  CALL_ENDED: 'call-ended',

  // Server -> Client: Notifications
  NEW_NOTIFICATION: 'new-notification',

  // Error
  ERROR: 'error',
} as const;
