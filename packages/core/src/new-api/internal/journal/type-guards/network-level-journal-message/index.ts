import { JournalMessageType, JournalableMessage } from "../../types";
import { NetworkLevelJournalMessage } from "../../types/network-level-journal-message";

export function isNetworkLevelJournalMessage(
  potential: JournalableMessage
): potential is NetworkLevelJournalMessage {
  return isStartNetworkInteractionMessage(potential);
}

export function isStartNetworkInteractionMessage(
  potential: JournalableMessage
): potential is NetworkLevelJournalMessage {
  return potential.type === JournalMessageType.NETWORK_INTERACTION_START;
}
