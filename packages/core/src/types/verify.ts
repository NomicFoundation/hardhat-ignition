/**
 * The configuration info needed to verify a contract on Etherscan on a given chain.
 *
 * @beta
 */
export interface ChainConfig {
  network: string;
  chainId: number;
  urls: {
    apiURL: string;
    browserURL: string;
  };
}

/**
 * The information required to verify a contract on Etherscan.
 *
 * @beta
 */
export interface VerifyInfo {
  address: string;
  compilerVersion: string;
  sourceCode: string;
  name: string;
  args: string;
}

/**
 * The result of requesting the verification info for a deployment.
 * It returns the chainConfig followed by an array of VerifyInfo objects, one for each contract to be verified.
 *
 * @beta
 */
export type VerifyResult = [ChainConfig, VerifyInfo];
