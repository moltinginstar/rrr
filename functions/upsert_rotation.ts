import dayjs from "dayjs";

import { SendReminderWorkflow } from "../workflows/send_reminder.ts";
import { Schedule } from "../datastores/rotation.ts";
import { ScheduledTrigger } from "deno-slack-api/typed-method-types/workflows/triggers/scheduled.ts";
import { daysOfWeek } from "../consts/index.ts";
import type { DayOfWeek, Frequency, Time } from "../types/index.ts";

export type ScheduledTriggerFrequency = Extract<
  ScheduledTrigger<
    typeof SendReminderWorkflow.definition
  >["schedule"]["frequency"],
  { type: Frequency }
>;

export const getTriggerFrequency = (inputs: Schedule) => {
  let triggerFrequency: ScheduledTriggerFrequency;
  if (inputs.frequency === "daily") {
    triggerFrequency = {
      type: inputs.frequency,
      repeats_every: inputs.repeats_every,
    };
  } else if (inputs.frequency === "weekly") {
    triggerFrequency = {
      type: inputs.frequency,
      repeats_every: inputs.repeats_every,
      on_days: inputs.on_days as DayOfWeek[],
    };
  } else {
    triggerFrequency = {
      type: inputs.frequency as "monthly",
      repeats_every: inputs.repeats_every,
      on_days: inputs.on_days as [DayOfWeek],
    };
  }

  return triggerFrequency;
};

export const jsDaysOfWeek = [daysOfWeek[6], ...daysOfWeek.slice(0, 6)];

export const computeStartTime = (
  time: Time,
  timezone: string,
  frequency: ScheduledTriggerFrequency,
) => {
  const now = dayjs.tz(new Date(), timezone);
  const [hours, minutes] = time.split(":").map(Number);

  let startDate = dayjs
    .tz(now, timezone)
    .startOf("d")
    .hour(hours)
    .minute(minutes);

  if (startDate <= now) {
    switch (frequency.type) {
      case "daily":
        startDate = startDate.date(now.date() + 1);
        break;
      case "weekly": {
        const sortedDays = frequency
          .on_days!.map(
            (day) => (jsDaysOfWeek.indexOf(day) - now.day() + 7) % 7,
          )
          .sort((a, b) => a - b);
        const daysUntilNextOccurrence = sortedDays[0];
        startDate = startDate.date(now.date() + daysUntilNextOccurrence);
        break;
      }
      case "monthly": {
        const sortedDays = frequency
          .on_days!.map(
            (day) => (jsDaysOfWeek.indexOf(day) - now.day() + 7) % 7,
          )
          .sort((a, b) => a - b);
        const daysUntilNextOccurrence = sortedDays[0];
        startDate = startDate.date(
          now.date() +
            daysUntilNextOccurrence +
            (daysUntilNextOccurrence <= 0 ? 30 : 0),
        );
        break;
      }
      default:
        throw new RangeError(
          'Frequency must be "daily", "weekly", or "monthly".',
        );
    }
  }

  return startDate.toISOString();
};
