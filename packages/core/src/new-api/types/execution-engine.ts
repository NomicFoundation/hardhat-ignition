import { ExecutionState, ExecutionStateMap } from "./execution-state";
import {
  Journal,
  JournalableMessage,
  OnchainInteraction,
  OnchainResult,
} from "./journal";
import { IgnitionModule, IgnitionModuleResult } from "./module";
import { TransactionService } from "./transaction-service";

export interface ExecutionEngineState {
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
  accounts: string[];
  strategy: ExecutionStrategy;
  journal: Journal;
  transactionService: TransactionService;
}

export interface ExecutionStrategy {
  executeStrategy: ({
    executionState,
  }: {
    executionState: ExecutionState;
  }) => AsyncGenerator<
    OnchainInteraction,
    JournalableMessage,
    OnchainResult | null
  >;
}
