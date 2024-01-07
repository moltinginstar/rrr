import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { DeleteRotationFunction } from "../functions/delete_rotation.ts";

export const DeleteRotationWorkflow = DefineWorkflow({
  callback_id: "delete_rotation",
  title: "Delete a rotations",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
    },
    required: ["trigger_id"],
  },
});

DeleteRotationWorkflow.addStep(DeleteRotationFunction, {
  trigger_id: DeleteRotationWorkflow.inputs.trigger_id,
});

export default DeleteRotationWorkflow;
