import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "../datastores/rotation.ts";
import { formatSchedule } from "./open_rotation_form.ts";
import { SlackAPIClient } from "deno-slack-sdk/deps.ts";
import { DatastoreItem } from "deno-slack-api/types.ts";

const deleteRotation = async (
  inputs: { trigger_id: string },
  client: SlackAPIClient,
) => {
  const response = await client.workflows.triggers.delete({
    trigger_id: inputs.trigger_id,
  });

  if (!response.ok) {
    return {
      error: `Trigger could not be deleted: ${JSON.stringify(response)}.`,
    };
  }

  const getResponse = await client.apps.datastore.get<
    typeof RotationDatastore.definition
  >({
    datastore: RotationDatastore.name,
    id: inputs.trigger_id,
  });

  if (!getResponse.ok) {
    return {
      error: `Failed to get rotation: ${JSON.stringify(getResponse)}.`,
    };
  }

  const responses = await Promise.all(
    getResponse.item.trigger_ids?.map((triggerId: string) => {
      return client.workflows.triggers.delete({ trigger_id: triggerId });
    }) ?? [],
  );

  if (responses.some((response) => !response?.ok)) {
    return {
      error: `Triggers could not be deleted: ${JSON.stringify(responses)}.`,
    };
  }

  const datastoreResponse = await client.apps.datastore.delete<
    typeof RotationDatastore.definition
  >({
    datastore: RotationDatastore.name,
    id: inputs.trigger_id,
  });

  if (!datastoreResponse.ok) {
    return {
      error: `Failed to delete rotation data: ${JSON.stringify(
        datastoreResponse,
      )}.`,
    };
  }

  return {
    outputs: {
      name: getResponse.item.name,
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

    const rotationList = rotations.flatMap((rotation, index) => {
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
    });

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
                text: `There are no rotations in <#${inputs.channel}>. Create one with \`/rrr\`!`,
              },
            },
          ],
    });

    if (!message.ok) {
      return { error: `Failed to list rotations: ${message.error}.` };
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
