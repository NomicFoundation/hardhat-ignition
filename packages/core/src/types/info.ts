export interface ModuleInfoData {
  moduleName: string;
  networks: NetworkInfoData[];
}

export interface NetworkInfoData {
  networkName: string;
  chainId: number;
  contracts: ContractInfoData[];
}

export interface ContractInfoData {
  contractName: string;
  status: string;
  address: string;
}
