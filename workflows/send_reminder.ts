import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SendReminderFunction } from "../functions/send_reminder.ts";
import { RotateFunction } from "../functions/rotate.ts";

export const SendReminderWorkflow = DefineWorkflow({
  callback_id: "send_reminder",
  title: "Send a reminder",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
      mode: {
        type: Schema.types.string,
        enum: ["skip", "postpone"],
      },
      replace_last: {
        type: Schema.types.string,
        default: "false",
      },
    },
    required: ["trigger_id", "mode"],
  },
});

SendReminderWorkflow.addStep(
  RotateFunction,
  {
    trigger_id: SendReminderWorkflow.inputs.trigger_id,
    mode: SendReminderWorkflow.inputs.mode,
  },
);

SendReminderWorkflow.addStep(
  SendReminderFunction,
  {
    trigger_id: SendReminderWorkflow.inputs.trigger_id,
    replace_last: SendReminderWorkflow.inputs.replace_last === "true",
  },
);

export default SendReminderWorkflow;
