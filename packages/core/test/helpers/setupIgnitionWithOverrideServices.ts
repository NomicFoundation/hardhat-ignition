import { ICommandJournal } from "../../src";
import { Ignition } from "../../src/Ignition";
import { Services } from "../../src/internal/types/services";

import { getMockProviders } from "./getMockProviders";

export function setupIgnitionWithOverrideServices({
  services,
  journal,
}: {
  services: Services;
  journal?: ICommandJournal;
}) {
  const ignition = new Ignition({ providers: getMockProviders(), journal });

  (ignition as any)._services = services;

  return ignition;
}
