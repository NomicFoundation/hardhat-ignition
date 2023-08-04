import { isStartNetworkInteractionMessage } from "../../journal/type-guards/network-level-journal-message";
import { NetworkLevelJournalMessage } from "../../journal/types/network-level-journal-message";
import { isDeploymentExecutionState } from "../../type-guards";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { ExecutionState, ExecutionStateMap } from "../types";

export function networkLevelReducer(
  executionStateMap: ExecutionStateMap,
  action: NetworkLevelJournalMessage
): ExecutionStateMap {
  const previousExState = executionStateMap[action.futureId];

  assertIgnitionInvariant(
    previousExState !== undefined,
    "On chain message for nonexistant future"
  );

  assertIgnitionInvariant(isDeploymentExecutionState(previousExState), "TBD");

  assertIgnitionInvariant(isStartNetworkInteractionMessage(action), "TBD");

  const updateWithOnchainAction: ExecutionState = {
    ...previousExState,
    networkInteractions: [
      ...previousExState.networkInteractions,
      {
        ...action.interaction,
        nonce: null,
        transactions: [],
      },
    ],
  };

  return {
    ...executionStateMap,
    [action.futureId]: updateWithOnchainAction,
  };
}
