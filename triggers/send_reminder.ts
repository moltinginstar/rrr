import { Trigger } from "deno-slack-api/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import SendReminderWorkflow from "../workflows/send_reminder.ts";

const sendReminderTrigger: Trigger<typeof SendReminderWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Send a reminder",
  workflow: `#/workflows/${SendReminderWorkflow.definition.callback_id}`,
  inputs: {
    trigger_id: {
      customizable: true,
    },
    mode: {
      customizable: true,
    },
    replace_last: {
      value: "true",  // Slack doesn't support boolean values for trigger inputs
    },
  },
};

export default sendReminderTrigger;
