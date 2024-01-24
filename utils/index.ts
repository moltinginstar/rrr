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

  const formattedTime = date.format("h:mm");
  let formattedAmPm = date.format("a");
  const formattedTimezone = date.format("ZZZ");

  // Ptera is using AM for noon so we need to manually override it
  // https://github.com/Tak-Iwamoto/ptera/issues/39
  if (time === "00:00") {
    formattedAmPm = "AM";
  } else if (time === "12:00") {
    formattedAmPm = "PM";
  }

  return `${formattedTime} ${formattedAmPm} ${formattedTimezone}`;
};

export const timezoneToParts = (timezone: string) => {
  return timezone.replace(/_/g, " ").split("/", 2);
};
