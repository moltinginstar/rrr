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
    },
    required: ["trigger_id"],
  },
});

SendReminderWorkflow.addStep(
  SendReminderFunction,
  {
    trigger_id: SendReminderWorkflow.inputs.trigger_id,
  },
);
SendReminderWorkflow.addStep(
  RotateFunction,
  {
    trigger_id: SendReminderWorkflow.inputs.trigger_id,
  },
);
