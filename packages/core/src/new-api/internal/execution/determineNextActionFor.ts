import { NetworkInteraction } from "./transaction-types";

export enum NetworkInteractionAction {
  REQUEST = "REQUEST",
}

export function determineNextActionFor(
  networkInteraction: NetworkInteraction
): NetworkInteractionAction {
  return NetworkInteractionAction.REQUEST;
}
