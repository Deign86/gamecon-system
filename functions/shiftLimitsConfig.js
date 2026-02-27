/**
 * Server-side shift limits configuration.
 * Mirrors src/lib/shiftLimitsConfig.js — keep both in sync.
 *
 * Committee IDs match COMMITTEES[].id from seed data.
 */

const DEFAULT_SHIFT_LIMITS = {
  // Exhibitors: 1 per booth per block
  "exhibitors": { min: 1, max: 1 },

  // Ticketing & Voting combined
  "ticketing_voting": { min: 3, max: 4 },

  // Crowd Control: 12–24
  "crowd-control": { min: 12, max: 24 },

  // Documentation (photographers): 2–4
  "documentation": { min: 2, max: 4 },

  // Guest Relations: 4–6 per block
  "guest-relations": { min: 4, max: 6 },

  // Marketing: 2 per block
  "marketing": { min: 2, max: 2 },

  // Awards & Prizes: 0–4 default (Day 1 = optional, Day 2 = required)
  "awards-prizes": { min: 0, max: 4 },
};

/**
 * Per-day-block overrides.
 */
const DAY_BLOCK_OVERRIDES = {
  "d2-morning__awards-prizes":   { min: 2, max: 4 },
  "d2-afternoon__awards-prizes": { min: 2, max: 4 },
};

/**
 * Resolve the limit key for a committee (handles combined ticketing/voting).
 * @param {string} committeeId
 * @returns {string}
 */
function limitKeyForCommittee(committeeId) {
  if (committeeId === "ticketing" || committeeId === "voting") return "ticketing_voting";
  return committeeId;
}

/**
 * Get effective limits for a committee in a specific day-block.
 * @param {string} committeeId
 * @param {string} [dayBlock]
 * @returns {{ min: number, max: number } | undefined}
 */
function getShiftLimits(committeeId, dayBlock) {
  if (dayBlock) {
    const overrideKey = `${dayBlock}__${committeeId}`;
    if (DAY_BLOCK_OVERRIDES[overrideKey]) return DAY_BLOCK_OVERRIDES[overrideKey];
  }
  const key = limitKeyForCommittee(committeeId);
  return DEFAULT_SHIFT_LIMITS[key];
}

module.exports = { DEFAULT_SHIFT_LIMITS, DAY_BLOCK_OVERRIDES, limitKeyForCommittee, getShiftLimits };
