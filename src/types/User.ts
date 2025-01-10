export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  createdAt: number;
  friends: string[]; // Array of user IDs
  friendRequests: {
    incoming: string[]; // Array of user IDs
    outgoing: string[]; // Array of user IDs
  };
  privacySettings: {
    showWorkSessions: boolean;
    showFocusStats: boolean;
    showProjects: boolean;
  };
  requestSent?: boolean; // UI state for friend request status
} 