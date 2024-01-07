import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "../datastores/rotation.ts";

export const RotateFunction = DefineFunction({
  callback_id: "rotate_function",
  title: "Rotate roles",
  source_file: "functions/rotate.ts",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
    },
    required: ["trigger_id"],
  },
});

export default SlackFunction(RotateFunction, async ({ inputs, client }) => {
  const rotations = await client.apps.datastore.query<
    typeof RotationDatastore.definition
  >({
    datastore: RotationDatastore.name,
    expression: "#trigger_id = :trigger_id",
    expression_attributes: { "#trigger_id": "trigger_id" },
    expression_values: { ":trigger_id": inputs.trigger_id },
  });
  const rotation = rotations.items[0];

  if (!rotations.ok || !rotation) {
    return { error: `Failed to fetch rotation: ${rotations.error}` };
  }

  const response = await client.apps.datastore.update<
    typeof RotationDatastore.definition
  >({
    datastore: RotationDatastore.name,
    item: {
      trigger_id: inputs.trigger_id,
      current_queue: rotation.current_queue.length > 1
        ? rotation.current_queue.slice(1)
        : rotation.roster,
    },
  });

  if (!response.ok) {
    return { error: `Failed to rotate: ${response.error}` };
  }

  return {
    outputs: {},
  };
});