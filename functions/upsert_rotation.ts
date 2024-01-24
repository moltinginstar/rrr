import { datetime } from "ptera/mod.ts";

import { SendReminderWorkflow } from "../workflows/send_reminder.ts";
import { Schedule } from "../datastores/rotation.ts";
import { ScheduledTrigger } from "deno-slack-api/typed-method-types/workflows/triggers/scheduled.ts";
import { jsDayOfWeekIndices } from "../consts/index.ts";
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

const getDaysUntilNextOccurrence = (
  daysOfWeek: DayOfWeek[],
  jsCurrentDayOfWeek: number,
  includeCurrentDayOfWeek = false,
) => {
  const offset = includeCurrentDayOfWeek ? 0 : 7;
  const sortedDays = daysOfWeek
    .map(
      (day) => (jsDayOfWeekIndices[day] - jsCurrentDayOfWeek + 7) % 7 || offset,
    )
    .sort((a, b) => a - b);

  return sortedDays[0];
};

// TODO: PDT starts on 2024-03-12 2:00 AM PST, but Ptera thinks it starts at 10:00 AM PST.
export const computeStartTime = (
  time: Time,
  timezone: string,
  frequency: ScheduledTriggerFrequency,
) => {
  const [hours, minutes] = time.split(":").map(Number);

  const _now = datetime(new Date(), { timezone });
  const _startDate = datetime(
    {
      year: _now.year,
      month: _now.month,
      day: _now.day,
      hour: hours,
      minute: minutes,
    },
    { timezone },
  );

  const now = _now.toJSDate();
  const startDate = _startDate.toJSDate();

  switch (frequency.type) {
    case "daily": {
      if (startDate <= now) {
        startDate.setDate(now.getDate() + 1);
      }

      break;
    }
    case "weekly":
    case "monthly": {
      const daysUntilNextOccurrence = getDaysUntilNextOccurrence(
        frequency.on_days!,
        now.getDay(),
        startDate > now,
      );
      startDate.setDate(now.getDate() + daysUntilNextOccurrence);

      break;
    }
    default:
      throw new RangeError(
        'Frequency must be "daily", "weekly", or "monthly".',
      );
  }

  return startDate.toISOString();
};
