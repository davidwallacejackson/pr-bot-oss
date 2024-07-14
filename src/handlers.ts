import { uniq } from "lodash";
import { InternalError } from "./errors";
import {
  ChatService,
  Comment,
  PR,
  Review,
  ReviewRequest,
  Store,
  UserID,
  VCS,
} from "./types";

const mentionsRegex = /@([a-zA-Z_\-]+)/;

async function promiseFilter<T>(
  arr: T[],
  predicate: (t: T) => Promise<boolean>
) {
  const evaluatedPredicates = await Promise.all(arr.map((t) => predicate(t)));

  return arr.filter((_, i) => evaluatedPredicates[i]);
}

class Handlers {
  store: Store;
  vcs: VCS;
  chatService: ChatService;

  constructor({
    store,
    vcs,
    chatService,
  }: {
    store: Store;
    vcs: VCS;
    chatService: ChatService;
  }) {
    this.store = store;
    this.vcs = vcs;
    this.chatService = chatService;
  }

  async okToMessageUser(userID: UserID, pr: PR) {
    const settings = await this.store.getUserSettingsByUserID(userID);

    return !!settings.enabled;
  }

  async getInvolvedUsers(pr: PR, comment: Comment): Promise<UserID[]> {
    if (pr.id !== comment.pr) {
      throw new InternalError(
        `Mismatched PR (${pr.id}) and comment (${comment.id}) in getInvolvedUsers: `
      );
    }
    const thread = await this.vcs.getCommentThread(pr.id, comment.id);

    const involvedInEachComment = await Promise.all(
      thread.map(async (comment) => {
        const mentions = await this.vcs.getMentions(comment.body);

        return [comment.author, ...mentions];
      })
    );

    return uniq([pr.author, ...involvedInEachComment.flat()]);
  }

  formatCommentNotification(pr: PR, comment: Comment): string {
    return `TODO`;
  }

  async handleNewComment(comment: Comment) {
    const pr = await this.vcs.getPR(comment.pr);
    if (!pr) {
      throw new InternalError(`No PR for ID ${comment.pr}`);
    }

    let recipients: UserID[] = uniq([
      pr.author,
      ...(await this.getInvolvedUsers(pr, comment)),
    ]);

    recipients = await promiseFilter(
      recipients,
      async (userID) =>
        userID !== comment.author && (await this.okToMessageUser(userID, pr))
    );

    await Promise.all(
      recipients.map(async (recipientID) => {
        this.chatService.sendMessage(
          recipientID,
          this.formatCommentNotification(pr, comment)
        );
      })
    );
  }

  formatReviewRequestNotification(pr: PR, r: ReviewRequest): string {
    return `TODO`;
  }

  async handleNewReviewRequest(reviewRequest: ReviewRequest) {
    const pr = await this.vcs.getPR(reviewRequest.pr);
    if (!pr) {
      throw new InternalError(`No PR for ID ${reviewRequest.pr}`);
    }

    if (!this.okToMessageUser(reviewRequest.userWhoseReviewIsRequestedID, pr)) {
      return;
    }

    await this.chatService.sendMessage(
      reviewRequest.userWhoseReviewIsRequestedID,
      this.formatReviewRequestNotification(pr, reviewRequest)
    );
  }

  formatReviewNotification(pr: PR, review: Review): string {
    return `TODO`;
  }

  async handleNewReview(review: Review) {
    const pr = await this.vcs.getPR(review.pr);
    if (!pr) {
      throw new InternalError(`No PR for ID ${review.pr}`);
    }

    const mentions = review.body ? await this.vcs.getMentions(review.body) : [];

    let recipients: UserID[] = uniq([pr.author, ...mentions]);

    recipients = await promiseFilter(
      recipients,
      async (userID) =>
        userID !== review.reviewer && (await this.okToMessageUser(userID, pr))
    );

    await Promise.all(
      recipients.map(async (recipientID) => {
        this.chatService.sendMessage(
          recipientID,
          this.formatReviewNotification(pr, review)
        );
      })
    );
  }
}
