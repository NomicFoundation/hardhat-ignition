import {
  decodeArtifactCustomError,
  decodeArtifactFunctionCallResult,
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
  executeOnchainInteractionRequest,
  executeStaticCallRequest,
  getStaticCallExecutionStateResultValue,
} from "./execution-strategy-helpers";
import { ExecutionResultType } from "./types/execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./types/execution-state";
import {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
  ExecutionStrategy,
  LoadArtifactFunction,
  OnchainInteractionResponseType,
  SendDataStrategyGenerator,
  StaticCallStrategyGenerator,
} from "./types/execution-strategy";
import { NetworkInteractionType } from "./types/network-interaction";

/**
 * The most basic execution strategy, which sends a single transaction
 * for each deployment, call, and send data, and a single static call
 * per static call execution.
 */
export class BasicExecutionStrategy implements ExecutionStrategy {
  public readonly name: string = "basic";

  constructor(private readonly _loadArtifact: LoadArtifactFunction) {}

  public async *executeDeployment(
    executionState: DeploymentExecutionState
  ): DeploymentStrategyGenerator {
    const artifact = await this._loadArtifact(executionState.artifactFutureId);

    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        data: encodeArtifactDeploymentData(
          artifact,
          executionState.constructorArgs,
          executionState.libraries
        ),
        value: executionState.value,
      },
      undefined,
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    if (
      transactionOrResult.type !==
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION
    ) {
      return transactionOrResult;
    }

    const tx = transactionOrResult.transaction;
    const contractAddress = tx.receipt.contractAddress;

    if (contractAddress === undefined) {
      return {
        type: ExecutionResultType.STRATEGY_ERROR,
        error: `Transaction ${tx.hash} confirmed but it didn't create a contract`,
      };
    }

    return {
      type: ExecutionResultType.SUCCESS,
      address: contractAddress,
    };
  }

  public async *executeCall(
    executionState: CallExecutionState
  ): CallStrategyGenerator {
    const artifact = await this._loadArtifact(executionState.artifactFutureId);

    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: executionState.contractAddress,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args
        ),
        value: executionState.value,
      },

      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData
        ),
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    if (
      transactionOrResult.type !==
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION
    ) {
      return transactionOrResult;
    }

    return {
      type: ExecutionResultType.SUCCESS,
    };
  }

  public async *executeSendData(
    executionState: SendDataExecutionState
  ): SendDataStrategyGenerator {
    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: undefined,
        data: executionState.data,
        value: executionState.value,
      }
    );

    if (
      transactionOrResult.type !==
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION
    ) {
      return transactionOrResult;
    }

    return {
      type: ExecutionResultType.SUCCESS,
    };
  }

  public async *executeStaticCall(
    executionState: StaticCallExecutionState
  ): StaticCallStrategyGenerator {
    const artifact = await this._loadArtifact(executionState.artifactFutureId);

    const decodedResultOrError = yield* executeStaticCallRequest(
      {
        id: 1,
        type: NetworkInteractionType.STATIC_CALL,
        to: executionState.contractAddress,
        from: executionState.from,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args
        ),
        value: 0n,
      },
      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData
        ),
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    if (decodedResultOrError.type === ExecutionResultType.STATIC_CALL_ERROR) {
      return decodedResultOrError;
    }

    return {
      type: ExecutionResultType.SUCCESS,
      value: getStaticCallExecutionStateResultValue(
        executionState,
        decodedResultOrError
      ),
    };
  }
}
