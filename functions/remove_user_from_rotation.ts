import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "../datastores/rotation.ts";

export const RemoveUserFromRotationFunction = DefineFunction({
  title: "Remove a user from a rotation",
  callback_id: "remove_user_from_rotation_function",
  source_file: "functions/remove_user_from_rotation.ts",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
      user_id: {
        type: Schema.slack.types.user_id,
      },
    },
    required: [
      "trigger_id",
      "user_id",
    ],
  },
});

export default SlackFunction(
  RemoveUserFromRotationFunction,
  async ({ inputs, client }) => {
    const getResponse = await client.apps.datastore.get<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      id: inputs.trigger_id,
    });

    if (!getResponse.ok) {
      return {
        error: `Failed to get rotation: ${JSON.stringify(getResponse)}.`,
      };
    }

    const roster = new Set(
      getResponse.item.roster.filter((user: string) => user !== inputs.user_id),
    );
    const response = await client.apps.datastore.update<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      item: {
        trigger_id: inputs.trigger_id,
        roster: [...roster],
        current_queue: getResponse.item.current_queue?.filter(roster.has.bind(roster)),
      },
    });

    if (!response.ok) {
      return {
        error: `Failed to update rotation: ${JSON.stringify(response)}.`,
      };
    }

    return {
      outputs: {},
    };
  },
);
