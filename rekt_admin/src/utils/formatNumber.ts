/**
 * Format a number with dynamic decimal places based on its value
 * @param value - The number value (as string or number)
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(
  value: string | number | bigint | undefined | null,
  options: {
    minDecimals?: number
    maxDecimals?: number
    showSign?: boolean
    compact?: boolean
    prefix?: string
    suffix?: string
  } = {}
): string {
  if (value === undefined || value === null || value === '') {
    return '0'
  }

  const {
    minDecimals = 0,
    maxDecimals = 6,
    showSign = false,
    compact = false,
    prefix = '',
    suffix = '',
  } = options

  // Convert to number
  const num = typeof value === 'bigint' ? Number(value) : typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num) || !isFinite(num)) {
    return '0'
  }

  // Handle zero
  if (num === 0) {
    return `${prefix}0${suffix}`
  }

  // Handle very small numbers
  if (Math.abs(num) < 0.000001 && num !== 0) {
    return `${prefix}${num.toExponential(2)}${suffix}`
  }

  // Compact notation for large numbers
  if (compact) {
    if (Math.abs(num) >= 1e9) {
      return `${prefix}${(num / 1e9).toFixed(2)}B${suffix}`
    }
    if (Math.abs(num) >= 1e6) {
      return `${prefix}${(num / 1e6).toFixed(2)}M${suffix}`
    }
    if (Math.abs(num) >= 1e3) {
      return `${prefix}${(num / 1e3).toFixed(2)}K${suffix}`
    }
  }

  // Determine appropriate decimal places based on value
  let decimals = minDecimals

  if (Math.abs(num) >= 1000) {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 2))
  } else if (Math.abs(num) >= 100) {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 3))
  } else if (Math.abs(num) >= 10) {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 4))
  } else if (Math.abs(num) >= 1) {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 5))
  } else if (Math.abs(num) >= 0.1) {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 6))
  } else if (Math.abs(num) >= 0.01) {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 6))
  } else {
    decimals = Math.max(minDecimals, Math.min(maxDecimals, 8))
  }

  // Format the number
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  const sign = showSign && num > 0 ? '+' : ''

  return `${sign}${prefix}${formatted}${suffix}`
}

/**
 * Format a currency value (USD)
 */
export function formatCurrency(
  value: string | number | bigint | undefined | null,
  options: { compact?: boolean; minDecimals?: number; maxDecimals?: number } = {}
): string {
  return formatNumber(value, {
    prefix: '$',
    minDecimals: options.minDecimals ?? 2,
    maxDecimals: options.maxDecimals ?? 2,
    compact: options.compact ?? true,
    ...options,
  })
}

/**
 * Format a token amount with appropriate decimals
 */
export function formatTokenAmount(
  value: string | number | bigint | undefined | null,
  options: { symbol?: string; maxDecimals?: number } = {}
): string {
  const { symbol = '', maxDecimals = 6 } = options
  const formatted = formatNumber(value, {
    minDecimals: 0,
    maxDecimals,
  })
  return symbol ? `${formatted} ${symbol}` : formatted
}

/**
 * Format a percentage value
 */
export function formatPercentage(
  value: string | number | bigint | undefined | null,
  options: { minDecimals?: number; maxDecimals?: number } = {}
): string {
  const { minDecimals = 2, maxDecimals = 2 } = options
  return formatNumber(value, {
    minDecimals,
    maxDecimals,
    suffix: '%',
  })
}

/**
 * Format a price value (for token prices)
 */
export function formatPrice(
  value: string | number | bigint | undefined | null,
  options: { prefix?: string; maxDecimals?: number } = {}
): string {
  const { prefix = '', maxDecimals = 6 } = options
  return formatNumber(value, {
    minDecimals: 2,
    maxDecimals,
    prefix,
  })
}

