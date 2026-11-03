export interface MessageAttachment {
  url: string;
  key?: string | null;
}

/** One inbox row / thread header (spec `messages-feature-review` R2/R15). */
export interface MessageThread {
  id: number;
  property_id: number | null;
  property_title: string | null;
  counterpart_id: number;
  counterpart_first_name: string;
  counterpart_last_name: string;
  counterpart_avatar_url: string | null;
  last_message_at: string;
  created_at: string;
  last_body: string | null;
  last_sender_id: number | null;
  /** Attachments on the newest visible message — an image-only row still previews. */
  last_attachment_count: number;
  unread_count: number;
  blocked_by_me: number;
  blocked_me: number;
}

export interface MessageThreadsResponse {
  data: MessageThread[];
  unread_count: number;
}

export interface ThreadMessage {
  id: number;
  sender_id: number;
  body: string;
  property_id: number | null;
  read_at: string | null;
  created_at: string;
  attachments: MessageAttachment[];
}

export interface MessageThreadResponse {
  data: {
    thread: MessageThread;
    side: 'landlord' | 'boarder';
    messages: ThreadMessage[];
    has_more: boolean;
    next_before: number | null;
    /** `'you'` when the caller blocked the counterpart, `'them'` for the reverse. */
    blocked_by: 'you' | 'them' | null;
    /** `property_id` → listing title, for the origin header and message chips (R15). */
    properties: Record<string, string>;
  };
}

export interface MessageThreadOpenResponse {
  data: { thread: MessageThread };
}

export interface SendMessageResponse {
  data: { message: ThreadMessage };
}

export interface MessageUnreadCountResponse {
  data: { unread_count: number };
}

export interface MessageAttachmentsResponse {
  data: MessageAttachment[];
}
