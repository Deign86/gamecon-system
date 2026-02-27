import { cn } from "../../lib/utils";

/**
 * Small pill badge showing Active or Disabled status.
 */
export default function UserStatusBadge({ active }) {
  return (
    <span
      className={cn(
        "gc-chip",
        active ? "gc-chip-green" : "gc-chip-red"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-gc-success" : "bg-gc-danger"
        )}
      />
      {active ? "Active" : "Disabled"}
    </span>
  );
}
