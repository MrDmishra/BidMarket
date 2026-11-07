/** Stable API error codes from docs/API.md section 1. */
export const ERROR_CATALOGUE = {
  VALIDATION_FAILED: { status: 400, message: "Check the highlighted fields and try again." },
  UNAUTHENTICATED: { status: 401, message: "Log in to continue." },
  FORBIDDEN: { status: 403, message: "You do not have access to this." },
  ACCOUNT_BLOCKED: { status: 403, message: "Your account is blocked from this action." },
  ACCOUNT_NOT_ACTIVE: { status: 403, message: "Complete verification to use this feature." },
  NOT_FOUND: { status: 404, message: "We can't find this." },
  INVALID_STATE: { status: 409, message: "This record has changed. Refresh and try again." },
  IDEMPOTENCY_CONFLICT: { status: 409, message: "This request was already used with other data." },
  AUCTION_CLOSED: { status: 409, message: "This auction has closed." },
  AUCTION_PAUSED: {
    status: 409,
    message: "This auction is paused. Bidding resumes when Bid Market restarts it.",
  },
  BID_TOO_HIGH: { status: 409, message: "Your bid is above the allowed price." },
  ATTEMPTS_EXCEEDED: { status: 409, message: "You have used all your attempts." },
  LIMIT_EXCEEDED: { status: 422, message: "This is above the allowed limit." },
  VERIFICATION_FAILED: { status: 422, message: "We could not verify these details." },
  NOT_ELIGIBLE: { status: 422, message: "You are not eligible for this." },
  RATE_LIMITED: { status: 429, message: "Too many requests. Wait a moment and try again." },
  INTERNAL_ERROR: {
    status: 500,
    message: "Something went wrong. Try again, or contact support with the reference.",
  },
  PROVIDER_UNAVAILABLE: {
    status: 502,
    message: "A connected service is not responding. Try again shortly.",
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: "Bid Market is temporarily unavailable. Try again shortly.",
  },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOGUE;
