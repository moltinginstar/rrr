import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreateRotationFunction } from "../functions/create_rotation.ts";
import { UpsertRotationFunction } from "../functions/upsert_rotation.ts";

export const CreateRotationWorkflow = DefineWorkflow({
  callback_id: "create_rotation",
  title: "Create a rotation",
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

const CreateRotationForm = CreateRotationWorkflow.addStep(
  CreateRotationFunction,
  {
    interactivity: CreateRotationWorkflow.inputs.interactivity,
    channel: CreateRotationWorkflow.inputs.channel,
  },
);

CreateRotationWorkflow.addStep(
  UpsertRotationFunction,
  {
    name: CreateRotationForm.outputs.name,
    channel: CreateRotationForm.outputs.channel,
    roster: CreateRotationForm.outputs.roster,
    time: CreateRotationForm.outputs.time,
    frequency: {
      type: CreateRotationForm.outputs.frequency,
      repeats_every: CreateRotationForm.outputs.repeats_every,
      on_days: CreateRotationForm.outputs.on_days,
    },
  },
);

CreateRotationWorkflow.addStep(
  Schema.slack.functions.SendEphemeralMessage,
  {
    channel_id: CreateRotationForm.outputs.channel,
    user_id: CreateRotationWorkflow.inputs.interactivity.interactor.id,
    message:
      `The rotation \`${CreateRotationForm.outputs.name}\` was successfully created! :white_check_mark:`,
  },
);

export default CreateRotationWorkflow;
