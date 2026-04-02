export const WEBHOOK_EVENT_TYPES = {
  IAM_USER_CREATED: 'iam.user.created',
  IAM_MEMBER_ADDED: 'iam.member.added',
  IAM_ORGANIZATION_INVITATION_CREATED: 'iam.organization_invitation.created',
  IAM_API_KEY_CREATED: 'iam.api_key.created',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];
export const ALL_WEBHOOK_EVENT_TYPES = Object.values(
  WEBHOOK_EVENT_TYPES,
) as readonly WebhookEventType[];
