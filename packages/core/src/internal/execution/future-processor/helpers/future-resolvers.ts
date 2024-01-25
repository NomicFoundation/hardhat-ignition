import { isAddress } from "ethers";

import {
  isAccountRuntimeValue,
  isFuture,
  isModuleParameterRuntimeValue,
} from "../../../../type-guards";
import { DeploymentParameters } from "../../../../types/deploy";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ContractFuture,
  Future,
  ModuleParameterRuntimeValue,
  ReadEventArgumentFuture,
  SolidityParameterType,
  StaticCallFuture,
} from "../../../../types/module";
import { DeploymentLoader } from "../../../deployment-loader/types";
import { assertIgnitionInvariant } from "../../../utils/assertions";
import { replaceWithinArg } from "../../../utils/replace-within-arg";
import { resolveModuleParameter } from "../../../utils/resolve-module-parameter";
import { findAddressForContractFuture } from "../../../views/find-address-for-contract-future-by-id";
import { findConfirmedTransactionByFutureId } from "../../../views/find-confirmed-transaction-by-future-id";
import { findResultForFutureById } from "../../../views/find-result-for-future-by-id";
import { getEventArgumentFromReceipt } from "../../abi";
import { DeploymentState } from "../../types/deployment-state";
import { convertEvmValueToSolidityParam } from "../../utils/convert-evm-tuple-to-solidity-param";

/**
 * Resolve a futures value to a bigint.
 *
 * @param givenValue - either a bigint or a module parameter runtime value
 * @param deploymentParameters - the user provided deployment parameters
 * @returns the resolved bigint
 */
export function resolveValue(
  givenValue:
    | bigint
    | ModuleParameterRuntimeValue<bigint>
    | StaticCallFuture<string, string>
    | ReadEventArgumentFuture,
  deploymentParameters: DeploymentParameters,
  deploymentState: DeploymentState
): bigint {
  if (typeof givenValue === "bigint") {
    return givenValue;
  }

  let result: SolidityParameterType;
  if (isFuture(givenValue)) {
    result = findResultForFutureById(deploymentState, givenValue.id);
  } else {
    result = resolveModuleParameter(givenValue, {
      deploymentParameters,
    });
  }

  assertIgnitionInvariant(
    typeof result === "bigint",
    "Module parameter or future result used as value must be a bigint"
  );

  return result;
}

/**
 * Recursively resolve an arguments array, replacing any runtime values
 * or futures with their resolved values.
 */
export function resolveArgs(
  args: ArgumentType[],
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): SolidityParameterType[] {
  const replace = (arg: ArgumentType) =>
    replaceWithinArg<SolidityParameterType>(arg, {
      bigint: (bi) => bi,
      future: (f) => {
        return findResultForFutureById(deploymentState, f.id);
      },
      accountRuntimeValue: (arv) => {
        return resolveAccountRuntimeValue(arv, accounts);
      },
      moduleParameterRuntimeValue: (mprv) => {
        const resolvedParam = resolveModuleParameter(mprv, {
          deploymentParameters,
        });

        if (isAccountRuntimeValue(resolvedParam)) {
          return resolveAccountRuntimeValue(resolvedParam, accounts);
        }

        return resolvedParam;
      },
    });

  return args.map(replace);
}

/**
 * Resolve a future's from field to either undefined (meaning defer until execution)
 * or a string address.
 */
export function resolveFutureFrom(
  from: string | AccountRuntimeValue | undefined,
  accounts: string[],
  defaultSender: string
): string {
  if (from === undefined) {
    return defaultSender;
  }

  if (typeof from === "string") {
    return from;
  }

  return resolveAccountRuntimeValue(from, accounts);
}

/**
 * Resolves an account runtime value to an address.
 */
export function resolveAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[]
): string {
  const address = accounts[arv.accountIndex];
  assertIgnitionInvariant(
    address !== undefined,
    `Account ${arv.accountIndex} not found`
  );

  return address;
}

/**
 * Resolve a futures dependent libraries to a map of library names to addresses.
 */
export function resolveLibraries(
  libraries: Record<string, ContractFuture<string>>,
  deploymentState: DeploymentState
): { [libName: string]: string } {
  return Object.fromEntries(
    Object.entries(libraries).map(([key, lib]) => [
      key,
      findAddressForContractFuture(deploymentState, lib.id),
    ])
  );
}

/**
 * Resolve a contract future down to the address it is deployed at.
 */
export function resolveAddressForContractFuture(
  contract: ContractFuture<string>,
  deploymentState: DeploymentState
): string {
  return findAddressForContractFuture(deploymentState, contract.id);
}

/**
 * Resolve a SendDataFuture's "to" field to a valid ethereum address.
 */
export function resolveSendToAddress(
  to:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>
    | AccountRuntimeValue,
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters,
  accounts: string[]
): string {
  if (typeof to === "string") {
    return to;
  }

  if (isAccountRuntimeValue(to)) {
    return resolveAccountRuntimeValue(to, accounts);
  }

  return resolveAddressLike(to, deploymentState, deploymentParameters);
}

/**
 * Resolve the given address like to a valid ethereum address. Futures
 * will be resolved to their result then runtime checked to ensure
 * they are a valid address.
 */
export function resolveAddressLike(
  addressLike:
    | string
    | AddressResolvableFuture
    | ModuleParameterRuntimeValue<string>,
  deploymentState: DeploymentState,
  deploymentParameters: DeploymentParameters
): string {
  if (typeof addressLike === "string") {
    return addressLike;
  }

  if (isModuleParameterRuntimeValue(addressLike)) {
    const addressFromParam = resolveModuleParameter(addressLike, {
      deploymentParameters,
    });

    assertIgnitionInvariant(
      typeof addressFromParam === "string",
      "Module parameter used as address must be a string"
    );

    return addressFromParam;
  }

  const result = findResultForFutureById(deploymentState, addressLike.id);

  assertIgnitionInvariant(
    typeof result === "string" && isAddress(result),
    `Future '${addressLike.id}' must be a valid address`
  );

  return result;
}

/**
 * Resolves a read event argument result to a SolidityParameterType.
 */
export async function resolveReadEventArgumentResult(
  future: Future,
  emitter: ContractFuture<string>,
  eventName: string,
  eventIndex: number,
  nameOrIndex: string | number,
  deploymentState: DeploymentState,
  deploymentLoader: DeploymentLoader
): Promise<{
  result: SolidityParameterType;
  emitterAddress: string;
  txToReadFrom: string;
}> {
  const emitterAddress = resolveAddressForContractFuture(
    emitter,
    deploymentState
  );

  const emitterArtifact = await deploymentLoader.loadArtifact(emitter.id);

  const confirmedTx = findConfirmedTransactionByFutureId(
    deploymentState,
    future.id
  );

  const evmValue = getEventArgumentFromReceipt(
    confirmedTx.receipt,
    emitterArtifact,
    emitterAddress,
    eventName,
    eventIndex,
    nameOrIndex
  );

  return {
    result: convertEvmValueToSolidityParam(evmValue),
    emitterAddress,
    txToReadFrom: confirmedTx.hash,
  };
}
