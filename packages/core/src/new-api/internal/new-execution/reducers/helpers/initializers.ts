import { FutureType } from "../../../../types/module";
import {
  CallExecutionState,
  ContractAtExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
  ReadEventArgumentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../types/execution-state";
import {
  CallExecutionStateInitializeMessage,
  ContractAtExecutionStateInitializeMessage,
  DeploymentExecutionStateInitializeMessage,
  ReadEventArgExecutionStateInitializeMessage,
  SendDataExecutionStateInitializeMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../../types/messages";

export function initialiseDeploymentExecutionStateFrom(
  action: DeploymentExecutionStateInitializeMessage
): DeploymentExecutionState {
  const deploymentExecutionInitialState: DeploymentExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
    futureType: action.futureType,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractName: action.contractName,
    constructorArgs: action.constructorArgs,
    libraries: action.libraries,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return deploymentExecutionInitialState;
}

export function initialiseStaticCallExecutionStateFrom(
  action: StaticCallExecutionStateInitializeMessage
): StaticCallExecutionState {
  const callExecutionInitialState: StaticCallExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
    futureType: FutureType.NAMED_STATIC_CALL,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractAddress: action.contractAddress,
    functionName: action.functionName,
    args: action.args,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

export function initialiseSendDataExecutionStateFrom(
  action: SendDataExecutionStateInitializeMessage
): SendDataExecutionState {
  const callExecutionInitialState: SendDataExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.SEND_DATA_EXECUTION_STATE,
    futureType: FutureType.SEND_DATA,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    to: action.to,
    data: action.data,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}

export function initialiseReadEventArgumentExecutionStateFrom(
  action: ReadEventArgExecutionStateInitializeMessage
): ReadEventArgumentExecutionState {
  const readEventArgumentExecutionInitialState: ReadEventArgumentExecutionState =
    {
      id: action.futureId,
      type: ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
      futureType: FutureType.READ_EVENT_ARGUMENT,
      strategy: action.strategy,
      status: ExecutionStatus.SUCCESS,
      dependencies: new Set<string>(action.dependencies),
      artifactFutureId: action.artifactFutureId,
      eventName: action.eventName,
      argumentName: action.argumentName,
      txToReadFrom: action.txToReadFrom,
      emitterAddress: action.emitterAddress,
      eventIndex: action.eventIndex,
      result: action.result,
    };

  return readEventArgumentExecutionInitialState;
}

export function initialiseContractAtExecutionStateFrom(
  action: ContractAtExecutionStateInitializeMessage
): ContractAtExecutionState {
  const contractAtExecutionInitialState: ContractAtExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
    futureType: action.futureType,
    strategy: action.strategy,
    status: ExecutionStatus.SUCCESS,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractName: action.contractName,
    contractAddress: action.contractAddress,
  };

  return contractAtExecutionInitialState;
}

export function initialiseCallExecutionStateFrom(
  action: CallExecutionStateInitializeMessage
): CallExecutionState {
  const callExecutionInitialState: CallExecutionState = {
    id: action.futureId,
    type: ExecutionSateType.CALL_EXECUTION_STATE,
    futureType: FutureType.NAMED_CONTRACT_CALL,
    strategy: action.strategy,
    status: ExecutionStatus.STARTED,
    dependencies: new Set<string>(action.dependencies),
    artifactFutureId: action.artifactFutureId,
    contractAddress: action.contractAddress,
    functionName: action.functionName,
    args: action.args,
    value: action.value,
    from: action.from,
    networkInteractions: [],
  };

  return callExecutionInitialState;
}