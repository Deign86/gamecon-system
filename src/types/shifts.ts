// Type definitions for Shift models (informational)
export type DayBlock =
  | "d1-morning"
  | "d1-afternoon"
  | "d2-morning"
  | "d2-afternoon";

export interface RoleShiftLimit {
  min: number;
  max: number;
}

export interface ShiftLimitsConfig {
  [committeeId: string]: RoleShiftLimit;
}

export interface CommitteeShift {
  id: string; // `${dayBlock}_${committeeId}`
  dayBlock: DayBlock;
  committeeId: string;
  committeeName: string;
  assignees: { userId: string; name: string }[];
  minRequired: number;
  maxAllowed: number;
  updatedAt?: any;
  updatedBy?: string;
}

export default CommitteeShift;
