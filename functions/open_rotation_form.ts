import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { RotationScheduleType, Schedule } from "../datastores/rotation.ts";
import { capitalize, formatTime, timezoneToParts } from "../utils/index.ts";
import { daysOfWeek, frequencies } from "../consts/index.ts";

const timezones = Object.values(
  Object.entries(
    Intl.supportedValuesOf("timeZone").reduce(
      (acc, tz) => {
        const [country, city] = timezoneToParts(tz);

        acc[country] ??= [];
        acc[country].push({
          text: {
            type: "plain_text",
            text: city,
          },
          value: tz,
        });

        return acc;
      },
      {} as Record<
        string,
        {
          text: { type: string; text: string };
          value: string;
        }[]
      >,
    ),
  ).reduce(
    (acc, [key, value]) => {
      if (value.length < 100) {
        acc[key] = {
          label: {
            type: "plain_text",
            text: key,
          },
          options: value,
        };
      } else {
        for (let i = 0; i < value.length / 100; i++) {
          const label = `${key} ${i + 1}`;
          acc[label] = {
            label: {
              type: "plain_text",
              text: label,
            },
            options: value.slice(i * 100, (i + 1) * 100),
          };
        }
      }

      return acc;
    },
    {} as Record<
      string,
      {
        label: { type: string; text: string };
        options: {
          text: { type: string; text: string };
          value: string;
        }[];
      }
    >,
  ),
);

const defaultSchedule: Schedule = {
  frequency: "daily",
  time: "09:00",
  timezone: "America/Los_Angeles",
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

  return `${summary} at ${formatTime(schedule.time, schedule.timezone)}`;
};

export const buildRotationForm = (
  // deno-lint-ignore no-explicit-any
  inputs: Record<string, any>,
  schedule: Schedule = defaultSchedule,
) => {
  const blocks = [
    {
      type: "input",
      block_id: "rotation_name",
      label: {
        type: "plain_text",
        text: "Rotation name",
      },
      element: {
        type: "plain_text_input",
        placeholder: {
          type: "plain_text",
          text: "Team meeting facilitator",
        },
        action_id: "rotation_name_input",
        initial_value: inputs.name,
      },
    },
    ...(inputs.mode === "update" // This is to avoid having to edit the channel_ids of the RemoveUserFromRotationWorkflow trigger
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Channel*`,
            },
          },
          {
            type: "section",
            block_id: "channel",
            text: {
              type: "mrkdwn",
              text: `<#${inputs.channel}>`,
            },
          },
        ]
      : [
          {
            type: "input",
            block_id: "channel",
            label: {
              type: "plain_text",
              text: "Channel",
            },
            element: {
              type: "conversations_select",
              action_id: "channel_input",
              initial_conversation: inputs.channel,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `_If you choose a private channel, make sure you add_ rrr _as a member._`,
            },
          },
        ]),
    {
      type: "input",
      block_id: "roster",
      label: {
        type: "plain_text",
        text: "Roster",
      },
      element: {
        type: "multi_users_select",
        action_id: "roster_input",
        initial_users: inputs.roster,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Schedule*`,
      },
    },
    {
      type: "section",
      block_id: "schedule",
      text: {
        type: "mrkdwn",
        text: `${formatSchedule(schedule)}`,
      },
      accessory: {
        type: "button",
        action_id: "edit_schedule",
        text: {
          type: "plain_text",
          text: "Edit",
        },
      },
    },
  ];

  return {
    type: "modal",
    callback_id: "rotation_form",
    external_id: "rotation_form_window19",
    private_metadata: JSON.stringify({ schedule }),
    title: {
      type: "plain_text",
      text: inputs.mode === "update" ? "Edit rotation" : "Create rotation",
    },
    close: {
      type: "plain_text",
      text: "Close",
    },
    submit: {
      type: "plain_text",
      text: "Save",
    },
    blocks,
  };
};

export const buildScheduleForm = (schedule: Schedule = defaultSchedule) => {
  const timepicker = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Time*`,
      },
    },
    {
      type: "actions",
      block_id: "timepicker",
      elements: [
        {
          type: "timepicker",
          action_id: "timepicker_input",
          initial_time: schedule.time,
          placeholder: {
            type: "plain_text",
            text: "Select time",
          },
        },
        {
          type: "static_select",
          action_id: "timezone_input",
          placeholder: {
            type: "plain_text",
            text: "Select timezone",
          },
          initial_option: {
            text: {
              type: "plain_text",
              text: timezoneToParts(schedule.timezone)[1],
            },
            value: schedule.timezone,
          },
          option_groups: timezones,
        },
      ],
    },
  ];

  const every = {
    type: "input",
    block_id: "every",
    label: {
      type: "plain_text",
      text: "Every",
    },
    element: {
      type: "number_input",
      is_decimal_allowed: false,
      min_value: "1",
      initial_value: schedule.repeats_every.toString(),
      action_id: "every_input",
    },
  };

  const includedDays = {
    type: "input",
    block_id: "included_days",
    label: {
      type: "plain_text",
      text: "Included days",
    },
    element: {
      type: "multi_static_select",
      action_id: "included_days_input",
      initial_options: schedule.on_days?.map((day) => ({
        text: {
          type: "plain_text",
          text: day,
        },
        value: day,
      })) ?? [
        {
          text: {
            type: "plain_text",
            text: "Monday",
          },
          value: "Monday",
        },
      ],
      options: daysOfWeek.map((day) => ({
        text: {
          type: "plain_text",
          text: day,
        },
        value: day,
      })),
    },
  };

  const includedDay = {
    type: "input",
    block_id: "included_days",
    label: {
      type: "plain_text",
      text: "On",
    },
    element: {
      type: "multi_static_select",
      action_id: "included_days_input",
      max_selected_items: 1,
      initial_options: schedule.on_days
        ?.map((day) => ({
          text: {
            type: "plain_text",
            text: day,
          },
          value: day,
        }))
        ?.slice(0, 1) ?? [
        {
          text: {
            type: "plain_text",
            text: "Monday",
          },
          value: "Monday",
        },
      ],
      options: daysOfWeek.map((day) => ({
        text: {
          type: "plain_text",
          text: day,
        },
        value: day,
      })),
    },
  };

  let blocks: object[];
  switch (schedule.frequency) {
    case "daily":
      blocks = [every, ...timepicker];
      break;
    case "weekly":
      blocks = [every, includedDays, ...timepicker];
      break;
    case "monthly":
      blocks = [every, includedDay, ...timepicker];
      break;
    default:
      blocks = [];
      break;
  }

  return {
    type: "modal",
    callback_id: "schedule_form",
    external_id: "schedule_form_window19",
    title: {
      type: "plain_text",
      text: "Edit schedule",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    submit: {
      type: "plain_text",
      text: "Save",
    },
    blocks: [
      {
        type: "input",
        block_id: "frequency",
        dispatch_action: true,
        label: {
          type: "plain_text",
          text: "Frequency",
        },
        element: {
          type: "static_select",
          action_id: "frequency_input",
          initial_option: {
            text: {
              type: "plain_text",
              text: capitalize(schedule.frequency),
            },
            value: schedule.frequency,
          },
          options: frequencies.map((frequency) => ({
            text: {
              type: "plain_text",
              text: capitalize(frequency),
            },
            value: frequency,
          })),
        },
      },
      ...blocks,
    ],
  };
};

