// Shared browser/API budgets. A request always makes at most one model call.
export const CHAT_LIMITS = Object.freeze({
  userChars: 1200,
  assistantChars: 2800,
  totalChars: 8000,
  bodyBytes: 32000,
  turns: 8,
  replyChars: 1800,
  outputTokens: 2400,
});
