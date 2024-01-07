import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "../datastores/rotation.ts";

export const sendReminderTriggerUrl =
  "https://slack.com/shortcuts/Ft067NEMFMDG/6c580202e159ba1c664bc213bb6c339b";

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
    const rotationsResponse = await client.apps.datastore.get<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      id: inputs.trigger_id,
    });
    const rotation = rotationsResponse.item;

    if (!rotationsResponse.ok || !rotation) {
      return { error: `Failed to fetch rotation: ${rotationsResponse.error}.` };
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
            }>’s turn to be \`${rotation.name}\`.`,
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
                  "url": sendReminderTriggerUrl,
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
                  "url": sendReminderTriggerUrl,
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
      return { error: `Failed to send reminder: ${message.error}.` };
    }

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  ["confirm_turn", "postpone_turn", "skip_turn"],
  async ({ body, inputs, action, client }) => {
    const rotationsResponse = await client.apps.datastore.get<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      id: inputs.trigger_id,
    });
    const rotation = rotationsResponse.item;

    if (!rotationsResponse.ok || !rotation) {
      return { error: `Failed to fetch rotation: ${rotationsResponse.error}.` };
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
              }>’s turn to be \`${rotation.name}\`.`,
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
      // TODO: handle postpone and skip differently
      const response = await client.chat.delete({
        channel: body.container.channel_id,
        ts: body.container.message_ts,
      });

      if (!response.ok) {
        return { error: `Error during chat.update ${response.error}.` };
      }

      await client.functions.completeError({
        function_execution_id: body.function_data.execution_id,
        error: "Aborting the workflow...",
      });
    }
  },
);
