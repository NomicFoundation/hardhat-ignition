import { Abi, Artifact } from "./artifact";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  CallableContractFuture,
  ContractAtFuture,
  ContractCallFuture,
  ContractDeploymentFuture,
  ContractFuture,
  Future,
  IgnitionModule,
  IgnitionModuleResult,
  LibraryDeploymentFuture,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  ReadEventArgumentFuture,
  SendDataFuture,
  StaticCallFuture,
} from "./module";

/**
 * The options for a `contract` deployment.
 *
 * @beta
 */
export interface ContractOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
  value?:
    | bigint
    | ModuleParameterRuntimeValue<bigint>
    | StaticCallFuture<string, string>
    | ReadEventArgumentFuture;
  from?: string | AccountRuntimeValue;
}

/**
 * The options for a `library` call.
 *
 * @beta
 */
export interface LibraryOptions {
  id?: string;
  after?: Future[];
  libraries?: Record<string, ContractFuture<string>>;
  from?: string | AccountRuntimeValue;
}

/**
 * The options for a `call` call.
 *
 * @beta
 */
export interface CallOptions {
  id?: string;
  after?: Future[];
  value?:
    | bigint
    | ModuleParameterRuntimeValue<bigint>
    | StaticCallFuture<string, string>
    | ReadEventArgumentFuture;
  from?: string | AccountRuntimeValue;
}

/**
 * The options for a `staticCall` call.
 *
 * @beta
 */
export interface StaticCallOptions {
  id?: string;
  after?: Future[];
  from?: string | AccountRuntimeValue;
}

/**
 * The options for a `contractAt` call.
 *
 * @beta
 */
export interface ContractAtOptions {
  id?: string;
  after?: Future[];
}

/**
 * The options for a `readEventArgument` call.
 *
 * @beta
 */
export interface ReadEventArgumentOptions {
  /**
   * The future id.
   */
  id?: string;

  /**
   * The contract that emitted the event. If omitted the contract associated with
   * the future you are reading the event from will be used.
   */
  emitter?: ContractFuture<string>;

  /**
   * If multiple events with the same name were emitted by the contract, you can
   * choose which of those to read from by specifying its index (0-indexed).
   */
  eventIndex?: number;
}

/**
 * The options for a `send` call.
 *
 * @beta
 */
export interface SendDataOptions {
  after?: Future[];
  from?: string | AccountRuntimeValue;
}

/**
 * The build api for configuring a deployment within a module.
 *
 * @beta
 */
export interface IgnitionModuleBuilder {
  /**
   * Returns an account runtime value that can be used to specify the
   * account to use for a transaction.
   *
   * @param accountIndex - The index of the account to return
   *
   * @example
   * ```
   * const owner = m.getAccount(1);
   * const myContract = m.contract("MyContract", { from: owner });
   * // can also be used anywhere an address is expected
   * m.send("sendToOwner", owner, { value: 100 });
   * ```
   */
  getAccount(accountIndex: number): AccountRuntimeValue;

  /**
   * Allows you to specify a parameter that can be dynamically set during deployment.
   *
   * @param parameterName - The name of the parameter
   * @param defaultValue - The default value to use if the parameter is not provided
   *
   * @example
   * ```
   * const amount = m.getParameter("amount", 100);
   * const myContract = m.contract("MyContract", { value: amount });
   * ```
   */
  getParameter<ParamTypeT extends ModuleParameterType = any>(
    parameterName: string,
    defaultValue?: ParamTypeT
  ): ModuleParameterRuntimeValue<ParamTypeT>;

  /**
   * Deploys a contract.
   *
   * @param contractName - The name of the contract to deploy
   * @param args - The arguments to pass to the contract constructor
   * @param options - The options for the deployment
   *
   * @example
   * ```
   * const myContract = m.contract("MyContract", [], { value: 100 });
   * ```
   */
  contract<ContractNameT extends string>(
    contractName: ContractNameT,
    args?: ArgumentType[],
    options?: ContractOptions
  ): NamedArtifactContractDeploymentFuture<ContractNameT>;

  /**
   * Deploys a contract.
   *
   * @param contractName - The name of the contract to deploy
   * @param artifact - The artifact of the contract to deploy
   * @param args - The arguments to pass to the contract constructor
   * @param options - The options for the deployment
   *
   * @example
   * ```
   * const myContract = m.contract("MyContract", [], { value: 100 });
   * ```
   */
  contract<const AbiT extends Abi>(
    contractName: string,
    artifact: Artifact<AbiT>,
    args?: ArgumentType[],
    options?: ContractOptions
  ): ContractDeploymentFuture<AbiT>;

  /**
   * Deploys a library.
   *
   * @param libraryName - The name of the library to deploy
   * @param options - The options for the deployment
   *
   * @example
   * ```
   * const owner = m.getAccount(1);
   * const myLibrary = m.library("MyLibrary", { from: owner } );
   * ```
   */
  library<LibraryNameT extends string>(
    libraryName: LibraryNameT,
    options?: LibraryOptions
  ): NamedArtifactLibraryDeploymentFuture<LibraryNameT>;

