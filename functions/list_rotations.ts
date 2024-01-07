import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import type { DatastoreItem } from "deno-slack-api/types.ts";
import type { SlackAPIClient } from "deno-slack-sdk/deps.ts";
import { RotationDatastore } from "../datastores/rotation.ts";
import { formatSchedule } from "./open_rotation_form.ts";
import { deleteRotation } from "./delete_rotations.ts";
import { CreateRotationWorkflow } from "../workflows/create_rotation.ts";

export const listRotations = async (
  inputs: { channel: string },
  client: SlackAPIClient,
) => {
  const rotations: DatastoreItem<typeof RotationDatastore.definition>[] = [];

  let cursor: string | undefined;
  do {
    const response = await client.apps.datastore.query<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      expression: "#channel = :channel",
      expression_attributes: { "#channel": "channel" },
      expression_values: { ":channel": inputs.channel },
      limit: 1000,
      cursor,
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch rotations: ${JSON.stringify(response)}.`,
      };
    }

    rotations.push(...response.items);

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return {
    outputs: {
      rotations,
    },
  };
};

export const ListRotationsFunction = DefineFunction({
  callback_id: "list_rotations_function",
  title: "List rotations",
  source_file: "functions/list_rotations.ts",
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

export default SlackFunction(
  ListRotationsFunction,
  async ({ inputs, client }) => {
    const rotations = await listRotations(inputs, client);
    if (rotations.error) {
      return rotations;
    }

    const rotationList = rotations.outputs!.rotations.flatMap(
      (rotation, index) => {
        const rotationSummary = {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Name:* ${rotation.name}\n*Channel:* <#${
              rotation.channel
            }>\n*Schedule:* ${formatSchedule({
              time: rotation.time,
              frequency: rotation.frequency,
              repeats_every: rotation.repeats_every,
              on_days: rotation.on_days,
            })}\n*Roster:* ${rotation.roster
              .map((member: string) => `<@${member}>`)
              .join(", ")}\n*Next up:* <@${
              rotation.current_queue?.[1] ?? rotation.roster[0]
            }>`,
          },
        };

        const actionButtons = {
          type: "actions",
          elements: [
            {
              type: "workflow_button",
              text: {
                type: "plain_text",
                text: "Edit",
              },
              action_id: `edit_rotation-${rotation.trigger_id}`,
              workflow: {
                trigger: {
                  url: "https://slack.com/shortcuts/Ft068EGKG6JG/996a9ebe87ac264367856f92ec06dcf9",
                  customizable_input_parameters: [
                    {
                      name: "trigger_id",
                      value: rotation.trigger_id,
                    },
                  ],
                },
              },
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Delete",
              },
              style: "danger",
              action_id: `delete_rotation-${rotation.trigger_id}`,
              confirm: {
                title: {
                  type: "plain_text",
                  text: "Are you sure?",
                },
                text: {
                  type: "mrkdwn",
                  text: "This will permanently delete the rotation and all of its data.",
                },
                style: "danger",
                confirm: {
                  type: "plain_text",
                  text: "Delete",
                },
                deny: {
                  type: "plain_text",
                  text: "Cancel",
                },
              },
            },
          ],
        };

        return index === 0
          ? [rotationSummary, actionButtons]
          : [
              {
                type: "divider",
              },
              rotationSummary,
              actionButtons,
            ];
      },
    );

    const message = await client.chat.postEphemeral({
      channel: inputs.channel,
      user: inputs.interactivity.interactor.id,
      blocks: rotationList.length
        ? rotationList
        : [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `There are no rotations in <#${inputs.channel}>. Create one using the shortcut \`${CreateRotationWorkflow.definition.title}\`!`,
              },
            },
          ],
    });

    if (!message.ok) {
      return { error: `Failed to list rotations: ${JSON.stringify(message)}.` };
    }

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  /delete_rotation-(.*)/,
  async ({ action, inputs, client }) => {
    const triggerId = action.action_id.match(/delete_rotation-(.*)/)?.[1];
    if (triggerId) {
      const response = await deleteRotation({ trigger_id: triggerId }, client);
      if (response.error) {
        return response;
      }

      await client.chat.postEphemeral({
        channel: inputs.channel,
        user: inputs.interactivity.interactor.id,
        text: `The rotation \`${response.outputs?.name}\` was successfully deleted! :white_check_mark:`,
      });
    } else {
      return {
        error: "Could not find rotation to delete.",
      };
    }

    return {
      completed: true,
      outputs: {
        message: {
          text: "Rotation deleted!",
        },
      },
    };
  },
);
