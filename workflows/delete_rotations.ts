import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { DeleteRotationsFunction } from "../functions/delete_rotations.ts";

export const DeleteRotationsWorkflow = DefineWorkflow({
  callback_id: "delete_rotations",
  title: "Delete rotations",
  input_parameters: {
    properties: {
      channel: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["channel"],
  },
});

DeleteRotationsWorkflow.addStep(DeleteRotationsFunction, {
  channel: DeleteRotationsWorkflow.inputs.channel,
});

export default DeleteRotationsWorkflow;
