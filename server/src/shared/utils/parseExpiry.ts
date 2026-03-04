/**
 * Convert a duration string (e.g. "15m", "7d", "1h") to milliseconds.
 * Accepted units: s (seconds), m (minutes), h (hours), d (days).
 * Returns 15 minutes as a fallback for unparseable input.
 */
export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 60 * 1000);
}
