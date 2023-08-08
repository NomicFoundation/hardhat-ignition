import { IgnitionError } from "../../../errors";
import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionState,
  ExecutionStrategy,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../execution/types";
import {
  CallFunctionInteractionMessage,
  CalledFunctionExecutionSuccess,
  ContractAtExecutionSuccess,
  ContractAtInteractionMessage,
  DeployContractInteractionMessage,
  DeployedContractExecutionSuccess,
  ExecutionSuccess,
  JournalMessageType,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainInteractionMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
  ReadEventArgumentExecutionSuccess,
  ReadEventArgumentInteractionMessage,
  SendDataExecutionSuccess,
  SendDataInteractionMessage,
  StaticCallExecutionSuccess,
  StaticCallInteractionMessage,
} from "../journal/types";
import { StartNetworkInteractionMessage } from "../journal/types/network-level-journal-message";
import {
  isCallExecutionState,
  isContractAtExecutionState,
  isDeploymentExecutionState,
  isReadEventArgumentExecutionState,
  isSendDataExecutionState,
  isStaticCallExecutionState,
} from "../type-guards";
import { assertIgnitionInvariant } from "../utils/assertions";
import {
  NetworkInteractionType,
  OnchainInteraction,
} from "./transaction-types";

export class BasicExecutionStrategy implements ExecutionStrategy {
  public executeStrategy({
    executionState,
    sender,
  }: {
    executionState: ExecutionState;
    sender?: string;
  }): AsyncGenerator<
    OnchainInteractionMessage | StartNetworkInteractionMessage,
    OnchainInteractionMessage | ExecutionSuccess,
    OnchainResultMessage | null
  > {
    if (isDeploymentExecutionState(executionState)) {
      return this._executeDeployment({ executionState, sender });
    }

    if (isCallExecutionState(executionState)) {
      return this._executeCall({ executionState, sender });
    }

    if (isStaticCallExecutionState(executionState)) {
      return this._executeStaticCall({ executionState, sender });
    }

    if (isReadEventArgumentExecutionState(executionState)) {
      return this._executeReadEventArgument({ executionState });
    }

    if (isSendDataExecutionState(executionState)) {
      return this._executeSendData({ executionState, sender });
    }

    if (isContractAtExecutionState(executionState)) {
      return this._executeContractAt({ executionState });
    }

    // TODO: add type check
    throw new IgnitionError(
      "Basic strategy not implemented that execution state yet"
    );
  }

