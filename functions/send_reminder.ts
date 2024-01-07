import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "../datastores/rotation.ts";

export const SendReminderFunction = DefineFunction({
  callback_id: "send_reminder_function",
  title: "Send a reminder",
  source_file: "functions/send_reminder.ts",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
    },
    required: ["trigger_id"],
  },
});

export default SlackFunction(
  SendReminderFunction,
  async ({ inputs, client }) => {
    const rotations = await client.apps.datastore.query<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      expression: "#trigger_id = :trigger_id",
      expression_attributes: { "#trigger_id": "trigger_id" },
      expression_values: { ":trigger_id": inputs.trigger_id },
    });
    const rotation = rotations.items[0];

    if (!rotations.ok || !rotation) {
      return { error: `Failed to fetch rotation: ${rotations.error}` };
    }

    const message = await client.chat.postMessage({
      channel: rotation.channel,
      text: `It's @${
        rotation.current_queue[0]
      }'s turn to be ${rotation.name.toLowerCase()}.`,
    });

    if (!message.ok) {
      return { error: `Failed to send reminder: ${message.error}` };
    }

    return {
      outputs: {},
    };
  },
);
