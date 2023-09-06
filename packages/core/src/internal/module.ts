import { Artifact } from "../types/artifact";
import {
  AccountRuntimeValue,
  AddressResolvableFuture,
  ArgumentType,
  ArtifactContractAtFuture,
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  ContractFuture,
  Future,
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  NamedContractAtFuture,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
  ReadEventArgumentFuture,
  RuntimeValueType,
  SendDataFuture,
} from "../types/module";

const customInspectSymbol = Symbol.for("util.inspect.custom");

abstract class BaseFutureImplementation<FutureTypeT extends FutureType> {
  public readonly dependencies: Set<Future> = new Set();

  constructor(
    public readonly id: string,
    public readonly type: FutureTypeT,
    public readonly module: IgnitionModuleImplementation
  ) {}

  public [customInspectSymbol](
    _depth: number,
    { inspect }: { inspect: (arg: {}) => string }
  ) {
    const padding = " ".repeat(2);

    return `Future ${this.id} {
    Type: ${FutureType[this.type]}
    Module: ${this.module.id}
    Dependencies: ${inspect(
      Array.from(this.dependencies).map((f) => f.id)
    ).replace(/\n/g, `\n${padding}`)}
  }`;
  }
}

export class NamedContractDeploymentFutureImplementation<
    ContractNameT extends string
  >
  extends BaseFutureImplementation<FutureType.NAMED_CONTRACT_DEPLOYMENT>
  implements NamedContractDeploymentFuture<ContractNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly constructorArgs: ArgumentType[],
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly value: bigint | ModuleParameterRuntimeValue<bigint>,
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.NAMED_CONTRACT_DEPLOYMENT, module);
  }
}

export class ArtifactContractDeploymentFutureImplementation<
    ContractNameT extends string
  >
  extends BaseFutureImplementation<FutureType.ARTIFACT_CONTRACT_DEPLOYMENT>
  implements ArtifactContractDeploymentFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly constructorArgs: ArgumentType[],
    public readonly artifact: Artifact,
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly value: bigint | ModuleParameterRuntimeValue<bigint>,
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.ARTIFACT_CONTRACT_DEPLOYMENT, module);
  }
}

export class NamedLibraryDeploymentFutureImplementation<
    LibraryNameT extends string
  >
  extends BaseFutureImplementation<FutureType.NAMED_LIBRARY_DEPLOYMENT>
  implements NamedLibraryDeploymentFuture<LibraryNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: LibraryNameT,
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.NAMED_LIBRARY_DEPLOYMENT, module);
  }
}

export class ArtifactLibraryDeploymentFutureImplementation<
    LibraryNameT extends string
  >
  extends BaseFutureImplementation<FutureType.ARTIFACT_LIBRARY_DEPLOYMENT>
  implements ArtifactLibraryDeploymentFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: LibraryNameT,
    public readonly artifact: Artifact,
    public readonly libraries: Record<string, ContractFuture<string>>,
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.ARTIFACT_LIBRARY_DEPLOYMENT, module);
  }
}

export class NamedContractCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string
  >
  extends BaseFutureImplementation<FutureType.NAMED_CONTRACT_CALL>
  implements NamedContractCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: ArgumentType[],
    public readonly value: bigint | ModuleParameterRuntimeValue<bigint>,
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.NAMED_CONTRACT_CALL, module);
  }
}

export class NamedStaticCallFutureImplementation<
    ContractNameT extends string,
    FunctionNameT extends string
  >
  extends BaseFutureImplementation<FutureType.NAMED_STATIC_CALL>
  implements NamedStaticCallFuture<ContractNameT, FunctionNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly functionName: FunctionNameT,
    public readonly contract: ContractFuture<ContractNameT>,
    public readonly args: ArgumentType[],
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.NAMED_STATIC_CALL, module);
  }
}

export class NamedContractAtFutureImplementation<ContractNameT extends string>
  extends BaseFutureImplementation<FutureType.NAMED_CONTRACT_AT>
  implements NamedContractAtFuture<ContractNameT>
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: ContractNameT,
    public readonly address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>
  ) {
    super(id, FutureType.NAMED_CONTRACT_AT, module);
  }
}

export class ArtifactContractAtFutureImplementation
  extends BaseFutureImplementation<FutureType.ARTIFACT_CONTRACT_AT>
  implements ArtifactContractAtFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly contractName: string,
    public readonly address:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    public readonly artifact: Artifact
  ) {
    super(id, FutureType.ARTIFACT_CONTRACT_AT, module);
  }
}

export class ReadEventArgumentFutureImplementation
  extends BaseFutureImplementation<FutureType.READ_EVENT_ARGUMENT>
  implements ReadEventArgumentFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly futureToReadFrom: Future,
    public readonly eventName: string,
    public readonly argumentName: string,
    public readonly emitter: ContractFuture<string>,
    public readonly eventIndex: number
  ) {
    super(id, FutureType.READ_EVENT_ARGUMENT, module);
  }
}

export class SendDataFutureImplementation
  extends BaseFutureImplementation<FutureType.SEND_DATA>
  implements SendDataFuture
{
  constructor(
    public readonly id: string,
    public readonly module: IgnitionModuleImplementation,
    public readonly to:
      | string
      | AddressResolvableFuture
      | ModuleParameterRuntimeValue<string>,
    public readonly value: bigint | ModuleParameterRuntimeValue<bigint>,
    public readonly data: string | undefined,
    public readonly from: string | AccountRuntimeValue | undefined
  ) {
    super(id, FutureType.SEND_DATA, module);
  }
}

export class IgnitionModuleImplementation<
  ModuleIdT extends string = string,
  ContractNameT extends string = string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT> = IgnitionModuleResult<ContractNameT>
> implements IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT>
{
  public readonly futures: Set<Future> = new Set();
  public readonly submodules: Set<IgnitionModule> = new Set();

  constructor(
    public readonly id: ModuleIdT,
    public readonly results: IgnitionModuleResultsT
  ) {}

  public [customInspectSymbol](
    _depth: number,
    { inspect }: { inspect: (arg: {}) => string }
  ) {
    const padding = " ".repeat(2);

    return `IgnitionModule ${this.id} {
    Futures: ${inspect(this.futures).replace(/\n/g, `\n${padding}`)}
    Results: ${inspect(this.results).replace(/\n/g, `\n${padding}`)}
    Submodules: ${inspect(Array.from(this.submodules).map((m) => m.id)).replace(
      /\n/g,
      `\n${padding}`
    )}
  }`;
  }
}

export class AccountRuntimeValueImplementation implements AccountRuntimeValue {
  public readonly type = RuntimeValueType.ACCOUNT;

  constructor(public readonly accountIndex: number) {}

  public [customInspectSymbol](
    _depth: number,
    _inspectOptions: { inspect: (arg: {}) => string }
  ) {
    return `Account RuntimeValue {
    accountIndex: ${this.accountIndex}
}`;
  }
}

export class ModuleParameterRuntimeValueImplementation<
  ParamTypeT extends ModuleParameterType
> implements ModuleParameterRuntimeValue<ParamTypeT>
{
  public readonly type = RuntimeValueType.MODULE_PARAMETER;

  constructor(
    public readonly moduleId: string,
    public readonly name: string,
    public readonly defaultValue: ParamTypeT | undefined
  ) {}

  public [customInspectSymbol](
    _depth: number,
    { inspect }: { inspect: (arg: {}) => string }
  ) {
    return `Module Parameter RuntimeValue {
    name: ${this.name}${
      this.defaultValue !== undefined
        ? `
    default value: ${inspect(this.defaultValue)}`
        : ""
    }
}`;
  }
}