  private async *_executeDeployment({
    executionState: deploymentExecutionState,
    sender,
  }: {
    executionState: DeploymentExecutionState;
    sender?: string;
  }): AsyncGenerator<
    DeployContractInteractionMessage | StartNetworkInteractionMessage,
    DeployedContractExecutionSuccess,
    OnchainDeployContractSuccessMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for deployment execution"
    );

    const deployNetworkInteraction: Omit<
      OnchainInteraction,
      "nonce" | "transactions"
    > = {
      id: 1,
      type: NetworkInteractionType.ONCHAIN_INTERACTION,
      from: sender,
      value: deploymentExecutionState.value,
      to: undefined, // Undefined when it's a deployment transaction
      data: "",
    };

    const startNetworkInteraction: StartNetworkInteractionMessage = {
      type: JournalMessageType.NETWORK_INTERACTION_START,
      futureId: deploymentExecutionState.id,
      interaction: deployNetworkInteraction,
    };

    // const deployContract: DeployContractInteractionMessage = {
    //   type: JournalMessageType.ONCHAIN_ACTION,
    //   subtype: "deploy-contract",
    //   futureId: deploymentExecutionState.id,
    //   executionId: 1,
    //   contractName: deploymentExecutionState.contractName,
    //   value: deploymentExecutionState.value.toString(),
    //   args: deploymentExecutionState.constructorArgs,
    //   artifactFutureId: deploymentExecutionState.artifactFutureId,
    //   libraries: deploymentExecutionState.libraries,
    //   from: sender,
    // };

    const result = yield startNetworkInteraction;

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    return {
      type: JournalMessageType.EXECUTION_SUCCESS,
      subtype: "deploy-contract",
      futureId: deploymentExecutionState.id,
      contractName: deploymentExecutionState.contractName,
      contractAddress: result.contractAddress,
      txId: result.txId,
    };
  }

  private async *_executeCall({
    executionState: callExecutionState,
    sender,
  }: {
    executionState: CallExecutionState;
    sender?: string;
  }): AsyncGenerator<
    CallFunctionInteractionMessage,
    CalledFunctionExecutionSuccess,
    OnchainCallFunctionSuccessMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for call execution"
    );

    const result = yield {
      type: JournalMessageType.ONCHAIN_ACTION,
      subtype: "call-function",
      futureId: callExecutionState.id,
      executionId: 1,
      contractAddress: callExecutionState.contractAddress,
      artifactFutureId: callExecutionState.artifactFutureId,
      value: callExecutionState.value.toString(),
      args: callExecutionState.args,
      functionName: callExecutionState.functionName,
      from: sender,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    return {
      type: JournalMessageType.EXECUTION_SUCCESS,
      subtype: "call-function",
      futureId: callExecutionState.id,
      contractAddress: callExecutionState.contractAddress,
      functionName: callExecutionState.functionName,
      txId: result.txId,
    };
  }

  private async *_executeStaticCall({
    executionState: staticCallExecutionState,
    sender,
  }: {
    executionState: StaticCallExecutionState;
    sender?: string;
  }): AsyncGenerator<
    StaticCallInteractionMessage,
    StaticCallExecutionSuccess,
    OnchainStaticCallSuccessMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for static call execution"
    );

    const result = yield {
      type: JournalMessageType.ONCHAIN_ACTION,
      subtype: "static-call",
      futureId: staticCallExecutionState.id,
      executionId: 1,
      contractAddress: staticCallExecutionState.contractAddress,
      artifactFutureId: staticCallExecutionState.artifactFutureId,
      args: staticCallExecutionState.args,
      functionName: staticCallExecutionState.functionName,
      from: sender,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    return {
      type: JournalMessageType.EXECUTION_SUCCESS,
      subtype: "static-call",
      futureId: staticCallExecutionState.id,
      contractAddress: staticCallExecutionState.contractAddress,
      functionName: staticCallExecutionState.functionName,
      result: result.result,
    };
  }

  private async *_executeReadEventArgument({
    executionState: readEventArgExecutionState,
  }: {
    executionState: ReadEventArgumentExecutionState;
  }): AsyncGenerator<
    ReadEventArgumentInteractionMessage,
    ReadEventArgumentExecutionSuccess,
    OnchainReadEventArgumentSuccessMessage | null
  > {
    const result = yield {
      type: JournalMessageType.ONCHAIN_ACTION,
      subtype: "read-event-arg",
      futureId: readEventArgExecutionState.id,
      executionId: 1,
      artifactFutureId: readEventArgExecutionState.artifactFutureId,
      eventName: readEventArgExecutionState.eventName,
      argumentName: readEventArgExecutionState.argumentName,
      txToReadFrom: readEventArgExecutionState.txToReadFrom,
      emitterAddress: readEventArgExecutionState.emitterAddress,
      eventIndex: readEventArgExecutionState.eventIndex,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    return {
      type: JournalMessageType.EXECUTION_SUCCESS,
      subtype: "read-event-arg",
      futureId: readEventArgExecutionState.id,
      eventName: readEventArgExecutionState.eventName,
      argumentName: readEventArgExecutionState.argumentName,
      result: result.result,
    };
  }

  private async *_executeSendData({
    executionState: sendDataExecutionState,
    sender,
  }: {
    executionState: SendDataExecutionState;
    sender?: string;
  }): AsyncGenerator<
    SendDataInteractionMessage,
    SendDataExecutionSuccess,
    OnchainSendDataSuccessMessage | null
  > {
    assertIgnitionInvariant(
      sender !== undefined,
      "Sender must be defined for send execution"
    );

    const result = yield {
      type: JournalMessageType.ONCHAIN_ACTION,
      subtype: "send-data",
      futureId: sendDataExecutionState.id,
      executionId: 1,
      value: sendDataExecutionState.value.toString(),
      data: sendDataExecutionState.data,
      to: sendDataExecutionState.to,
      from: sender,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    return {
      type: JournalMessageType.EXECUTION_SUCCESS,
      subtype: "send-data",
      futureId: sendDataExecutionState.id,
      txId: result.txId,
    };
  }

  private async *_executeContractAt({
    executionState: contractAtExecutionState,
  }: {
    executionState: ContractAtExecutionState;
  }): AsyncGenerator<
    ContractAtInteractionMessage,
    ContractAtExecutionSuccess,
    OnchainContractAtSuccessMessage | null
  > {
    const result = yield {
      type: JournalMessageType.ONCHAIN_ACTION,
      subtype: "contract-at",
      futureId: contractAtExecutionState.id,
      executionId: 1,
      artifactFutureId: contractAtExecutionState.artifactFutureId,
      contractAddress: contractAtExecutionState.contractAddress,
      contractName: contractAtExecutionState.contractName,
    };

    if (result === null) {
      throw new IgnitionError("No result yielded");
    }

    return {
      type: JournalMessageType.EXECUTION_SUCCESS,
      subtype: "contract-at",
      futureId: contractAtExecutionState.id,
      contractAddress: contractAtExecutionState.contractAddress,
      contractName: contractAtExecutionState.contractName,
    };
  }
}
