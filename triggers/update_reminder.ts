import { Trigger } from "deno-slack-api/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import { UpdateRotationWorkflow } from "../workflows/update_rotation.ts";

const updateReminderTrigger: Trigger<typeof UpdateRotationWorkflow.definition> =
  {
    type: TriggerTypes.Shortcut,
    name: "Update a rotation",
    workflow: `#/workflows/${UpdateRotationWorkflow.definition.callback_id}`,
    inputs: {
      interactivity: {
        value: TriggerContextData.Shortcut.interactivity,
      },
      channel: {
        value: TriggerContextData.Shortcut.channel_id,
      },
      trigger_id: {
        customizable: true,
      },
    },
  };

export default updateReminderTrigger;
