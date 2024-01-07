import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/deps.ts";
import { RotationDatastore } from "../datastores/rotation.ts";
import { listRotations } from "./list_rotations.ts";

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

export const deleteRotations = async (
  inputs: { channel: string },
  client: SlackAPIClient,
) => {
  const rotations = await listRotations(inputs, client);
  if (rotations.error) {
    return rotations;
  }

  const responses = await Promise.all(
    rotations.outputs!.rotations.map(async (rotation) => {
      const response = await client.workflows.triggers.delete({
        trigger_id: rotation.trigger_id,
      });

      if (!response.ok) {
        return {
          error: `Trigger could not be deleted: ${JSON.stringify(response)}.`,
        };
      }

      const responses = await Promise.all(
        rotation.trigger_ids?.map((triggerId: string) => {
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
        id: rotation.trigger_id,
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
          name: rotation.name,
        },
      };
    }),
  );

  if (responses.some((response) => response.error)) {
    return {
      error: `Triggers could not be deleted: ${JSON.stringify(responses)}.`,
    };
  }

  return {
    outputs: {
      rotations: responses.map((response) => response.outputs?.name),
    },
  };
};

export const DeleteRotationsFunction = DefineFunction({
  callback_id: "delete_rotations_function",
  title: "Delete a rotation",
  source_file: "functions/delete_rotations.ts",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["channel"],
  },
});

export default SlackFunction(
  DeleteRotationsFunction,
  async ({ inputs, client }) => {
    return await deleteRotations(inputs, client);
  },
);
