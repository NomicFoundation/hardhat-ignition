import { Deployment } from "../../internal/deployment/Deployment";
import { ICommandJournal } from "../types/journal";

/**
 * Update the deployment execution state with the previous runs in the journal.
 */
export async function loadJournalInto(
  deployment: Deployment,
  journal: ICommandJournal
): Promise<void> {
  return deployment.load(journal.read());
}
