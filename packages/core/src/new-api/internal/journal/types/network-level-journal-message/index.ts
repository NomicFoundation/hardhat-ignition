import { NetworkInteraction } from "../../../execution/transaction-types";
import { JournalMessageType } from "../journal";

export type NetworkLevelJournalMessage = StartNetworkInteractionMessage;

export interface StartNetworkInteractionMessage {
  type: JournalMessageType.NETWORK_INTERACTION_START;
  futureId: string;
  interaction: Omit<NetworkInteraction, "nonce" | "transactions">;
}
