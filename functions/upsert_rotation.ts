import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { SendReminderWorkflow } from "../workflows/send_reminder.ts";
import {
  DayOfWeek,
  daysOfWeek,
  Frequency,
  RotationDatastore,
  RotationScheduleType,
} from "../datastores/rotation.ts";
import { ScheduledTrigger } from "deno-slack-api/typed-method-types/workflows/triggers/scheduled.ts";

type ScheduledTriggerFrequency = Extract<
  ScheduledTrigger<
    typeof SendReminderWorkflow.definition
  >["schedule"]["frequency"],
  { type: Frequency }
>;

const jsDaysOfWeek = [daysOfWeek[6], ...daysOfWeek.slice(0, 6)];

const computeStartTime = (
  time: string,
  frequency: ScheduledTriggerFrequency,
) => {
  const now = new Date();
  const [hours, minutes] = time.split(":").map(Number);

  const startDate = new Date(now);
  startDate.setHours(hours, minutes, 0, 0);

  if (startDate <= now) {
    if (frequency.type === "daily") {
      startDate.setDate(now.getDate() + 1);
    } else if (frequency.type === "weekly") {
      const sortedDays = frequency.on_days!
        .map((day) => (jsDaysOfWeek.indexOf(day) - now.getDay() + 7) % 7)
        .sort((a, b) => a - b);
      const daysUntilNextOccurrence = sortedDays[0];
      startDate.setDate(now.getDate() + daysUntilNextOccurrence);
    } else if (frequency.type === "monthly") {
      const sortedDays = frequency.on_days!
        .map((day) => (jsDaysOfWeek.indexOf(day) - now.getDay() + 7) % 7)
        .sort((a, b) => a - b);
      const daysUntilNextOccurrence = sortedDays[0];
      startDate.setDate(
        now.getDate() + daysUntilNextOccurrence +
          (daysUntilNextOccurrence <= 0 ? 30 : 0),
      );
    } else {
      throw new Error("Invalid frequency type");
    }
  }

  return startDate.toISOString();
};

export const UpsertRotationFunction = DefineFunction({
  title: "Create or update a scheduled trigger",
  callback_id: "upsert_rotation",
  source_file: "functions/upsert_rotation.ts",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
      name: {
        type: Schema.types.string,
        description: "A short description of the schedule",
      },
      channel: {
        type: Schema.slack.types.channel_id,
        description: "The ID of the channel to create a schedule for",
      },
      roster: {
        type: Schema.types.array,
        items: {
          type: Schema.types.string,
        },
        description: "The list of users in the rotation",
      },
      ...RotationScheduleType.definition.properties,
    },
    required: [
      "name",
      "channel",
      "roster",
      ...RotationScheduleType.definition.required,
    ],
  },
  output_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
        description: "The ID of the trigger created by the Slack API",
      },
    },
    required: ["trigger_id"],
  },
});

export default SlackFunction(
  UpsertRotationFunction,
  async ({ inputs, client }) => {
    let scheduledTrigger;

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

    if (!inputs.trigger_id) {
      scheduledTrigger = await client.workflows.triggers.create<
        typeof SendReminderWorkflow.definition
      >({
        type: TriggerTypes.Scheduled,
        name: `${inputs.name} | ${inputs.channel}`,
        workflow: `#/workflows/${SendReminderWorkflow.definition.callback_id}`,
        inputs: {
          trigger_id: {
            value: "-", // TODO: come up with a more elegant way to handle this
          },
          mode: {
            value: "skip",
          },
        },
        schedule: {
          start_time: computeStartTime(inputs.time, triggerFrequency),
          frequency: triggerFrequency,
        },
      });

      if (!scheduledTrigger?.trigger) {
        return {
          error: `Trigger could not be created: ${
            JSON.stringify(scheduledTrigger)
          }.`,
        };
      }
    }

    const triggerId = scheduledTrigger?.trigger.id ?? inputs.trigger_id!;

    scheduledTrigger = await client.workflows.triggers.update<
      typeof SendReminderWorkflow.definition
    >({
      trigger_id: triggerId,
      type: TriggerTypes.Scheduled,
      name: `${inputs.name} | ${inputs.channel}`,
      workflow: `#/workflows/${SendReminderWorkflow.definition.callback_id}`,
      inputs: {
        trigger_id: {
          value: triggerId,
        },
        mode: {
          value: "skip",
        },
      },
      schedule: {
        start_time: computeStartTime(inputs.time, triggerFrequency),
        frequency: triggerFrequency,
      },
    });

    if (!scheduledTrigger.trigger) {
      return {
        error: `Trigger could not be saved: ${
          JSON.stringify(scheduledTrigger)
        }.`,
      };
    }

    const response = await client.apps.datastore.update<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      item: {
        trigger_id: triggerId,
        channel: inputs.channel,
        name: inputs.name,
        roster: inputs.roster,
        current_queue: inputs.roster, // TODO: null/undefined when creating, (current_queue - roster) when updating?
        frequency: inputs.frequency,
        time: inputs.time,
        repeats_every: inputs.repeats_every,
        on_days: inputs.on_days,
      },
    });

    if (!response.ok) {
      return {
        error: `Failed to upsert rotation: ${JSON.stringify(response)}.`,
      };
    }

    return {
      outputs: { trigger_id: triggerId },
    };
  },
);
