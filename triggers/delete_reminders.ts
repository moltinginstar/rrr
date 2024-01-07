import { Trigger } from "deno-slack-api/types.ts";
import {
  TriggerContextData,
  TriggerEventTypes,
  TriggerTypes,
} from "deno-slack-api/mod.ts";
import { DeleteRotationsWorkflow } from "../workflows/delete_rotations.ts";

const deleteRemindersTrigger: Trigger<
  typeof DeleteRotationsWorkflow.definition
> = {
  type: TriggerTypes.Event,
  name: "Delete rotations",
  event: {
    event_type: TriggerEventTypes.ChannelDeleted,
  },
  workflow: `#/workflows/${DeleteRotationsWorkflow.definition.callback_id}`,
  inputs: {
    channel: {
      value: TriggerContextData.Event.ChannelDeleted.channel_id,
    },
  },
};

export default deleteRemindersTrigger;
