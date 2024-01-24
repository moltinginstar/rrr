import { datetime } from "ptera/mod.ts";
import type { Time } from "../types/index.ts";

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatTime = (time: Time, timezone: string) => {
  const [hours, minutes] = time.split(":").map(Number);

  const now = datetime(new Date(), { timezone });
  const date = datetime(
    {
      year: now.year,
      month: now.month,
      day: now.day,
      hour: hours,
      minute: minutes,
    },
    { timezone },
  );

  return date.format("h:mm a ZZZ");
};

export const timezoneToParts = (timezone: string) => {
  return timezone.replace(/_/g, " ").split("/", 2);
};
