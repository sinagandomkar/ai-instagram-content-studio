export interface TopContentItem {
  externalId: string;
  type: "post" | "reel";
  thumbnailUrl?: string;
  caption?: string;
  likes: number;
  comments: number;
  views?: number;
  publishDate: string; // ISO date
}

export interface AccountInsights {
  instagramUserId: string;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  followers: number;
  following: number;
  postsCount: number;
  engagementRate: number;
  topPosts: TopContentItem[];
  topReels: TopContentItem[];
}

export interface PostingEvent {
  publishedAt: string; // ISO datetime
  type: "post" | "reel";
  likes: number;
  comments: number;
  views?: number;
}

export interface RawComment {
  externalId: string;
  authorUsername?: string;
  text: string;
}
