export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  status: string | null;
  lastSeenAt: string | null;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserPublic = Pick<
  User,
  'id' | 'name' | 'avatarUrl' | 'email' | 'bio' | 'status' | 'lastSeenAt' | 'isOnline'
>;

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  status?: string;
  avatarUrl?: string;
}
