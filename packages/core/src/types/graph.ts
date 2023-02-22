import { ethers } from "ethers";

export interface VertexDescriptor {
  id: number;
  label: string;
  type: string;
  args?: any[];
}

export type AdjacencyList = Map<number, Set<number>>;

export interface IGraph<T> {
  adjacencyList: AdjacencyList;
  vertexes: Map<number, T>;
  getEdges(): Array<{ from: number; to: number }>;
}

export type VertexGraph = IGraph<VertexDescriptor>;

export enum VertexResultEnum {
  SUCCESS = "success",
  FAILURE = "failure",
  HOLD = "hold",
}

export interface VertexVisitSuccess {
  _kind: VertexResultEnum.SUCCESS;
}

export interface ContractDeploySuccess extends VertexVisitSuccess {
  result: {
    name: string;
    abi: any[];
    bytecode: string;
    address: string;
    value: ethers.BigNumber;
  };
}

export interface DeployedContractSuccess extends VertexVisitSuccess {
  result: {
    name: string;
    abi: any[];
    address: string;
  };
}

export interface LibraryDeploySuccess extends VertexVisitSuccess {
  result: {
    name: string;
    abi: any[];
    bytecode: string;
    address: string;
  };
}

export interface AwaitedEventSuccess extends VertexVisitSuccess {
  result: {
    topics: ethers.utils.Result;
  };
}

export interface ContractCallSuccess extends VertexVisitSuccess {
  result: {
    hash: string;
  };
}

export interface SendETHSuccess extends VertexVisitSuccess {
  result: {
    hash: string;
    value: ethers.BigNumber;
  };
}

export type VertexVisitResultSuccess =
  | ContractDeploySuccess
  | DeployedContractSuccess
  | LibraryDeploySuccess
  | AwaitedEventSuccess
  | ContractCallSuccess
  | SendETHSuccess;

export interface VertexVisitResultFailure {
  _kind: VertexResultEnum.FAILURE;
  failure: Error;
}

export interface VertexVisitResultHold {
  _kind: VertexResultEnum.HOLD;
}

export type VertexVisitResult =
  | VertexVisitResultSuccess
  | VertexVisitResultFailure
  | VertexVisitResultHold;

export type VisitResult =
  | {
      _kind: "success";
      result: ResultsAccumulator;
    }
  | {
      _kind: "failure";
      failures: [string, Error[]];
    }
  | {
      _kind: "hold";
      holds: VertexDescriptor[];
    };

export type ResultsAccumulator = Map<number, VertexVisitResult | null>;
