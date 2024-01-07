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
  frequency: ScheduledTriggerFrequency,
) => {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);

  const startDate = new Date(now);
  startDate.setHours(hours, minutes);

  if (startDate <= now) {
    if (frequency.type === "daily") {
      startDate.setDate(now.getDate() + 1);
    } else if (frequency.type === "weekly") {
      const sortedDays = frequency
        .on_days!.map(
          (day) => (jsDaysOfWeek.indexOf(day) - now.getDay() + 7) % 7,
        )
        .sort((a, b) => a - b);
      const daysUntilNextOccurrence = sortedDays[0];
      startDate.setDate(now.getDate() + daysUntilNextOccurrence);
    } else if (frequency.type === "monthly") {
      const sortedDays = frequency
        .on_days!.map(
          (day) => (jsDaysOfWeek.indexOf(day) - now.getDay() + 7) % 7,
        )
        .sort((a, b) => a - b);
      const daysUntilNextOccurrence = sortedDays[0];
      startDate.setDate(
        now.getDate() +
          daysUntilNextOccurrence +
          (daysUntilNextOccurrence <= 0 ? 30 : 0),
      );
    } else {
      throw new Error("Invalid frequency type");
    }
  }

  return startDate.toISOString();
};
