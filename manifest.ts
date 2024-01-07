import { Manifest } from "deno-slack-sdk/mod.ts";
import { RotationDatastore } from "./datastores/rotation.ts";
import { CreateRotationWorkflow } from "./workflows/create_rotation.ts";
import { SendReminderWorkflow } from "./workflows/send_reminder.ts";
import { CreateRotationFunction } from "./functions/create_rotation.ts";
import { UpsertRotationFunction } from "./functions/upsert_rotation.ts";
import { RotateFunction } from "./functions/rotate.ts";
import { SendReminderFunction } from "./functions/send_reminder.ts";

export default Manifest({
  name: "rrr",
  description: "A round robin rotation app for pirates. Arrrgh!",
  icon: "assets/icon.png",
  datastores: [RotationDatastore],
  functions: [
    CreateRotationFunction,
    SendReminderFunction,
    RotateFunction,
    UpsertRotationFunction,
  ],
  workflows: [CreateRotationWorkflow, SendReminderWorkflow],
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