import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { SlackAPIClient } from "deno-slack-sdk/deps.ts";
import { RotationDatastore } from "../datastores/rotation.ts";

export const deleteRotation = async (
  inputs: { trigger_id: string },
  client: SlackAPIClient,
) => {
  const response = await client.workflows.triggers.delete({
    trigger_id: inputs.trigger_id,
  });

  if (!response.ok) {
    return {
      error: `Trigger could not be deleted: ${JSON.stringify(response)}.`,
    };
  }

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

  const responses = await Promise.all(
    getResponse.item.trigger_ids?.map((triggerId: string) => {
      return client.workflows.triggers.delete({ trigger_id: triggerId });
    }) ?? [],
  );

  if (responses.some((response) => !response?.ok)) {
    return {
      error: `Triggers could not be deleted: ${JSON.stringify(responses)}.`,
    };
  }

  const datastoreResponse = await client.apps.datastore.delete<
    typeof RotationDatastore.definition
  >({
    datastore: RotationDatastore.name,
    id: inputs.trigger_id,
  });

  if (!datastoreResponse.ok) {
    return {
      error: `Failed to delete rotation data: ${JSON.stringify(
        datastoreResponse,
      )}.`,
    };
  }

  return {
    outputs: {
      name: getResponse.item.name,
    },
  };
};

export const DeleteRotationFunction = DefineFunction({
  callback_id: "delete_rotation_function",
  title: "Delete a rotation",
  source_file: "functions/delete_rotation.ts",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
    },
    required: ["trigger_id"],
  },
});

export default SlackFunction(
  DeleteRotationFunction,
  async ({ inputs, client }) => {
    return await deleteRotation({ trigger_id: inputs.trigger_id }, client);
  },
);
