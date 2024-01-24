import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { TriggerEventTypes, TriggerTypes } from "deno-slack-api/mod.ts";
import { SendReminderWorkflow } from "../workflows/send_reminder.ts";
import {
  RotationDatastore,
  RotationScheduleType,
} from "../datastores/rotation.ts";
import { computeStartTime, getTriggerFrequency } from "./upsert_rotation.ts";
import RemoveUserFromRotationWorkflow from "../workflows/remove_user_from_rotation.ts";
import type { DayOfWeek, Frequency, Time } from "../types/index.ts";

export const CreateRotationFunction = DefineFunction({
  title: "Create a scheduled trigger",
  callback_id: "create_rotation_function",
  source_file: "functions/create_rotation.ts",
  input_parameters: {
    properties: {
      name: {
        type: Schema.types.string,
        description: "A short description of the rotation",
      },
      channel: {
        type: Schema.slack.types.channel_id,
        description: "The ID of the channel to create a rotation for",
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
  CreateRotationFunction,
  async ({ inputs, client }) => {
    const triggerFrequency = getTriggerFrequency({
      frequency: inputs.frequency as Frequency,
      repeats_every: inputs.repeats_every,
      time: inputs.time as Time,
      timezone: inputs.timezone,
      on_days: inputs.on_days as DayOfWeek[] | undefined,
    });

    const startTime = computeStartTime(
      inputs.time as Time,
      inputs.timezone,
      triggerFrequency,
    );

    let scheduledTrigger = await client.workflows.triggers.create<
      typeof SendReminderWorkflow.definition
    >({
      type: TriggerTypes.Scheduled,
      name: `${inputs.name} | ${inputs.channel}`,
      workflow: `#/workflows/${SendReminderWorkflow.definition.callback_id}`,
      inputs: {
        trigger_id: {
          value: "-", // Inelegant but works
        },
        mode: {
          value: "skip",
        },
      },
      schedule: {
        start_time: startTime,
        timezone: inputs.timezone,
        frequency: triggerFrequency,
      },
    });

    if (!scheduledTrigger.trigger) {
      return {
        error: `Trigger could not be created: ${JSON.stringify(
          scheduledTrigger,
        )}.`,
      };
    }

    const triggerId = scheduledTrigger.trigger.id;

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
        start_time: startTime,
        timezone: inputs.timezone,
        frequency: triggerFrequency,
      },
    });

    if (!scheduledTrigger.trigger) {
      return {
        error: `Trigger could not be saved: ${JSON.stringify(
          scheduledTrigger,
        )}.`,
      };
    }

    const userLeavesResponse = await client.workflows.triggers.create<
      typeof RemoveUserFromRotationWorkflow.definition
    >({
      type: TriggerTypes.Event,
      name: "Update roster when user leaves channel",
      workflow: `#/workflows/${RemoveUserFromRotationWorkflow.definition.callback_id}`,
      event: {
        event_type: TriggerEventTypes.UserLeftChannel,
        channel_ids: [inputs.channel],
      },
      inputs: {
        trigger_id: {
          value: triggerId,
        },
        user_id: {
          value: "{{data.user_id}}",
        },
      },
    });

    if (!userLeavesResponse.ok) {
      return {
        error: `Failed to create trigger: ${JSON.stringify(
          userLeavesResponse,
        )}.`,
      };
    }

    const response = await client.apps.datastore.put<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      item: {
        trigger_id: triggerId,
        channel: inputs.channel,
        name: inputs.name,
        roster: inputs.roster,
        frequency: inputs.frequency,
        time: inputs.time,
        timezone: inputs.timezone,
        repeats_every: inputs.repeats_every,
        on_days: inputs.on_days,
        trigger_ids: [userLeavesResponse.trigger.id],
      },
    });

    if (!response.ok) {
      return {
        error: `Failed to create rotation: ${JSON.stringify(response)}.`,
      };
    }

    return {
      outputs: { trigger_id: triggerId },
    };
  },
);
