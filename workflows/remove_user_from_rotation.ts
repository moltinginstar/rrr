import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { RemoveUserFromRotationFunction } from "../functions/remove_user_from_rotation.ts";

export const RemoveUserFromRotationWorkflow = DefineWorkflow({
  callback_id: "remove_user_from_rotation",
  title: "Remove a user from a rotation",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
      user_id: {
        type: Schema.slack.types.user_id,
      },
    },
    required: ["trigger_id", "user_id"],
  },
});

RemoveUserFromRotationWorkflow.addStep(RemoveUserFromRotationFunction, {
  trigger_id: RemoveUserFromRotationWorkflow.inputs.trigger_id,
  user_id: RemoveUserFromRotationWorkflow.inputs.user_id,
});

export default RemoveUserFromRotationWorkflow;
