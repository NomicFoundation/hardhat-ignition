import { ArtifactType, SolidityParamType, SolidityParamsType } from "../stubs";

/**
 * The different future types supported by Ignition.
 *
 * @beta
 */
export enum FutureType {
  NAMED_CONTRACT_DEPLOYMENT,
  ARTIFACT_CONTRACT_DEPLOYMENT,
  NAMED_LIBRARY_DEPLOYMENT,
  ARTIFACT_LIBRARY_DEPLOYMENT,
  NAMED_CONTRACT_CALL,
  NAMED_STATIC_CALL,
  CONTRACT_AT,
}

/**
 * The unit of execution in an Ignition deploy.
 *
 * @beta
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Future<ResultT = unknown> {
  id: string; // Unique identifier of a future. My current proposal "<module-id>:<extra identifier created by each action>"

  type: FutureType;

  // The following fields define the deployment graph

  // TODO: Not convinced about this circular dependency between module and future.
  module: IgnitionModule;

  // Any future that needs to be executed before this one
  dependencies: Set<Future>;
}

/**
 * A future representing a contract. Either an existing one or one
 * that will be deployed.
 *
 * @beta
 */
export interface ContractFuture<ContractNameT extends string>
  extends Future<string> {
  contractName: ContractNameT;
}

/**
 * A future representing a call. Either a static one or one that modifies contract state
 *
 * @beta
 */
export interface FunctionCallFuture<FunctionNameT extends string>
  extends Future<string> {
  functionName: FunctionNameT;
}

/**
 * A future representing the deployment of a contract that belongs to this project.
 *
 * @beta
 */
export interface NamedContractDeploymentFuture<ContractNameT extends string>
  extends ContractFuture<ContractNameT> {
  type: FutureType.NAMED_CONTRACT_DEPLOYMENT;
  constructorArgs: SolidityParamsType;
  libraries: Record<string, ContractFuture<string>>;
}

/**
 * A future representing the deployment of a contract that we only know its artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactContractDeploymentFuture
  extends ContractFuture<string> {
  type: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT;
  artifact: ArtifactType;
  constructorArgs: SolidityParamsType;
  libraries: Record<string, ContractFuture<string>>;
}

/**
 * A future representing the deployment of a library that belongs to this project
 *
 * @beta
 */
export interface NamedLibraryDeploymentFuture<LibraryNameT extends string>
  extends ContractFuture<LibraryNameT> {
  type: FutureType.NAMED_LIBRARY_DEPLOYMENT;
  libraries: Record<string, ContractFuture<string>>;
}

/**
 * A future representing the deployment of a library that we only know its artifact.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ArtifactLibraryDeploymentFuture
  extends ContractFuture<string> {
  type: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
  artifact: ArtifactType;
  libraries: Record<string, ContractFuture<string>>;
}

/**
 * A future representing the calling of a contract function that modifies on-chain state
 *
 * @beta
 */
export interface NamedContractCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> extends FunctionCallFuture<FunctionNameT> {
  type: FutureType.NAMED_CONTRACT_CALL;
  contract: ContractFuture<ContractNameT>;
  args: SolidityParamsType;
}

/**
 * A future representing the static calling of a contract function that does not modify state
 *
 * @beta
 */
export interface NamedStaticCallFuture<
  ContractNameT extends string,
  FunctionNameT extends string
> extends FunctionCallFuture<FunctionNameT> {
  type: FutureType.NAMED_STATIC_CALL;
  contract: ContractFuture<ContractNameT>;
  args: SolidityParamsType;
}

/**
 * A future representing a previously deployed contract at a known address.
 * It may not belong to this project, and we may struggle to type.
 *
 * @beta
 */
export interface ContractAtFuture extends ContractFuture<string> {
  type: FutureType.CONTRACT_AT;
  address: string;
  artifact: ArtifactType;
}

/**
 * An object containing the parameters passed into the module.
 *
 * @beta
 */
export interface ModuleParameters {
  [parameterName: string]: SolidityParamType;
}

/**
 * The results of deploying a module must be a dictionary of contract futures
 *
 * @beta
 */
export interface IgnitionModuleResult<ContractNameT extends string> {
  [name: string]: ContractFuture<ContractNameT>;
}

/**
 * A recipe for deploying and configuring contracts.
 *
 * @beta
 */
export interface IgnitionModule<
  ModuleIdT extends string = string,
  ContractNameT extends string = string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT> = IgnitionModuleResult<ContractNameT>
> {
  id: ModuleIdT; // Unique id
  futures: Set<Future>; // Future created in this module — All of them have to be deployed before returning the results. Note that not all of them are in results
  submodules: Set<IgnitionModule>; // Modules used by this module — Note that there's only one instance of each module
  results: IgnitionModuleResultsT; // The futures returned by the callback passed to buildModule
}
