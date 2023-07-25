import { Adapters } from "./types/adapters";
import { Artifact } from "./types/artifact";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArtifactContractAtFuture,
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractFuture,
  DeploymentFuture,
  FunctionCallFuture,
  Future,
  FutureType,
  ModuleParameterRuntimeValue,
  NamedContractAtFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
  ReadEventArgumentFuture,
  RuntimeValue,
  RuntimeValueType,
} from "./types/module";

function isValidEnumValue(
  theEnum: Record<string, string>,
  value: string
): boolean {
  // Enums are objects that have entries that map:
  //   1) keys to values
  //   2) values to keys
  const key = theEnum[value];
  if (key === undefined) {
    return false;
  }

  return theEnum[key] === value;
}

/**
 * Returns true if potential is of type Artifact.
 *
 * @beta
 */
export function isArtifactType(potential: unknown): potential is Artifact {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "contractName" in potential &&
    "bytecode" in potential &&
    "abi" in potential &&
    "linkReferences" in potential &&
    typeof potential.contractName === "string" &&
    typeof potential.bytecode === "string" &&
    Array.isArray(potential.abi) &&
    typeof potential.linkReferences === "object"
  );
}

/**
 * Returns true if potential is of type FutureType.
 *
 * @beta
 */
export function isFutureType(potential: unknown): potential is FutureType {
  return (
    typeof potential === "string" && isValidEnumValue(FutureType, potential)
  );
}

/**
 * Returns true if potential is of type Future.
 *
 * @beta
 */
export function isFuture(potential: unknown): potential is Future {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    isFutureType(potential.type)
  );
}

/**
 * Returns true if future is of type ContractFuture<string>.
 *
 * @beta
 */
export function isContractFuture(
  future: Future
): future is ContractFuture<string> {
  switch (future.type) {
    case FutureType.NAMED_CONTRACT_DEPLOYMENT:
    case FutureType.ARTIFACT_CONTRACT_DEPLOYMENT:
    case FutureType.NAMED_LIBRARY_DEPLOYMENT:
    case FutureType.ARTIFACT_LIBRARY_DEPLOYMENT:
    case FutureType.NAMED_CONTRACT_AT:
    case FutureType.ARTIFACT_CONTRACT_AT:
      return true;

    default:
      return false;
  }
}

/**
 * Returns true if future is of type AddressResolvable.
 *
 * @beta
 */
export function isAddressResolvableFuture(
  future: Future
): future is AddressResolvableFuture {
  return (
    isContractFuture(future) ||
    future.type === FutureType.NAMED_STATIC_CALL ||
    future.type === FutureType.READ_EVENT_ARGUMENT
  );
}

/**
 * Returns true if future is of type FunctionCallFuture\<string, string\>.
 *
 * @beta
 */
export function isFunctionCallFuture(
  future: Future
): future is FunctionCallFuture<string, string> {
  return (
    future.type === FutureType.NAMED_CONTRACT_CALL ||
    future.type === FutureType.NAMED_STATIC_CALL
  );
}

/**
 * Returns true if future is of type NamedStaticCallFuture.
 *
 * @beta
 */
export function isNamedStaticCallFuture(
  future: Future
): future is NamedStaticCallFuture<string, string> {
  return future.type === FutureType.NAMED_STATIC_CALL;
}

/**
 * Returns true if future is of type ReadEventArgumentFuture.
 *
 * @beta
 */
export function isReadEventArgumentFuture(
  future: Future
): future is NamedStaticCallFuture<string, string> {
  return future.type === FutureType.READ_EVENT_ARGUMENT;
}

/**
 * Returns true if future is of type NamedContractDeploymentFuture.
 *
 * @beta
 */
export function isNamedContractDeploymentFuture(
  future: Future
): future is NamedContractDeploymentFuture<string> {
  return future.type === FutureType.NAMED_CONTRACT_DEPLOYMENT;
}

/**
 * Returns true if future is of type ArtifactContractDeploymentFuture.
 *
 * @beta
 */
