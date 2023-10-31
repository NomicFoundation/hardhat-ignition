import { DeploymentParameters } from "../../../../types/deploy";
import { Future, FutureType } from "../../../../types/module";
import { DeploymentLoader } from "../../../deployment-loader/types";
import { DeploymentState } from "../../types/deployment-state";
import {
  CallExecutionStateInitializeMessage,
  ContractAtExecutionStateInitializeMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessage,
  JournalMessageType,
  ReadEventArgExecutionStateInitializeMessage,
  SendDataExecutionStateInitializeMessage,
  StaticCallExecutionStateInitializeMessage,
} from "../../types/messages";

import {
  resolveAddressForContractFuture,
  resolveAddressLike,
  resolveArgs,
  resolveFutureFrom,
  resolveLibraries,
  resolveReadEventArgumentResult,
  resolveToAddress,
  resolveValue,
} from "./future-resolvers";

export async function buildInitializeMessageFor(
  future: Future,
  deploymentState: DeploymentState,
  strategy: { name: string },
  deploymentParameters: DeploymentParameters,
  deploymentLoader: DeploymentLoader,
  accounts: string[],
  defaultSender: string
): Promise<JournalMessage> {
  switch (future.type) {
    case FutureType.NAMED_ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.CONTRACT_DEPLOYMENT:
      const deploymentExecStateInit: DeploymentExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            futureType: future.type,
            artifactId: future.id,
            contractName: future.contractName,
            constructorArgs: resolveArgs(
              future.constructorArgs,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            libraries: resolveLibraries(future.libraries, deploymentState),
            value: resolveValue(
              future.value,
              deploymentParameters,
              deploymentState
            ),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          }
        );

      return deploymentExecStateInit;
    case FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.LIBRARY_DEPLOYMENT:
      const libraryDeploymentInit: DeploymentExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            futureType: future.type,
            artifactId: future.id,
            contractName: future.contractName,
            constructorArgs: [],
            libraries: resolveLibraries(future.libraries, deploymentState),
            value: BigInt(0),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          }
        );

      return libraryDeploymentInit;
    case FutureType.CONTRACT_CALL: {
      const namedContractCallInit: CallExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            args: resolveArgs(
              future.args,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            functionName: future.functionName,
            contractAddress: resolveAddressForContractFuture(
              future.contract,
              deploymentState
            ),
            artifactId: future.contract.id,
            value: resolveValue(
              future.value,
              deploymentParameters,
              deploymentState
            ),
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          }
        );

      return namedContractCallInit;
    }
    case FutureType.STATIC_CALL: {
      const namedStaticCallInit: StaticCallExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            args: resolveArgs(
              future.args,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            nameOrIndex: future.nameOrIndex,
            functionName: future.functionName,
            contractAddress: resolveAddressForContractFuture(
              future.contract,
              deploymentState
            ),
            artifactId: future.contract.id,
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          }
        );

      return namedStaticCallInit;
    }
    case FutureType.NAMED_ARTIFACT_CONTRACT_AT:
    case FutureType.CONTRACT_AT: {
      const contractAtInit: ContractAtExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            futureType: future.type,
            contractName: future.contractName,
            contractAddress: resolveAddressLike(
              future.address,
              deploymentState,
              deploymentParameters
            ),
            artifactId: future.id,
          }
        );

      return contractAtInit;
    }
    case FutureType.READ_EVENT_ARGUMENT: {
      const { txToReadFrom, emitterAddress, result } =
        await resolveReadEventArgumentResult(
          future.futureToReadFrom,
          future.emitter,
          future.eventName,
          future.eventIndex,
          future.nameOrIndex,
          deploymentState,
          deploymentLoader
        );

      const readEventArgInit: ReadEventArgExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            artifactId: future.emitter.id,
            eventName: future.eventName,
            nameOrIndex: future.nameOrIndex,
            eventIndex: future.eventIndex,
            txToReadFrom,
            emitterAddress,
            result,
          }
        );

      return readEventArgInit;
    }
    case FutureType.SEND_DATA:
      const sendDataInit: SendDataExecutionStateInitializeMessage =
        _extendBaseInitWith(
          JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
          future,
          strategy,
          {
            to: resolveToAddress(
              future.to,
              deploymentState,
              deploymentParameters,
              accounts
            ),
            value: resolveValue(
              future.value,
              deploymentParameters,
              deploymentState
            ),
            data: future.data ?? "0x",
            from: resolveFutureFrom(future.from, accounts, defaultSender),
          }
        );

      return sendDataInit;
  }
}

function _extendBaseInitWith<
  FutureT extends Future,
  MessageT extends JournalMessageType,
  ExtensionT extends object
>(
  messageType: MessageT,
  future: FutureT,
  strategy: { name: string },
  extension: ExtensionT
): {
  type: MessageT;
  futureId: string;
  strategy: string;
  dependencies: string[];
} & ExtensionT {
  return {
    type: messageType,
    futureId: future.id,
    strategy: strategy.name,
    dependencies: [...future.dependencies].map((f) => f.id),
    ...extension,
  };
}
