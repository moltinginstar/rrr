import { DefineDatastore, DefineType, Schema } from "deno-slack-sdk/mod.ts";
import { daysOfWeek, frequencies } from "../consts/index.ts";
import type { DayOfWeek, Frequency, Time } from "../types/index.ts";

export const IncludedDaysOfWeekType = DefineType({
  name: "IncludedDaysOfWeek",
  type: Schema.types.array,
  items: {
    type: Schema.types.string,
    enum: daysOfWeek,
  },
});

export const RotationScheduleType = DefineType({
  name: "Schedule",
  type: Schema.types.object,
  properties: {
    time: {
      type: Schema.types.string,
    },
    frequency: {
      type: Schema.types.string,
      enum: frequencies,
    },
    repeats_every: {
      type: Schema.types.number,
    },
    on_days: {
      type: IncludedDaysOfWeekType,
    },
  },
  required: ["time", "frequency", "repeats_every"],
});

export type Schedule = {
  frequency: Frequency;
  repeats_every: number;
  on_days?: DayOfWeek[];
  time: Time;
};

export const RotationDatastore = DefineDatastore({
  name: "rotation",
  primary_key: "trigger_id",
  attributes: {
    trigger_id: {
      type: Schema.types.string,
      required: true,
    },
    name: {
      type: Schema.types.string,
      required: true,
    },
    channel: {
      type: Schema.slack.types.channel_id,
      required: true,
    },
    roster: {
      type: Schema.types.array,
      required: true,
      items: {
        type: Schema.slack.types.user_id,
      },
    },
    current_queue: {
      type: Schema.types.array,
      required: false,
      items: {
        type: Schema.slack.types.user_id,
      },
    },
    time: {
      type: Schema.types.string,
      required: true,
    },
    frequency: {
      type: Schema.types.string,
      enum: frequencies,
      required: true,
    },
    repeats_every: {
      type: Schema.types.number,
      required: true,
    },
    on_days: {
      type: Schema.types.array,
      items: {
        type: Schema.types.string,
        enum: daysOfWeek,
      },
    },
    trigger_ids: {
      type: Schema.types.array,
      required: false,
      items: {
        type: Schema.types.string,
      },
    },
    last_channel: {
      type: Schema.slack.types.channel_id,
      required: false,
    },
    last_message_ts: {
      type: Schema.slack.types.message_ts,
      required: false,
    },
    last_message: {
      type: Schema.types.string,
      required: false,
    },
  },
});
