import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { SendReminderWorkflow } from "../workflows/send_reminder.ts";
import {
  DayOfWeek,
  Frequency,
  RotationDatastore,
  RotationScheduleType,
} from "../datastores/rotation.ts";
import { computeStartTime, getTriggerFrequency } from "./upsert_rotation.ts";

export const UpdateRotationFunction = DefineFunction({
  title: "Update a scheduled trigger",
  callback_id: "update_rotation",
  source_file: "functions/update_rotation.ts",
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
        description: "The ID of the channel",
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
      "trigger_id",
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
  UpdateRotationFunction,
  async ({ inputs, client }) => {
    const triggerFrequency = getTriggerFrequency({
      frequency: inputs.frequency as Frequency,
      repeats_every: inputs.repeats_every,
      time: inputs.time,
      on_days: inputs.on_days as DayOfWeek[] | undefined,
    });

    const triggerId = inputs.trigger_id;

    const scheduledTrigger = await client.workflows.triggers.update<
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

    const getResponse = await client.apps.datastore.get<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      id: triggerId,
    });

    if (!getResponse.ok) {
      return {
        error: `Failed to get rotation: ${JSON.stringify(getResponse)}.`,
      };
    }

    const roster = new Set(inputs.roster);

    const response = await client.apps.datastore.update<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      item: {
        trigger_id: triggerId,
        channel: inputs.channel,
        name: inputs.name,
        roster: inputs.roster,
        current_queue: getResponse.item.current_queue.filter(roster.has),
        frequency: inputs.frequency,
        time: inputs.time,
        repeats_every: inputs.repeats_every,
        on_days: inputs.on_days,
      },
    });

    if (!response.ok) {
      return {
        error: `Failed to update rotation: ${JSON.stringify(response)}.`,
      };
    }

    return {
      outputs: { trigger_id: triggerId },
    };
  },
);
