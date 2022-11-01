import { Artifact } from "./hardhat";

export interface HardhatContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "hardhat";
  contractName: string;
  _future: true;
}

export interface ArtifactContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "artifact";
  artifact: Artifact;
  _future: true;
}

export interface DeployedContract {
  vertexId: number;
  label: string;
  type: "contract";
  subtype: "deployed";
  abi: any[];
  _future: true;
}

export interface HardhatLibrary {
  vertexId: number;
  label: string;
  type: "library";
  subtype: "hardhat";
  libraryName: string;
  _future: true;
}

export interface ArtifactLibrary {
  vertexId: number;
  label: string;
  type: "library";
  subtype: "artifact";
  artifact: Artifact;
  _future: true;
}

export interface ContractCall {
  vertexId: number;
  label: string;
  type: "call";
  _future: true;
}

export type ParameterValue = string | number | DeploymentGraphFuture;

export interface RequiredParameter {
  label: string;
  type: "parameter";
  subtype: "required";
  scope: string;
  _future: true;
}

export interface OptionalParameter {
  label: string;
  type: "parameter";
  subtype: "optional";
  defaultValue: ParameterValue;
  scope: string;
  _future: true;
}

export interface Virtual {
  vertexId: number;
  label: string;
  type: "virtual";
  _future: true;
}

export interface ProxyFuture {
  label: string;
  type: "proxy";
  proxy: DependableFuture;
  value: DependableFuture;
  _future: true;
}

export type ContractFuture =
  | HardhatContract
  | ArtifactContract
  | DeployedContract;

export type LibraryFuture = HardhatLibrary | ArtifactLibrary;

export type CallableFuture = ContractFuture | LibraryFuture;

export type DependableFuture =
  | CallableFuture
  | ContractCall
  | Virtual
  | ProxyFuture;

export type ParameterFuture = RequiredParameter | OptionalParameter;

export type DeploymentGraphFuture = DependableFuture | ParameterFuture;

export interface FutureDict {
  [key: string]: DeploymentGraphFuture;
}
