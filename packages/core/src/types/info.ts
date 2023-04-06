/**
 * A data structure describing a deployed Module
 *
 * @internal
 */
export interface ModuleInfoData {
  moduleName: string;
  networks: NetworkInfoData[];
}

/**
 * A data structure describing network info for a deployed Module
 *
 * @internal
 */
export interface NetworkInfoData {
  networkName: string;
  chainId: number;
  contracts: ContractInfoData[];
}

/**
 * A data structure describing a deployed Contract
 *
 * @internal
 */
export interface ContractInfoData {
  contractName: string;
  status: string;
  address: string;
}
