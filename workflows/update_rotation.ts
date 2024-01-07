import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { OpenRotationFormFunction } from "../functions/open_rotation_form.ts";
import { UpdateRotationFunction } from "../functions/update_rotation.ts";
import { GetRotationFunction } from "../functions/get_rotation.ts";

export const UpdateRotationWorkflow = DefineWorkflow({
  callback_id: "update_rotation",
  title: "Update a rotation",
  input_parameters: {
    properties: {
      interactivity: {
        type: Schema.slack.types.interactivity,
      },
      channel: {
        type: Schema.slack.types.channel_id,
      },
      trigger_id: {
        type: Schema.types.string,
      },
    },
    required: ["interactivity", "channel", "trigger_id"],
  },
});

const Rotation = UpdateRotationWorkflow.addStep(GetRotationFunction, {
  interactivity: UpdateRotationWorkflow.inputs.interactivity,
  trigger_id: UpdateRotationWorkflow.inputs.trigger_id,
});

const RotationForm = UpdateRotationWorkflow.addStep(OpenRotationFormFunction, {
  interactivity: Rotation.outputs.interactivity,
  mode: "update",
  name: Rotation.outputs.name,
  channel: Rotation.outputs.channel,
  roster: Rotation.outputs.roster,
  time: Rotation.outputs.time,
  frequency: Rotation.outputs.frequency,
  repeats_every: Rotation.outputs.repeats_every,
  on_days: Rotation.outputs.on_days,
});

UpdateRotationWorkflow.addStep(UpdateRotationFunction, {
  trigger_id: UpdateRotationWorkflow.inputs.trigger_id,
  name: RotationForm.outputs.name,
  channel: RotationForm.outputs.channel,
  roster: RotationForm.outputs.roster,
  time: RotationForm.outputs.time,
  frequency: RotationForm.outputs.frequency,
  repeats_every: RotationForm.outputs.repeats_every,
  on_days: RotationForm.outputs.on_days,
});

UpdateRotationWorkflow.addStep(Schema.slack.functions.SendEphemeralMessage, {
  channel_id: RotationForm.outputs.channel,
  user_id: UpdateRotationWorkflow.inputs.interactivity.interactor.id,
  message: `The rotation \`${RotationForm.outputs.name}\` was successfully updated! :white_check_mark:`,
});

export default UpdateRotationWorkflow;
