import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  RotationDatastore,
  RotationScheduleType,
} from "../datastores/rotation.ts";

export const GetRotationFunction = DefineFunction({
  callback_id: "get_rotation_function",
  title: "Get a rotation",
  source_file: "functions/get_rotation.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      trigger_id: {
        type: Schema.types.string,
      },
    },
    required: ["trigger_id"],
  },
  output_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
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
});

export default SlackFunction(
  GetRotationFunction,
  async ({ inputs, client }) => {
    const response = await client.apps.datastore.get<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      id: inputs.trigger_id,
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch rotation: ${JSON.stringify(response)}.`,
      };
    }

    return {
      outputs: {
        interactivity: inputs.interactivity,
        name: response.item.name,
        channel: response.item.channel,
        roster: response.item.roster,
        time: response.item.time,
        frequency: response.item.frequency,
        repeats_every: response.item.repeats_every,
        on_days: response.item.on_days,
      },
    };
  },
);
