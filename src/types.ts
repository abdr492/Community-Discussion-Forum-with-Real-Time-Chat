export type UserRole = 'user' | 'moderator' | 'admin';
export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  role: UserRole;
  status: PresenceStatus;
  customStatus?: string;
  lastActive: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  isPrivate?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string; // channelId or dmRoomId
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  timestamp: string;
  isModerated: boolean;
  moderationReason?: string;
}

export interface DMRoom {
  id: string; // e.g. "user1-user2"
  user1Id: string;
  user2Id: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // list of userIds who voted for this option
}

export interface Poll {
  question: string;
  options: PollOption[];
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  tags: string[];
  votes: Record<string, 'up' | 'down'>; // userId -> type
  voteCount: number;
  isModerated: boolean;
  moderationReason?: string;
  isPinned: boolean;
  timestamp: string;
  commentCount: number;
  poll?: Poll;
}

export interface ForumComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  timestamp: string;
  isModerated: boolean;
  moderationReason?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'reply' | 'mention' | 'dm' | 'system';
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  timestamp: string;
}

export interface TypingIndicator {
  userId: string;
  username: string;
  roomId: string;
  timestamp: number;
}
