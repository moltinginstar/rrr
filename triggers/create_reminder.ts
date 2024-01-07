import { Trigger } from "deno-slack-api/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import CreateRotationWorkflow from "../workflows/create_rotation.ts";

const createReminderTrigger: Trigger<typeof CreateRotationWorkflow.definition> =
  {
    type: TriggerTypes.Shortcut,
    name: "Create a rotation",
    workflow: `#/workflows/${CreateRotationWorkflow.definition.callback_id}`,
    inputs: {
      interactivity: {
        value: TriggerContextData.Shortcut.interactivity,
      },
      channel: {
        value: TriggerContextData.Shortcut.channel_id,
      },
    },
  };

export default createReminderTrigger;
