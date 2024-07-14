import type { Tagged } from "type-fest";

export type UserID = Tagged<string, "UserID">;

export interface UserSettings {
  userID: UserID;
  enabled?: boolean;
}

const defaultSettings: UserSettings = {
  userID: "" as UserID,
  enabled: true,
};

export type PRID = Tagged<string, "PRID">;
export interface PR {
  id: PRID;
  author: UserID;
  name: string;
  url: string;
}
export interface VCS {
  _type: string;

  getPR(prID: PRID): Promise<PR | null>;

  getCommentsByPRID(prID: PRID): Promise<Comment[]>;
  getCommentThread(prID: PRID, commentID: CommentID): Promise<Comment[]>;
  getMentions(commentBody: string): Promise<UserID[]>;

  getReviewRequestsByPRID(prID: PRID): Promise<ReviewRequest[]>;

  getReviewsByPRID(prID: PRID): Promise<Review[]>;

  createComment(comment: Comment): Promise<void>;
}

export type CommentID = Tagged<string, "CommentID">;
export interface Comment {
  id: CommentID;
  pr: PRID;
  author: UserID;
  body: string;
  inReplyTo?: CommentID;
}

export type ReviewRequestID = Tagged<string, "ReviewRequestID">;
export interface ReviewRequest {
  id: ReviewRequestID;
  pr: PRID;
  userRequestingReviewID: UserID;
  userWhoseReviewIsRequestedID: UserID;
}

export type ReviewID = Tagged<string, "ReviewID">;
export type ReviewStatus = "ACCEPT" | "REQUEST_CHANGES" | "COMMENT";
export interface Review {
  id: ReviewID;
  pr: PRID;
  reviewer: UserID;
  status: ReviewStatus;
  body?: string;
}

export interface ChatService {
  _type: string;

  sendMessage(to: UserID, message: string): Promise<void>;
}

export interface Store {
  _type: string;

  getUserSettingsByUserID(userID: UserID): Promise<UserSettings>;
  setUserSettingsByUserID(
    userID: UserID,
    newSettings: UserSettings
  ): Promise<void>;
}
