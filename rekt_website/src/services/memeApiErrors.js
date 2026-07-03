/**
 * Typed errors for Meme API responses (400, 402, 429, 500).
 */
export class MemeApiError extends Error {
  constructor(message, { status, code, detail, retryAfterMs } = {}) {
    super(message);
    this.name = 'MemeApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.retryAfterMs = retryAfterMs;
  }
}

export const MemeApiErrorCode = {
  VALIDATION: 'VALIDATION',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  NETWORK: 'NETWORK',
  WALLET_REQUIRED: 'WALLET_REQUIRED',
  WRONG_CHAIN: 'WRONG_CHAIN',
};

export function getMemeApiUserMessage(error) {
  if (error instanceof MemeApiError) {
    switch (error.code) {
      case MemeApiErrorCode.VALIDATION:
        return error.detail || error.message;
      case MemeApiErrorCode.PAYMENT_REQUIRED:
      case MemeApiErrorCode.WALLET_REQUIRED:
        return error.message;
      case MemeApiErrorCode.PAYMENT_FAILED:
        return error.message;
      case MemeApiErrorCode.RATE_LIMITED:
        return error.message;
      case MemeApiErrorCode.WRONG_CHAIN:
        return error.message;
      case MemeApiErrorCode.SERVER_ERROR:
        return 'Something went wrong on our end. Please try again.';
      case MemeApiErrorCode.NETWORK:
        return error.message;
      default:
        return error.message;
    }
  }

  if (error?.message?.includes('Failed to fetch')) {
    return 'Could not reach the meme API. Check your connection and try again.';
  }

  if (
    error?.message?.includes('User rejected') ||
    error?.message?.includes('user rejected') ||
    error?.code === 4001
  ) {
    return 'Payment cancelled — no charge was made.';
  }

  if (error?.message?.includes('insufficient') || error?.message?.includes('Insufficient')) {
    return 'Insufficient USDC on Base to pay for this generation. Add USDC and try again.';
  }

  return error?.message || 'Failed to generate meme text.';
}
