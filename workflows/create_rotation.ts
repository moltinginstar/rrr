import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { OpenRotationFormFunction } from "../functions/open_rotation_form.ts";
import { CreateRotationFunction } from "../functions/create_rotation.ts";

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

const RotationForm = CreateRotationWorkflow.addStep(OpenRotationFormFunction, {
  interactivity: CreateRotationWorkflow.inputs.interactivity,
  channel: CreateRotationWorkflow.inputs.channel,
});

CreateRotationWorkflow.addStep(CreateRotationFunction, {
  name: RotationForm.outputs.name,
  channel: RotationForm.outputs.channel,
  roster: RotationForm.outputs.roster,
  time: RotationForm.outputs.time,
  timezone: RotationForm.outputs.timezone,
  frequency: RotationForm.outputs.frequency,
  repeats_every: RotationForm.outputs.repeats_every,
  on_days: RotationForm.outputs.on_days,
});

CreateRotationWorkflow.addStep(Schema.slack.functions.SendEphemeralMessage, {
  channel_id: RotationForm.outputs.channel,
  user_id: CreateRotationWorkflow.inputs.interactivity.interactor.id,
  message: `The rotation \`${RotationForm.outputs.name}\` was successfully created! :white_check_mark:`,
});

export default CreateRotationWorkflow;
