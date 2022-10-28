import {
  ArtifactContract,
  ArtifactLibrary,
  ContractCall,
  DeployedContract,
  DeploymentGraphFuture,
  FutureDict,
  HardhatContract,
  HardhatLibrary,
  OptionalParameter,
  ParameterValue,
  RequiredParameter,
  CallableFuture,
  Virtual,
} from "./future";
import { AdjacencyList, VertexDescriptor } from "./graph";
import { Artifact } from "./hardhat";
import { Module, ModuleDict } from "./module";

export interface ScopeData {
  before: Virtual;
  after?: Virtual;
  parameters?: { [key: string]: string | number | DeploymentGraphFuture };
}

export interface IDeploymentGraph {
  vertexes: Map<number, DeploymentGraphVertex>;
  adjacencyList: AdjacencyList;
  scopeData: {
    [key: string]: ScopeData;
  };
  getEdges(): Array<{ from: number; to: number }>;
}

export interface LibraryMap {
  [key: string]: DeploymentGraphFuture;
}

export type ExternalParamValue = boolean | string | number;

export type InternalParamValue = ExternalParamValue | DeploymentGraphFuture;

export type DeploymentGraphVertex =
  | HardhatContractDeploymentVertex
  | ArtifactContractDeploymentVertex
  | DeployedContractDeploymentVertex
  | HardhatLibraryDeploymentVertex
  | ArtifactLibraryDeploymentVertex
  | CallDeploymentVertex
  | VirtualVertex;

export interface HardhatContractDeploymentVertex extends VertexDescriptor {
  type: "HardhatContract";
  scopeAdded: string;
  contractName: string;
  args: InternalParamValue[];
  libraries: LibraryMap;
  after: DeploymentGraphFuture[];
}

export interface ArtifactContractDeploymentVertex extends VertexDescriptor {
  type: "ArtifactContract";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  libraries: LibraryMap;
  after: DeploymentGraphFuture[];
}

export interface DeployedContractDeploymentVertex extends VertexDescriptor {
  type: "DeployedContract";
  scopeAdded: string;
  address: string;
  abi: any[];
  after: DeploymentGraphFuture[];
}

export interface HardhatLibraryDeploymentVertex extends VertexDescriptor {
  type: "HardhatLibrary";
  libraryName: string;
  scopeAdded: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
}

export interface ArtifactLibraryDeploymentVertex extends VertexDescriptor {
  type: "ArtifactLibrary";
  scopeAdded: string;
  artifact: Artifact;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
}

export interface CallDeploymentVertex extends VertexDescriptor {
  type: "Call";
  scopeAdded: string;
  contract: CallableFuture;
  method: string;
  args: InternalParamValue[];
  after: DeploymentGraphFuture[];
}

export interface VirtualVertex extends VertexDescriptor {
  type: "Virtual";
  scopeAdded: string;
  after: DeploymentGraphFuture[];
}

export interface ContractOptions {
  args?: InternalParamValue[];
  libraries?: {
    [key: string]: DeploymentGraphFuture;
  };
  after?: DeploymentGraphFuture[];
}

export interface UseSubgraphOptions {
  parameters?: { [key: string]: number | string | DeploymentGraphFuture };
  after?: DeploymentGraphFuture[];
}

export interface IDeploymentBuilder {
  chainId: number;
  graph: IDeploymentGraph;

  contract: (
    contractName: string,
    artifactOrOptions?: Artifact | ContractOptions,
    options?: ContractOptions
  ) => HardhatContract | ArtifactContract;

  contractAt: (
    contractName: string,
    address: string,
    abi: any[],
    options?: { after?: DeploymentGraphFuture[] }
  ) => DeployedContract;

  library: (
    contractName: string,
    artifactOrOptions?: Artifact | ContractOptions,
    options?: ContractOptions
  ) => HardhatLibrary | ArtifactLibrary;

  call: (
    contractFuture: DeploymentGraphFuture,
    functionName: string,
    {
      args,
    }: {
      args: InternalParamValue[];
      after?: DeploymentGraphFuture[];
    }
  ) => ContractCall;

  getParam: (paramName: string) => RequiredParameter;

  getOptionalParam: (
    paramName: string,
    defaultValue: ParameterValue
  ) => OptionalParameter;

  useSubgraph: (subgraph: Subgraph, options?: UseSubgraphOptions) => FutureDict;
  useModule: (module: Module, options?: UseSubgraphOptions) => ModuleDict;
}

export interface Subgraph {
  name: string;
  subgraphAction: (builder: IDeploymentBuilder) => FutureDict;
}

export interface DeploymentBuilderOptions {
  chainId: number;
}
