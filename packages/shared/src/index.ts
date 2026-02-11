// Types
export type { User, UserPublic, UpdateProfilePayload } from './types/user';
export type {
  Message,
  MessageRole,
  MessageType,
  MessageStatus,
  StreamingMessage,
  Attachment,
  Reaction,
} from './types/message';
export type {
  Conversation,
  ConversationWithMessages,
  ConversationType,
  MemberRole,
  ConversationMember,
} from './types/conversation';
export type { AuthTokens, LoginResponse, SignupPayload, LoginPayload } from './types/auth';
export type { ClientToServerEvents, ServerToClientEvents } from './types/socket-events';

// Schemas
export { signupSchema, loginSchema } from './schemas/auth.schema';
export type { SignupInput, LoginInput } from './schemas/auth.schema';
export { sendMessageSchema, editMessageSchema } from './schemas/message.schema';
export type { SendMessageInput, EditMessageInput } from './schemas/message.schema';
export {
  createConversationSchema,
  updateConversationSchema,
  createGroupSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from './schemas/conversation.schema';
export type {
  CreateConversationInput,
  UpdateConversationInput,
  CreateGroupInput,
  AddMemberInput,
  UpdateMemberRoleInput,
} from './schemas/conversation.schema';
export { updateProfileSchema, searchUsersSchema } from './schemas/user.schema';
export type { UpdateProfileInput, SearchUsersInput } from './schemas/user.schema';

// Constants
export { SOCKET_EVENTS } from './constants/socket-events';
