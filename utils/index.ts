import type { Time } from "../types/index.ts";

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatTime = (time: Time, locale = "en-US") => {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes);

  const timestamp = Math.floor(date.getTime() / 1000);
  const fallback = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  });

  return `<!date^${timestamp}^{time}|${fallback}>`;
};
