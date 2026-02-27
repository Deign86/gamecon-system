import clsx from "clsx";
import {
  Gamepad2,
  Dices,
  GraduationCap,
  Ticket,
  Camera,
  Frame,
  Vote,
  DoorOpen,
  Hourglass,
  Landmark,
  MapPin,
} from "lucide-react";

export { clsx as cn };

/** Generate initials from a name */
export function initials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Format Firestore timestamp to readable string */
export function fmtTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Peso formatter */
export function peso(n) {
  return `₱${Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Zone icon mapping — returns a Lucide icon component (not an instance) */
export function getZoneIcon(name = "") {
  const n = name.toLowerCase();
  if (n.includes("esport"))                          return Gamepad2;
  if (n.includes("ttrpg"))                           return Dices;
  if (n.includes("prof"))                            return GraduationCap;
  if (n.includes("ticket"))                          return Ticket;
  if (n.includes("photo"))                           return Camera;
  if (n.includes("gallery") || n.includes("booth")) return Frame;
  if (n.includes("vote") || n.includes("voting"))   return Vote;
  if (n.includes("entrance") || n.includes("exit")) return DoorOpen;
  if (n.includes("holding"))                         return Hourglass;
  if (n.includes("rcy"))                             return Landmark;
  return MapPin;
}
