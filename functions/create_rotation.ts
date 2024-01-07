import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  daysOfWeek,
  frequencies,
  RotationScheduleType,
  Schedule,
} from "../datastores/rotation.ts";
import { capitalize } from "../utils/index.ts";

const defaultSchedule: Schedule = {
  frequency: "daily",
  time: "09:00",
  repeats_every: 1,
};

export const formatSchedule = (schedule: Schedule) => {
  let summary = "";
  switch (schedule.frequency) {
    case "daily":
      if (schedule.repeats_every === 1) {
        summary = "Daily";
      } else if (schedule.repeats_every === 2) {
        summary = "Every other day";
      } else {
        summary = `Every ${schedule.repeats_every} days`;
      }
      break;
    case "weekly":
      if (schedule.repeats_every === 1) {
        summary = "Weekly";
      } else if (schedule.repeats_every === 2) {
        summary = "Every other week";
      } else {
        summary = `Every ${schedule.repeats_every} weeks`;
      }
      summary += ` on ${schedule.on_days!.join(", ")}`;
      break;
    case "monthly":
      if (schedule.repeats_every === 1) {
        summary = "Monthly";
      } else if (schedule.repeats_every === 2) {
        summary = "Every other month";
      } else {
        summary = `Every ${schedule.repeats_every} months`;
      }
      summary += ` on ${schedule.on_days!.join(", ")}`;
      break;
  }

  return `${summary} at ${schedule.time}`;
};

export const buildRotationForm = (
  // deno-lint-ignore no-explicit-any
  inputs: Record<string, any>,
  schedule: Schedule,
) => {
  const scheduleSummary = formatSchedule(schedule);

  return {
    "type": "modal",
    "callback_id": "rotation_form",
    "external_id": "rotation_form_window7",
    "private_metadata": JSON.stringify({ schedule }),
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

export const buildScheduleForm = (schedule: Schedule = defaultSchedule) => {
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
      "initial_time": schedule.time,
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
      "initial_value": schedule.repeats_every.toString(),
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
      "initial_options": schedule.on_days?.map((day) => ({
        "text": {
          "type": "plain_text",
          "text": day,
        },
        "value": day,
      })) ?? [
        {
          "text": {
            "type": "plain_text",
            "text": "Monday",
          },
          "value": "Monday",
        },
      ],
      "options": daysOfWeek.map((day) => ({
        "text": {
          "type": "plain_text",
          "text": day,
        },
        "value": day,
      })),
    },
  };

  const includedDay = {
    "type": "input",
    "block_id": "included_days",
    "label": {
      "type": "plain_text",
      "text": "On",
    },
    "element": {
      "type": "multi_static_select",
      "action_id": "included_days_input",
      "max_selected_items": 1,
      "initial_options": schedule.on_days?.map((day) => ({
        "text": {
          "type": "plain_text",
          "text": day,
        },
        "value": day,
      }))?.slice(0, 1) ?? [
        {
          "text": {
            "type": "plain_text",
            "text": "Monday",
          },
          "value": "Monday",
        },
      ],
      "options": daysOfWeek.map((day) => ({
        "text": {
          "type": "plain_text",
          "text": day,
        },
        "value": day,
      })),
    },
  };

  let blocks: object[];
  switch (schedule.frequency) {
    case "daily":
      blocks = [
        every,
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
        includedDay,
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
    "external_id": "schedule_form_window7",
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
              "text": capitalize(schedule.frequency),
            },
            "value": schedule.frequency,
          },
          "options": frequencies.map((frequency) => ({
            "text": {
              "type": "plain_text",
              "text": capitalize(frequency),
            },
            "value": frequency,
          })),
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
      ...RotationScheduleType.definition.properties,
    },
    required: [
      "name",
      "channel",
      "roster",
      ...RotationScheduleType.definition.required,
    ],
  },
});

export default SlackFunction(
  CreateRotationFunction,
  async ({ inputs, client }) => {
    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: buildRotationForm(inputs, defaultSchedule),
    });

    return {
      completed: false,
    };
  },
).addBlockActionsHandler(
  ["edit_schedule", "frequency_input"],
  async ({ action, body, client }) => {
    const response =
      await (action.action_id === "edit_schedule"
        ? client.views.push
        : client.views.update)({
          external_id: "schedule_form_window7",
          interactivity_pointer: body.interactivity.interactivity_pointer,
          view: buildScheduleForm(
            body.view.private_metadata
              ? JSON.parse(body.view.private_metadata).schedule
              : {
                ...defaultSchedule,
                frequency: body.view.state.values.frequency?.frequency_input
                  .selected_option.value,
              },
          ),
        });

    if (!response.ok) {
      return { error: `Failed to open schedule form: ${response.error}.` };
    }

    return {
      completed: false,
    };
  },
).addViewSubmissionHandler(
  ["schedule_form"],
  async ({ view, client, inputs }) => {
    const { values } = view.state;

    await client.views.update({
      external_id: "rotation_form_window7",
      view: buildRotationForm(inputs, {
        frequency: values.frequency.frequency_input.selected_option.value,
        time: values.timepicker.timepicker_input.selected_time,
        repeats_every: parseInt(values.every.every_input.value),
        on_days: values.included_days
          ?.included_days_input
          .selected_options.map(({ value }: { value: string }) => value),
      }),
    });
  },
).addViewSubmissionHandler(
  ["rotation_form"],
  async ({ client, body, view }) => {
    const { values } = view.state;
    const scheduleValues = JSON.parse(view.private_metadata ?? "{}").schedule;

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
        error: `Error completing function: ${complete}.`,
      });
    }
  },
);
