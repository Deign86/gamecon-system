/**
 * Shift limits configuration — minimum staff per committee per block.
 * No maximum limits are enforced; only minimums apply.
 * Committee IDs should match `COMMITTEES[].id` from seed data.
 */
export const DEFAULT_SHIFT_LIMITS = {
  // Exhibitors: 2 per block (morning and afternoon)
  "exhibitors": { min: 2 },

  // Ticketing & Voting combined: minimum 3 people per block
  // We'll use this key for combined checks; individual 'ticketing'/'voting'
  // logic will map to this when evaluating limits.
  "ticketing_voting": { min: 3 },

  // Crowd Control: minimum 12
  "crowd-control": { min: 12 },

  // Documentation (photographers on floor): minimum 2
  "documentation": { min: 2 },

  // Guest Relations: minimum 4 per block
  "guest-relations": { min: 4 },

  // Marketing: minimum 2 per block
  "marketing": { min: 2 },

  // Awards & Prizes: 0 required by default (Day 1 = optional, Day 2 = required)
  "awards-prizes": { min: 0 },
};

/**
 * Per-day-block overrides — takes precedence over DEFAULT_SHIFT_LIMITS
 * when a matching dayBlock + committeeId entry exists.
 */
export const DAY_BLOCK_OVERRIDES = {
  // Awards needs at least 2 staff on Day 2 blocks
  "d2-morning__awards-prizes":   { min: 2 },
  "d2-afternoon__awards-prizes": { min: 2 },
};

/**
 * Helper to resolve committee-specific limit key (handles combined keys).
 * @param {string} committeeId
 */
export function limitKeyForCommittee(committeeId) {
  if (committeeId === "ticketing" || committeeId === "voting") return "ticketing_voting";
  return committeeId;
}

/**
 * Resolve the effective shift limits for a committee in a specific day-block.
 * Checks DAY_BLOCK_OVERRIDES first, then falls back to DEFAULT_SHIFT_LIMITS.
 *
 * @param {string} committeeId
 * @param {string} [dayBlock] — e.g. "d2-morning"
 * @returns {{ min: number, max: number } | undefined}
 */
export function getShiftLimits(committeeId, dayBlock) {
  if (dayBlock) {
    const overrideKey = `${dayBlock}__${committeeId}`;
    if (DAY_BLOCK_OVERRIDES[overrideKey]) return DAY_BLOCK_OVERRIDES[overrideKey];
  }
  const key = limitKeyForCommittee(committeeId);
  return DEFAULT_SHIFT_LIMITS[key];
}

export default DEFAULT_SHIFT_LIMITS;
