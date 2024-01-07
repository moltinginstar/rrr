import { Trigger } from "deno-slack-api/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import ListRotationsWorkflow from "../workflows/list_rotations.ts";

const listRotationsTrigger: Trigger<typeof ListRotationsWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "List rotations",
  workflow: `#/workflows/${ListRotationsWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    channel: {
      value: TriggerContextData.Shortcut.channel_id,
    },
  },
};

export default listRotationsTrigger;
