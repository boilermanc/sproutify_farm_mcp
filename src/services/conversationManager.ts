import { SupabaseClient } from '@supabase/supabase-js';

export interface ConversationState {
  userId: string;
  farmId: string;
  intent: string;
  step: number;
  data: Record<string, any>;
  lastActivity: Date;
  confirmationPending?: boolean;
}

export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  private readonly SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create conversation state for a user
   */
  getConversation(userId: string, farmId: string): ConversationState | null {
    const key = `${userId}_${farmId}`;
    const conversation = this.conversations.get(key);

    // Check if conversation has timed out
    if (conversation && Date.now() - conversation.lastActivity.getTime() > this.SESSION_TIMEOUT) {
      this.conversations.delete(key);
      return null;
    }

    return conversation || null;
  }

  /**
   * Start a new conversation
   */
  startConversation(userId: string, farmId: string, intent: string): ConversationState {
    const key = `${userId}_${farmId}`;
    const conversation: ConversationState = {
      userId,
      farmId,
      intent,
      step: 0,
      data: {},
      lastActivity: new Date()
    };

    this.conversations.set(key, conversation);
    return conversation;
  }

  /**
   * Update conversation data
   */
  updateConversation(userId: string, farmId: string, updates: Partial<ConversationState>): ConversationState {
    const key = `${userId}_${farmId}`;
    const conversation = this.conversations.get(key);

    if (!conversation) {
      throw new Error('No active conversation found');
    }

    const updated = {
      ...conversation,
      ...updates,
      lastActivity: new Date()
    };

    this.conversations.set(key, updated);
    return updated;
  }

  /**
   * Clear conversation (after completion or cancellation)
   */
  clearConversation(userId: string, farmId: string): void {
    const key = `${userId}_${farmId}`;
    this.conversations.delete(key);
  }

  /**
   * Clean up expired conversations
   */
  cleanupExpiredConversations(): void {
    const now = Date.now();
    for (const [key, conversation] of this.conversations.entries()) {
      if (now - conversation.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.conversations.delete(key);
      }
    }
  }
}
