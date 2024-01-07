import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import { SendReminderWorkflow } from "../workflows/send_reminder.ts";
import { RotationDatastore, Schedule } from "../datastores/rotation.ts";

// TODO: Calculate correct start date as a UTC string given time of recurring event ("HH:mm") and schedule (see structure of inputs.frequency object)
const computeStartTime = (time: string, _frequency: Record<string, string>) => {
  console.log(time, _frequency);
  return new Date(
    new Date().toLocaleDateString() + " " + time,
  ).toUTCString();
};

export const UpsertRotationFunction = DefineFunction({
  title: "Create a scheduled trigger",
  callback_id: "send_reminder_trigger",
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
      time: {
        type: Schema.types.string,
        description: "Start date",
      },
      frequency: {
        type: Schema.types.object,
        description: "Frequency",
        // TODO
        // properties: {
        //   number: { type: "integer" },
        //   title: { type: "string" },
        //   body: { type: "string" },
        //   changed_files: { type: "integer" },
        // },
      },
    },
    required: ["name", "channel", "roster", "time", "frequency"],
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
    // let scheduledTrigger;

    // if (!inputs.trigger_id) {
    //   scheduledTrigger = await client.workflows.triggers.create<
    //     typeof SendReminderWorkflow.definition
    //   >({
    //     type: TriggerTypes.Scheduled,
    //     name: `${inputs.name} | ${inputs.channel}`,
    //     workflow: `#/workflows/${SendReminderWorkflow.definition.callback_id}`,
    //     inputs: {
    //       trigger_id: {
    //         value: null,
    //       },
    //       mode: {
    //         value: "skip",
    //       },
    //     },
    //     schedule: {
    //       start_time: computeStartTime(inputs.time, inputs.frequency),
    //       frequency: inputs.frequency,
    //     },
    //   });

    //   if (!scheduledTrigger?.trigger) {
    //     return {
    //       error: `Trigger could not be saved: ${scheduledTrigger.error}.`,
    //     };
    //   }
    // }

    // scheduledTrigger = await client.workflows.triggers.update<
    //   typeof SendReminderWorkflow.definition
    // >({
    //   trigger_id: inputs.trigger_id!,
    //   type: TriggerTypes.Scheduled,
    //   name: `${inputs.name} | ${inputs.channel}`,
    //   workflow: `#/workflows/${SendReminderWorkflow.definition.callback_id}`,
    //   inputs: {
    //     trigger_id: {
    //       value: scheduledTrigger!.trigger.trigger_id ?? inputs.trigger_id,
    //     },
    //     mode: {
    //       value: "skip",
    //     },
    //   },
    //   schedule: {
    //     start_time: computeStartTime(inputs.time, inputs.frequency),
    //     frequency: inputs.frequency,
    //   },
    // });

    // if (!scheduledTrigger.trigger) {
    //   return { error: `Trigger could not be saved ${scheduledTrigger.error}.` };
    // }

    const scheduledTrigger = {
      trigger: { id: Math.floor(Math.random() * 1000).toFixed() },
    };

    console.log({
      frequency: inputs.frequency.type,
      repeats_every: inputs.frequency.repeats_every,
      on_days: inputs.frequency.on_days,
      time: inputs.time,
    } as Schedule);

    const response = await client.apps.datastore.update<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      item: {
        trigger_id: scheduledTrigger.trigger.id,
        channel: inputs.channel,
        name: inputs.name,
        roster: inputs.roster,
        current_queue: inputs.roster, // TODO: null/undefined when creating, (current_queue - roster) when updating?
        ...{
          time: inputs.time,
          frequency: inputs.frequency.type,
          repeats_every: inputs.frequency.repeats_every,
          on_days: inputs.frequency.on_days ?? [],
        } as Schedule,
      },
    });

    if (!response.ok) {
      return { error: `Failed to upsert rotation: ${response}.` };
    }

    return {
      outputs: { trigger_id: scheduledTrigger.trigger.id },
    };
  },
);
