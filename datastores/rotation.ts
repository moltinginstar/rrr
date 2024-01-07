import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const RotationDatastore = DefineDatastore({
  name: "rotation",
  primary_key: "trigger_id",
  attributes: {
    trigger_id: {
      type: Schema.types.string,
      required: true,
    },
    name: {
      type: Schema.types.string,
      required: true,
    },
    channel: {
      type: Schema.slack.types.channel_id,
      required: true,
    },
    roster: {
      type: Schema.types.array,
      required: true,
      items: {
        type: Schema.slack.types.user_id,
      },
    },
    current_queue: {
      type: Schema.types.array,
      required: true,
      items: {
        type: Schema.slack.types.user_id,
      },
    },
  },
});
