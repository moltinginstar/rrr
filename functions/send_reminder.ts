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
      blocks: [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": `It’s <@${
              rotation.current_queue[0]
            }>’s turn to be ${rotation.name.toLowerCase()}.`,
          },
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {
                "type": "plain_text",
                "text": "Confirm",
              },
              "style": "primary",
              "action_id": "confirm_turn",
            },
            {
              "type": "workflow_button",
              "text": {
                "type": "plain_text",
                "text": "Postpone",
              },
              "action_id": "postpone_turn",
              "workflow": {
                "trigger": {
                  "url": "https://slack.com/shortcuts/Ft067FSBPBLH/d080870384441bbb795d15b85e21a67b",
                  "customizable_input_parameters": [
                    {
                      "name": "trigger_id",
                      "value": rotation.trigger_id,
                    },
                    {
                      "name": "mode",
                      "value": "postpone",
                    },
                  ],
                },
              },
            },
            {
              "type": "workflow_button",
              "text": {
                "type": "plain_text",
                "text": "Skip",
              },
              "action_id": "skip_turn",
              "workflow": {
                "trigger": {
                  "url": "https://slack.com/shortcuts/Ft067FSBPBLH/d080870384441bbb795d15b85e21a67b",
                  "customizable_input_parameters": [
                    {
                      "name": "trigger_id",
                      "value": rotation.trigger_id,
                    },
                    {
                      "name": "mode",
                      "value": "skip",
                    },
                  ],
                },
              },
            },
          ],
        },
      ],
    });

    if (!message.ok) {
      return { error: `Failed to send reminder: ${message.error}` };
    }

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  ["confirm_turn", "postpone_turn", "skip_turn"],
  async ({ body, inputs, action, client }) => {
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

    if (action.action_id === "confirm_turn") {
      const response = await client.chat.update({
        channel: body.container.channel_id,
        ts: body.container.message_ts,
        blocks: [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": `It’s <@${
                rotation.current_queue[0]
              }>’s turn to be ${rotation.name.toLowerCase()}.`,
            },
          },
        ],
      });

      if (!response.ok) {
        return { error: `Error during chat.update ${response.error}.` };
      }

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    } else {
      const response = await client.chat.delete({
        channel: body.container.channel_id,
        ts: body.container.message_ts,
      });

      if (!response.ok) {
        return { error: `Error during chat.update ${response.error}.` };
      }

      // TODO: does this stop the workflow?
      await client.functions.completeError({
        function_execution_id: body.function_data.execution_id,
        error: "Aborting the workflow.",
      });
    }
  },
);