  /**
   * Deploys a library.
   *
   * @param libraryName - The name of the library to deploy
   * @param artifact - The artifact of the library to deploy
   * @param options - The options for the deployment
   *
   * @example
   * ```
   * const owner = m.getAccount(1);
   * const myLibrary = m.library("MyLibrary", myLibraryArtifact, { from: owner });
   * ```
   */
  library<const AbiT extends Abi>(
    libraryName: string,
    artifact: Artifact<AbiT>,
    options?: LibraryOptions
  ): LibraryDeploymentFuture<AbiT>;

  /**
   * Calls a contract function.
   *
   * @param contractFuture - The contract to call
   * @param functionName - The name of the function to call
   * @param args - The arguments to pass to the function
   * @param options - The options for the call
   *
   * @example
   * ```
   * const myContract = m.contract("MyContract");
   * const myContractCall = m.call(myContract, "updateCounter", [100]);
   * ```
   */
  call<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: ArgumentType[],
    options?: CallOptions
  ): ContractCallFuture<ContractNameT, FunctionNameT>;

  /**
   * Statically calls a readonly contract function and returns the result.
   *
   * @param contractFuture - The contract to call
   * @param functionName - The name of the function to call
   * @param args - The arguments to pass to the function
   * @param nameOrIndex - The name or index of the return argument to read
   * @param options - The options for the call
   *
   * @example
   * ```
   * const myContract = m.contract("MyContract");
   * const counter = m.staticCall(myContract, "getCounterAndOwner", [], "counter");
   * ```
   */
  staticCall<ContractNameT extends string, FunctionNameT extends string>(
    contractFuture: CallableContractFuture<ContractNameT>,
    functionName: FunctionNameT,
    args?: ArgumentType[],
    nameOrIndex?: string | number,
    options?: StaticCallOptions
  ): StaticCallFuture<ContractNameT, FunctionNameT>;

  /**
   * Creates a contract instance at the specified address.
   *
   * @param contractName - The name of the contract
   * @param address - The address of the contract
   * @param options - The options for the instance
   *
   * @example
   * ```
   * const myContract = m.contractAt("MyContract", "0x1234...");
   * ```
   */
  contractAt<ContractNameT extends string>(
    contractName: ContractNameT,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions
  ): NamedArtifactContractAtFuture<ContractNameT>;

  /**
   * Creates a contract instance at the specified address.
   *
   * @param contractName - The name of the contract
   * @param artifact - The artifact of the contract
   * @param address - The address of the contract
   * @param options - The options for the instance
   *
   * @example
   * ```
   * const myContract = m.contractAt("MyContract", myContractArtifact, "0x1234...");
   * ```
   */
  contractAt<const AbiT extends Abi>(
    contractName: string,
    artifact: Artifact<AbiT>,
    address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    options?: ContractAtOptions
  ): ContractAtFuture<AbiT>;

  /**
   * Reads an event argument from a contract.
   *
   * @param futureToReadFrom - The future to read the event from
   * @param eventName - The name of the event
   * @param nameOrIndex - The name or index of the event argument to read
   * @param options - The options for the event
   *
   * @example
   * ```
   * const myContract = m.contract("MyContract");
   * // assuming the event is emitted by the constructor of MyContract
   * const owner = m.readEventArgument(myContract, "ContractCreated", "owner");
   *
   * // or, if the event is emitted during a function call:
   * const myContractCall = m.call(myContract, "updateCounter", [100]);
   * const counter = m.readEventArgument(
   *   myContractCall,
   *   "CounterUpdated",
   *   "counter",
   *   {
   *     emitter: myContract
   *   }
   * );
   * ```
   */
  readEventArgument(
    futureToReadFrom:
      | NamedArtifactContractDeploymentFuture<string>
      | ContractDeploymentFuture
      | SendDataFuture
      | ContractCallFuture<string, string>,
    eventName: string,
    nameOrIndex: string | number,
    options?: ReadEventArgumentOptions
  ): ReadEventArgumentFuture;

  /**
   * Sends a transaction.
   *
   * @param id - A custom id for the Future
   * @param to - The address to send the transaction to
   * @param value - The amount of wei to send
   * @param data - The data to send
   * @param options - The options for the transaction
   *
   * @example
   * ```
   * const myContract = m.contract("MyContract");
   * m.send("sendToMyContract", myContract, 100);
   *
   * // you can also send to an address directly
   * const owner = m.getAccount(1);
   * const otherAccount = m.getAccount(2);
   * m.send("sendToOwner", owner, 100, undefined, { from: otherAccount });
   * ```
   */
  send(
    id: string,
    to:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
      | AccountRuntimeValue,
    value?: bigint | ModuleParameterRuntimeValue<bigint>,
    data?: string,
    options?: SendDataOptions
  ): SendDataFuture;

  /**
   * Allows you to use the results of another module within this module.
   *
   * @param ignitionSubmodule - The submodule to use
   *
   * @example
   * ```
   * const otherModule = buildModule("otherModule", (m) => {
   *  const myContract = m.contract("MyContract");
   *
   *  return { myContract };
   * });
   *
   * const mainModule = buildModule("mainModule", (m) => {
   *  const { myContract } = m.useModule(otherModule);
   *
   *  const myContractCall = m.call(myContract, "updateCounter", [100]);
   * });
   * ```
   */
  useModule<
    ModuleIdT extends string,
    ContractNameT extends string,
    IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
  >(
    ignitionSubmodule: IgnitionModule<
      ModuleIdT,
      ContractNameT,
      IgnitionModuleResultsT
    >
  ): IgnitionModuleResultsT;
}
