import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "../datastores/rotation.ts";
import { formatSchedule } from "./create_rotation.ts";

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
    const rotations = await client.apps.datastore.query<
      typeof RotationDatastore.definition
    >({
      datastore: RotationDatastore.name,
      expression: "#channel = :channel",
      expression_attributes: { "#channel": "channel" },
      expression_values: { ":channel": inputs.channel },
      limit: 1000,
    }); // TODO: pagination

    if (!rotations.ok) {
      return { error: `Failed to fetch rotations: ${rotations.error}.` };
    }

    const rotationList = rotations.items.flatMap((rotation, index) => {
      const rotationSummary = {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text":
            `*Name:* ${rotation.name}\n*Channel:* <#${rotation.channel}>\n*Schedule:* ${
              // TODO
              formatSchedule({
                time: "6:66 AM",
                frequency: "daily",
                repeats_every: 1,
              })}\n*Roster:* ${
              rotation.roster.map((member: string) => `<@${member}>`).join(
                ", ",
              )
            }\n*Next up:* <@${rotation.current_queue[0]}>`,
        },
      };

      const actionButtons = {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Edit",
            },
            "action_id": "edit_rotation",
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "text": "Delete",
            },
            "style": "danger",
            "action_id": "delete_rotation",
            "confirm": {
              "title": {
                "type": "plain_text",
                "text": "Are you sure?",
              },
              "text": {
                "type": "mrkdwn",
                "text":
                  "This will permanently delete the rotation and all of its data.",
              },
              "style": "danger",
              "confirm": {
                "type": "plain_text",
                "text": "Delete",
              },
              "deny": {
                "type": "plain_text",
                "text": "Cancel",
              },
            },
          },
        ],
      };

      return index === 0
        ? [
          rotationSummary,
          actionButtons,
        ]
        : [
          {
            "type": "divider",
          },
          rotationSummary,
          actionButtons,
        ];
    });

    const message = await client.chat.postEphemeral({
      channel: inputs.channel,
      user: inputs.interactivity.interactor.id,
      blocks: rotationList.length ? rotationList : [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text":
              `There are no rotations in <#${inputs.channel}>. Create one with \`/rrr\`!`,
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
);
