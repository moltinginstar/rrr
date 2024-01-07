import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const buildRotationForm = (
  // deno-lint-ignore no-explicit-any
  inputs: Record<string, any>,
  // deno-lint-ignore no-explicit-any
  privateMetadata: Record<string, any>,
) => {
  const scheduleSummary = `${privateMetadata.time} ${privateMetadata.frequency}`;

  return {
    "type": "modal",
    "callback_id": "rotation_form",
    "external_id": "rotation_form_view",
    "private_metadata": JSON.stringify(privateMetadata),
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
            `_If you choose a private channel, make sure you add rrr as a member._`,
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
          "text": `*Schedule:* ${scheduleSummary}`,
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
  };
};

export const buildScheduleForm = (
  frequency: "daily" | "weekly" | "monthly" = "daily",
) => {
  const timepicker = {
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
  };

  const every = {
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
  };

  const includedDays = {
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
  };

  let blocks: object[];
  switch (frequency) {
    case "daily":
      blocks = [
        timepicker,
      ];
      break;
    case "weekly":
      blocks = [
        every,
        includedDays,
        timepicker,
      ];
      break;
    case "monthly":
      blocks = [
        every,
        includedDays,
        timepicker,
      ];
      break;
    default:
      blocks = [];
      break;
  }

  return {
    "type": "modal",
    "callback_id": "schedule_form",
    "external_id": "schedule_form_view",
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
      ...blocks,
    ],
  };
};

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
    ],
  },
});

export default SlackFunction(
  CreateRotationFunction,
  async ({ inputs, client }) => {
    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: buildRotationForm(inputs, {
        frequency: "daily",
        time: "09:00",
        repeats_every: null,
        on_days: null,
      }),
    });

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  ["edit_schedule", "frequency_input"],
  async ({ action, body, client }) => {
    await (action.action_id === "edit_schedule"
      ? client.views.push
      : client.views.update)({
        external_id: "schedule_form_view",
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view: buildScheduleForm(
          body.view.state.values.frequency?.frequency_input.selected_option
            .value,
        ),
      });

    return {
      completed: false,
    };
  },
).addViewSubmissionHandler(
  ["schedule_form"],
  async ({ view, client, inputs }) => {
    const { values } = view.state;

    await client.views.update({
      external_id: "rotation_form_view",
      view: buildRotationForm(inputs, {
        frequency: values.frequency.frequency_input.selected_option.value,
        time: values.timepicker.timepicker_input.selected_time,
        repeats_every: values.every?.every_input.value ? parseInt(values.every?.every_input.value) : null,
        on_days: values.included_days?.included_days_input.selected_options.map(({ value }: { value: string }) => value) ?? null,
      }),
    });
  },
).addViewSubmissionHandler(
  ["rotation_form"],
  async ({ client, body, view }) => {
    const { values } = view.state;
    const scheduleValues = JSON.parse(view.private_metadata ?? "{}");

    const complete = await client.functions.completeSuccess({
      function_execution_id: body.function_data.execution_id,
      outputs: {
        name: values.rotation_name.rotation_name_input.value,
        channel: values.channel.channel_input.selected_conversation,
        roster: values.roster.roster_input.selected_users,
        time: scheduleValues.time,
        frequency: scheduleValues.frequency,
        repeats_every: scheduleValues.repeats_every,
        on_days: scheduleValues.on_days,
      },
    });

    if (!complete.ok) {
      await client.functions.completeError({
        function_execution_id: body.function_data.execution_id,
        error: "Error completing function",
      });
    }
  },
);
