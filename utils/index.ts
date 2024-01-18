import dayjs from "dayjs";

import type { Time } from "../types/index.ts";

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// TODO: dayjs not working in production
export const formatTime = (time: Time, timezone: string) => {
  const [hours, minutes] = time.split(":").map(Number);

  const date = dayjs
    .tz(new Date(), timezone)
    .startOf("d")
    .hour(hours)
    .minute(minutes);

  return date.format("LT z");
};

export const timezoneToParts = (timezone: string) => {
  return timezone.replace("_", " ").split("/", 2);
};
