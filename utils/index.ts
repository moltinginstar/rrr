import type { Time } from "../types/index.ts";

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatTime = (time: Time, locale = "en-US") => {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes);

  return date.toLocaleTimeString(locale, { timeStyle: "short" });
};
