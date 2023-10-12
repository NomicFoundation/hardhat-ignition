import { DeploymentResult } from "@nomicfoundation/ignition-core";

export enum UiFutureStatusType {
  UNSTARTED = "UNSTARTED",
  SUCCESS = "SUCCESS",
  TIMEDOUT = "TIMEDOUT",
  ERRORED = "ERRORED",
  HELD = "HELD",
}

export enum UiStateDeploymentStatus {
  UNSTARTED = "UNSTARTED",
  DEPLOYING = "DEPLOYING",
  COMPLETE = "COMPLETE",
}

export interface UiFutureUnstarted {
  type: UiFutureStatusType.UNSTARTED;
}

export interface UiFutureSuccess {
  type: UiFutureStatusType.SUCCESS;
  result?: string;
}

export interface UiFutureTimedOut {
  type: UiFutureStatusType.TIMEDOUT;
}

export interface UiFutureErrored {
  type: UiFutureStatusType.ERRORED;
  message: string;
}

export interface UiFutureHeld {
  type: UiFutureStatusType.HELD;
  heldId: number;
  reason: string;
}

export type UiFutureStatus =
  | UiFutureUnstarted
  | UiFutureSuccess
  | UiFutureTimedOut
  | UiFutureErrored
  | UiFutureHeld;

export interface UiFuture {
  status: UiFutureStatus;
  futureId: string;
}

export type UiBatches = UiFuture[][];

export interface UiState {
  status: UiStateDeploymentStatus;
  chainId: number | null;
  moduleName: string | null;
  batches: UiBatches;
  currentBatch: number;
  result: DeploymentResult | null;
  warnings: string[];
}

export interface AddressMap {
  [label: string]: string;
}