export const OpenRotationFormFunction = DefineFunction({
  title: "Create or edit a rotation",
  callback_id: "open_rotation_form_function",
  source_file: "functions/open_rotation_form.ts",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      mode: {
        type: Schema.types.string,
        enum: ["create", "update"],
        default: "create",
      },
      channel: {
        type: Schema.slack.types.channel_id,
        description: "The ID of the channel to create a schedule for",
      },
      name: {
        type: Schema.types.string,
      },
      roster: {
        type: Schema.types.array,
        items: {
          type: Schema.slack.types.user_id,
        },
      },
      ...RotationScheduleType.definition.properties,
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
  OpenRotationFormFunction,
  async ({ inputs, client }) => {
    let schedule: Schedule;
    if (
      inputs.frequency &&
      inputs.time &&
      inputs.timezone &&
      inputs.repeats_every
    ) {
      schedule = {
        frequency: inputs.frequency,
        time: inputs.time,
        timezone: inputs.timezone,
        repeats_every: inputs.repeats_every,
        on_days: inputs.on_days,
      } as Schedule;
    } else {
      const userResponse = await client.users.info({
        user: inputs.interactivity.interactor.id,
      });

      if (!userResponse.ok) {
        return {
          error: `Failed to get user: ${JSON.stringify(userResponse)}.`,
        };
      }

      schedule = {
        ...defaultSchedule,
        timezone: userResponse.user.tz,
      };
    }

    await client.views.open({
      interactivity_pointer: inputs.interactivity.interactivity_pointer,
      view: buildRotationForm(inputs, schedule),
    });

    return {
      completed: false,
    };
  },
)
  .addBlockActionsHandler(
    ["edit_schedule", "frequency_input"],
    async ({ action, body, client }) => {
      const response = await (action.action_id === "edit_schedule"
        ? client.views.push
        : client.views.update)({
        external_id: "schedule_form_window19", // TODO: rename
        interactivity_pointer: body.interactivity.interactivity_pointer,
        view: buildScheduleForm(
          body.view.private_metadata
            ? JSON.parse(body.view.private_metadata).schedule
            : {
                ...defaultSchedule,
                frequency:
                  body.view.state.values.frequency?.frequency_input
                    .selected_option.value,
              },
        ),
      });

      if (!response.ok) {
        return {
          error: `Failed to open schedule form: ${JSON.stringify(response)}.`,
        };
      }

      return {
        completed: false,
      };
    },
  )
  .addViewSubmissionHandler(
    ["schedule_form"],
    async ({ view, client, inputs }) => {
      const { values } = view.state;

      await client.views.update({
        external_id: "rotation_form_window19",
        view: buildRotationForm(inputs, {
          frequency: values.frequency.frequency_input.selected_option.value,
          time: values.timepicker.timepicker_input.selected_time,
          timezone: values.timepicker.timezone_input.selected_option.value,
          repeats_every: parseInt(values.every.every_input.value),
          on_days:
            values.included_days?.included_days_input.selected_options.map(
              ({ value }: { value: string }) => value,
            ),
        }),
      });
    },
  )
  .addViewSubmissionHandler(
    ["rotation_form"],
    async ({ inputs, client, body, view }) => {
      const { values } = view.state;
      const scheduleValues = JSON.parse(view.private_metadata ?? "{}")
        .schedule as Schedule;

      const complete = await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          name: values.rotation_name.rotation_name_input.value,
          channel:
            values.channel?.channel_input.selected_conversation ??
            inputs.channel,
          roster: values.roster.roster_input.selected_users,
          time: scheduleValues.time,
          timezone: scheduleValues.timezone,
          frequency: scheduleValues.frequency,
          repeats_every: scheduleValues.repeats_every,
          on_days: scheduleValues.on_days,
        },
      });

      if (!complete.ok) {
        await client.functions.completeError({
          function_execution_id: body.function_data.execution_id,
          error: `Error completing function: ${JSON.stringify(complete)}.`,
        });
      }
    },
  );