export function isArtifactContractDeploymentFuture(
  future: Future
): future is ArtifactContractDeploymentFuture {
  return future.type === FutureType.ARTIFACT_CONTRACT_DEPLOYMENT;
}

/**
 * Returns true if future is of type NamedLibraryDeploymentFuture.
 *
 * @beta
 */
export function isNamedLibraryDeploymentFuture(
  future: Future
): future is NamedLibraryDeploymentFuture<string> {
  return future.type === FutureType.NAMED_LIBRARY_DEPLOYMENT;
}

/**
 * Returns true if future is of type ArtifactLibraryDeploymentFuture.
 *
 * @beta
 */
export function isArtifactLibraryDeploymentFuture(
  future: Future
): future is ArtifactLibraryDeploymentFuture {
  return future.type === FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
}

/**
 * Returns true if future is of type NamedContractAtFuture.
 *
 * @beta
 */
export function isNamedContractAtFuture(
  future: Future
): future is NamedContractAtFuture<string> {
  return future.type === FutureType.NAMED_CONTRACT_AT;
}

/**
 * Returns true if future is of type ArtifactContractAtFuture.
 *
 * @beta
 */
export function isArtifactContractAtFuture(
  future: Future
): future is ArtifactContractAtFuture {
  return future.type === FutureType.ARTIFACT_CONTRACT_AT;
}

/**
 * Returns true if the type is of type DeploymentFuture<string>.
 *
 * @beta
 */
export function isDeploymentType(
  potential: unknown
): potential is DeploymentFuture<string>["type"] {
  const deploymentTypes = [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ];

  return (
    typeof potential === "string" &&
    deploymentTypes.includes(potential as FutureType)
  );
}

/**
 * Returns true if future is of type DeploymentFuture<string>.
 *
 * @beta
 */
export function isDeploymentFuture(
  future: Future
): future is DeploymentFuture<string> {
  return isDeploymentType(future.type);
}

/**
 * Returns true if the future requires submitting a transaction on-chain
 *
 * @beta
 */
export function isFutureThatSubmitsOnchainTransaction(
  f: Future
): f is Exclude<
  Exclude<
    Exclude<
      Exclude<Future, NamedStaticCallFuture<string, string>>,
      ReadEventArgumentFuture
    >,
    NamedContractAtFuture<string>
  >,
  ArtifactContractAtFuture
> {
  return (
    !isNamedStaticCallFuture(f) &&
    !isReadEventArgumentFuture(f) &&
    !isNamedContractAtFuture(f) &&
    !isArtifactContractAtFuture(f)
  );
}

/**
 * Returns true if potential is of type RuntimeValueType.
 *
 * @beta
 */
export function isRuntimeValueType(
  potential: unknown
): potential is RuntimeValueType {
  return (
    typeof potential === "string" &&
    isValidEnumValue(RuntimeValueType, potential)
  );
}

/**
 * Returns true if potential is of type RuntimeValue.
 *
 * @beta
 */
export function isRuntimeValue(potential: unknown): potential is RuntimeValue {
  return (
    typeof potential === "object" &&
    potential !== null &&
    "type" in potential &&
    isRuntimeValueType(potential.type)
  );
}

/**
 * Return true if potential is an account runtime value.
 *
 * @beta
 */
export function isAccountRuntimeValue(
  potential: unknown
): potential is AccountRuntimeValue {
  return (
    isRuntimeValue(potential) && potential.type === RuntimeValueType.ACCOUNT
  );
}

/**
 * Returns true if potential is of type ModuleParameterRuntimeValue<any>.
 *
 * @beta
 */
export function isModuleParameterRuntimeValue(
  potential: unknown
): potential is ModuleParameterRuntimeValue<any> {
  return (
    isRuntimeValue(potential) &&
    potential.type === RuntimeValueType.MODULE_PARAMETER
  );
}

/**
 * Returns true if potential is a set of adapters.
 *
 * @beta
 */
export function isAdapters(potential: unknown): potential is Adapters {
  return (
    typeof potential === "object" &&
    potential !== null &&
    /* TODO: make this type safe */
    "signer" in potential &&
    "gas" in potential &&
    "transactions" in potential
  );
}
