import { Manifest } from "deno-slack-sdk/mod.ts";

import {
  IncludedDaysOfWeekType,
  RotationDatastore,
  RotationScheduleType,
} from "./datastores/rotation.ts";

import { CreateRotationWorkflow } from "./workflows/create_rotation.ts";
import { UpdateRotationWorkflow } from "./workflows/update_rotation.ts";
import { ListRotationsWorkflow } from "./workflows/list_rotations.ts";
import { DeleteRotationsWorkflow } from "./workflows/delete_rotations.ts";
import { SendReminderWorkflow } from "./workflows/send_reminder.ts";
import { RemoveUserFromRotationWorkflow } from "./workflows/remove_user_from_rotation.ts";

import { OpenRotationFormFunction } from "./functions/open_rotation_form.ts";
import { CreateRotationFunction } from "./functions/create_rotation.ts";
import { UpdateRotationFunction } from "./functions/update_rotation.ts";
import { GetRotationFunction } from "./functions/get_rotation.ts";
import { DeleteRotationsFunction } from "./functions/delete_rotations.ts";
import { ListRotationsFunction } from "./functions/list_rotations.ts";
import { RotateFunction } from "./functions/rotate.ts";
import { SendReminderFunction } from "./functions/send_reminder.ts";
import { RemoveUserFromRotationFunction } from "./functions/remove_user_from_rotation.ts";

export default Manifest({
  name: "rrr",
  description: "A round robin rotation app for pirates. Arrrgh!",
  icon: "assets/icon.png",
  datastores: [RotationDatastore],
  types: [IncludedDaysOfWeekType, RotationScheduleType],
  functions: [
    OpenRotationFormFunction,
    CreateRotationFunction,
    UpdateRotationFunction,
    GetRotationFunction,
    DeleteRotationsFunction,
    ListRotationsFunction,
    RotateFunction,
    SendReminderFunction,
    RemoveUserFromRotationFunction,
  ],
  workflows: [
    CreateRotationWorkflow,
    UpdateRotationWorkflow,
    DeleteRotationsWorkflow,
    ListRotationsWorkflow,
    SendReminderWorkflow,
    RemoveUserFromRotationWorkflow,
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
