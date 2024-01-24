import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { DatastoreItem } from "deno-slack-api/types.ts";
import { RotationDatastore } from "../datastores/rotation.ts";

export const sendReminderTriggerUrl =
  "https://slack.com/shortcuts/xxxxxxxxxxxx/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

export const buildReminderContent = (
  rotation: DatastoreItem<typeof RotationDatastore.definition>,
) => {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `It’s <@${rotation.current_queue[0]}>’s turn to be \`${rotation.name}\`.`,
      },
    },
  ];
};

export const SendReminderFunction = DefineFunction({
  callback_id: "send_reminder_function",
  title: "Send a reminder",
  source_file: "functions/send_reminder.ts",
  input_parameters: {
    properties: {
      trigger_id: {
        type: Schema.types.string,
      },
      replace_last: {
        type: Schema.types.boolean,
        default: false,
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
      return {
        error: `Failed to fetch rotation: ${JSON.stringify(
          rotationsResponse,
        )}.`,
      };
    }

    const content = buildReminderContent(rotation);
    const message = await client.chat.postMessage({
      channel: rotation.channel,
      blocks: [
        ...content,
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Confirm",
              },
              style: "primary",
              action_id: "confirm_turn",
            },
            {
              type: "workflow_button",
              text: {
                type: "plain_text",
                text: "Postpone",
              },
              action_id: "postpone_turn",
              workflow: {
                trigger: {
                  url: sendReminderTriggerUrl,
                  customizable_input_parameters: [
                    {
                      name: "trigger_id",
                      value: rotation.trigger_id,
                    },
                    {
                      name: "mode",
                      value: "postpone",
                    },
                  ],
                },
              },
            },
            {
              type: "workflow_button",
              text: {
                type: "plain_text",
                text: "Skip",
              },
              action_id: "skip_turn",
              workflow: {
                trigger: {
                  url: sendReminderTriggerUrl,
                  customizable_input_parameters: [
                    {
                      name: "trigger_id",
                      value: rotation.trigger_id,
                    },
                    {
                      name: "mode",
                      value: "skip",
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
      return { error: `Failed to send reminder: ${JSON.stringify(message)}.` };
    }

    if (
      rotation.last_channel &&
      rotation.last_message_ts &&
      rotation.last_message
    ) {
      if (!inputs.replace_last) {
        const response = await client.chat.update({
          channel: rotation.last_channel,
          ts: rotation.last_message_ts,
          blocks: JSON.parse(rotation.last_message),
        });

        if (!response.ok) {
          return {
            error: `Error during chat.update: ${JSON.stringify(response)}.`,
          };
        }
      } else {
        const response = await client.chat.delete({
          channel: rotation.last_channel,
          ts: rotation.last_message_ts,
        });

        if (!response.ok) {
          return {
            error: `Error during chat.delete: ${JSON.stringify(response)}.`,
          };
        }
      }
    }

    const response = await client.apps.datastore.update<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      item: {
        trigger_id: inputs.trigger_id,
        last_channel: message.channel,
        last_message_ts: message.ts,
        last_message: JSON.stringify(content),
      },
    });

    if (!response.ok) {
      return {
        error: `Error during datastore.delete: ${JSON.stringify(response)}.`,
      };
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
      return {
        error: `Failed to fetch rotation: ${JSON.stringify(
          rotationsResponse,
        )}.`,
      };
    }

    if (action.action_id === "confirm_turn") {
      const content = buildReminderContent(rotation);
      const response = await client.chat.update({
        channel: body.container.channel_id,
        ts: body.container.message_ts,
        blocks: content,
      });

      if (!response.ok) {
        return {
          error: `Error during chat.update: ${JSON.stringify(response)}.`,
        };
      }

      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {},
      });
    } else {
      await client.functions.completeError({
        function_execution_id: body.function_data.execution_id,
        error: "Aborting the workflow...",
      });
    }
  },
);
