import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { ListRotationsFunction } from "../functions/list_rotations.ts";

export const ListRotationsWorkflow = DefineWorkflow({
  callback_id: "list_rotations",
  title: "List rotations",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel: {
        type: Schema.slack.types.channel_id,
      },
    },
    required: ["interactivity", "channel"],
  },
});

ListRotationsWorkflow.addStep(ListRotationsFunction, {
  interactivity: ListRotationsWorkflow.inputs.interactivity,
  channel: ListRotationsWorkflow.inputs.channel,
});

export default ListRotationsWorkflow;
