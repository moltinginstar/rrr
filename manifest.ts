import { Manifest } from "deno-slack-sdk/mod.ts";

import {
  IncludedDaysOfWeekType,
  RotationDatastore,
  RotationScheduleType,
} from "./datastores/rotation.ts";

import { CreateRotationWorkflow } from "./workflows/create_rotation.ts";
import { UpdateRotationWorkflow } from "./workflows/update_rotation.ts";
import { ListRotationsWorkflow } from "./workflows/list_rotations.ts";
import { SendReminderWorkflow } from "./workflows/send_reminder.ts";

import { OpenRotationFormFunction } from "./functions/open_rotation_form.ts";
import { UpsertRotationFunction } from "./functions/upsert_rotation.ts";
import { SendReminderFunction } from "./functions/send_reminder.ts";
import { GetRotationFunction } from "./functions/get_rotation.ts";
import { ListRotationsFunction } from "./functions/list_rotations.ts";
import { RotateFunction } from "./functions/rotate.ts";

export default Manifest({
  name: "rrr",
  description: "A round robin rotation app for pirates. Arrrgh!",
  icon: "assets/icon.png",
  datastores: [RotationDatastore],
  types: [
    IncludedDaysOfWeekType,
    RotationScheduleType,
  ],
  functions: [
    OpenRotationFormFunction,
    UpsertRotationFunction,
    SendReminderFunction,
    RotateFunction,
    GetRotationFunction,
    ListRotationsFunction,
  ],
  workflows: [
    CreateRotationWorkflow,
    UpdateRotationWorkflow,
    ListRotationsWorkflow,
    SendReminderWorkflow,
  ],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "datastore:read",
    "datastore:write",
    "triggers:read",
    "triggers:write",
    "channels:read",
    "groups:read",
    "im:read",
    "mpim:read",
  ],
});
