import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const CreateRotationFunction = DefineFunction({
  title: "Create a rotation",
  callback_id: "create_rotation_function",
  source_file: "functions/create_rotation.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel: {
        type: Schema.slack.types.channel_id,
        description: "The ID of the channel to create a schedule for",
      },
    },
    required: ["interactivity", "channel"],
  },
  output_parameters: {
    properties: {
      name: {
        type: Schema.types.string,
      },
      channel: {
        type: Schema.slack.types.channel_id,
      },
      roster: {
        type: Schema.types.array,
        items: {
          type: Schema.slack.types.user_id,
        },
      },
      time: {
        type: Schema.types.string,
      },
      frequency: {
        type: Schema.types.string,
        enum: ["daily", "weekly", "monthly"],
      },
      repeats_every: {
        type: Schema.types.number,
      },
      on_days: {
        type: Schema.types.array,
        items: {
          type: Schema.types.string,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
      },
    },
    required: [
      "name",
      "channel",
      "time",
      "frequency",
      "repeats_every",
      "on_days",
    ],
  },
});

export default SlackFunction(
  CreateRotationFunction,
  async ({ inputs, client }) => {
    const response = await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: {
        "type": "modal",
        "callback_id": "rotation_form",
        "title": {
          "type": "plain_text",
          "text": "Create rotation",
        },
        "close": {
          "type": "plain_text",
          "text": "Close",
        },
        "submit": {
          "type": "plain_text",
          "text": "Create",
        },
        "blocks": [
          {
            "type": "input",
            "block_id": "rotation_name",
            "label": {
              "type": "plain_text",
              "text": "Rotation name",
            },
            "element": {
              "type": "plain_text_input",
              "placeholder": {
                "type": "plain_text",
                "text": "Team meeting facilitator",
              },
              "action_id": "rotation_name_input",
            },
          },
          {
            "type": "input",
            "block_id": "channel",
            "label": {
              "type": "plain_text",
              "text": "Channel",
            },
            "element": {
              "type": "conversations_select",
              "action_id": "channel_input",
              "initial_conversation": inputs.channel,
            },
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text":
                "_If you choose a private channel, make sure you add RRR as a member._",
            },
          },
          {
            "type": "input",
            "block_id": "roster",
            "label": {
              "type": "plain_text",
              "text": "Roster",
            },
            "element": {
              "type": "multi_users_select",
              "action_id": "roster_input",
            },
          },
          {
            "type": "divider",
          },
          {
            "type": "section",
            "block_id": "schedule",
            "text": {
              "type": "mrkdwn",
              "text": `*Schedule:* 9:00 AM every day`,
            },
            "accessory": {
              "type": "button",
              "action_id": "edit_schedule",
              "text": {
                "type": "plain_text",
                "text": "Edit",
              },
            },
          },
        ],
      },
    });

    // console.log(response);

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  ["edit_schedule", "frequency_input"],
  async ({ action, body, client }) => {
    let configBlocks: object[] = [];
    switch (
      body.view.state.values.frequency?.frequency_input
        .selected_option.value || "daily"
    ) {
      case "daily":
        configBlocks = [
          {
            "type": "input",
            "block_id": "timepicker",
            "label": {
              "type": "plain_text",
              "text": "Time",
            },
            "element": {
              "type": "timepicker",
              "action_id": "timepicker_input",
              "initial_time": "09:00",
              "placeholder": {
                "type": "plain_text",
                "text": "Select time",
              },
            },
          },
        ];
        break;
      case "weekly":
        configBlocks = [
          {
            "type": "input",
            "block_id": "every",
            "label": {
              "type": "plain_text",
              "text": "Every",
            },
            "element": {
              "type": "number_input",
              "is_decimal_allowed": false,
              "min_value": "1",
              "initial_value": "1",
              "action_id": "every_input",
            },
          },
          {
            "type": "input",
            "block_id": "included_days",
            "label": {
              "type": "plain_text",
              "text": "Included days",
            },
            "element": {
              "type": "multi_static_select",
              "action_id": "included_days_input",
              "initial_options": [{
                "text": {
                  "type": "plain_text",
                  "text": "Monday",
                },
                "value": "Monday",
              }],
              "options": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => ({
                "text": {
                  "type": "plain_text",
                  "text": day,
                },
                "value": day,
              })),
            },
          },
          {
            "type": "input",
            "block_id": "timepicker",
            "label": {
              "type": "plain_text",
              "text": "Time",
            },
            "element": {
              "type": "timepicker",
              "action_id": "timepicker_input",
              "initial_time": "09:00",
              "placeholder": {
                "type": "plain_text",
                "text": "Select time",
              },
            },
          },
        ];
        break;
      case "monthly":
        configBlocks = [
          {
            "type": "input",
            "block_id": "every",
            "label": {
              "type": "plain_text",
              "text": "Every",
            },
            "element": {
              "type": "number_input",
              "is_decimal_allowed": false,
              "min_value": "1",
              "initial_value": "1",
              "action_id": "every_input",
            },
          },
          {
            "type": "input",
            "block_id": "included_days",
            "label": {
              "type": "plain_text",
              "text": "Included days",
            },
            "element": {
              "type": "multi_static_select",
              "action_id": "included_days_input",
              "initial_options": [{
                "text": {
                  "type": "plain_text",
                  "text": "Monday",
                },
                "value": "Monday",
              }],
              "options": [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map((day) => ({
                "text": {
                  "type": "plain_text",
                  "text": day,
                },
                "value": day,
              })),
            },
          },
          // {
          //   "type": "input",
          //   "block_id": "included_weeks",
          //   "label": {
          //     "type": "plain_text",
          //     "text": "Only include weeks",
          //   },
          //   "optional": true,
          //   "element": {
          //     "type": "multi_static_select",
          //     "action_id": "included_weeks_input",
          //     "options": [
          //       {
          //         "text": {
          //           "type": "plain_text",
          //           "text": "First",
          //         },
          //         "value": "1",
          //       },
          //       {
          //         "text": {
          //           "type": "plain_text",
          //           "text": "Second",
          //         },
          //         "value": "2",
          //       },
          //       {
          //         "text": {
          //           "type": "plain_text",
          //           "text": "Third",
          //         },
          //         "value": "3",
          //       },
          //       {
          //         "text": {
          //           "type": "plain_text",
          //           "text": "Fourth",
          //         },
          //         "value": "4",
          //       },
          //       {
          //         "text": {
          //           "type": "plain_text",
          //           "text": "Last",
          //         },
          //         "value": "-1",
          //       },
          //     ],
          //   },
          // },
          {
            "type": "input",
            "block_id": "timepicker",
            "label": {
              "type": "plain_text",
              "text": "Time",
            },
            "element": {
              "type": "timepicker",
              "action_id": "timepicker_input",
              "initial_time": "09:00",
              "placeholder": {
                "type": "plain_text",
                "text": "Select time",
              },
            },
          },
        ];
        break;
    }

    const response =
      await (action.action_id === "edit_schedule"
        ? client.views.push
        : client.views.update)({
          external_id: "schedule_form",
          interactivity_pointer: body.interactivity.interactivity_pointer,
          view: {
            "type": "modal",
            "callback_id": "schedule_form",
            "external_id": "schedule_form",
            "title": {
              "type": "plain_text",
              "text": "Edit schedule",
            },
            "close": {
              "type": "plain_text",
              "text": "Cancel",
            },
            "submit": {
              "type": "plain_text",
              "text": "Save",
            },
            "blocks": [
              {
                "type": "input",
                "block_id": "frequency",
                "dispatch_action": true,
                "label": {
                  "type": "plain_text",
                  "text": "Frequency",
                },
                "element": {
                  "type": "static_select",
                  "action_id": "frequency_input",
                  "initial_option": {
                    "text": {
                      "type": "plain_text",
                      "text": "Daily",
                    },
                    "value": "daily",
                  },
                  "options": [
                    {
                      "text": {
                        "type": "plain_text",
                        "text": "Daily",
                      },
                      "value": "daily",
                    },
                    {
                      "text": {
                        "type": "plain_text",
                        "text": "Weekly",
                      },
                      "value": "weekly",
                    },
                    {
                      "text": {
                        "type": "plain_text",
                        "text": "Monthly",
                      },
                      "value": "monthly",
                    },
                  ],
                },
              },
              ...configBlocks,
            ],
          },
        });

    // console.log(response);

    return {
      completed: false,
    };
  },
).addViewSubmissionHandler(
  ["schedule_form"],
  ({ view }) => {
    console.log("SCHEDULE FORM");
    console.log(view.state.values);
    console.log("\n");

    return {
      completed: true,
      outputs: {
        name: "Facilitator",
        channel: "",
        roster: [],
        time: "09:00",
        frequency: "daily",
        repeats_every: 1,
        on_days: [],
      },
    };
  },
).addViewSubmissionHandler(
  ["rotation_form"],
  ({ view }) => {
    console.log("ROTATION FORM");
    console.log(view.state.values);
    console.log("\n");

    return {
      completed: true,
      outputs: {
        name: "Facilitator",
        channel: "",
        roster: [],
        time: "09:00",
        frequency: "daily",
        repeats_every: 1,
        on_days: [],
      },
    };
  },
);
