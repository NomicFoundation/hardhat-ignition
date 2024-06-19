import type {
  ChainConfig,
  VerifyInfo,
  VerifyStatus,
} from "@nomicfoundation/ignition-core";

import { Etherscan } from "@nomicfoundation/hardhat-verify/etherscan";
import { Sourcify } from "@nomicfoundation/hardhat-verify/sourcify";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getEtherscanApiKeyAndUrls } from "./getEtherscanApiKeyAndUrls";

const DEFAULT_SOURCIFY_API_URL = "https://sourcify.dev/server";
const DEFAULT_SOURCIFY_BROWSER_URL = "https://repo.sourcify.dev";

export class VerificationError extends Error {}

interface Verifiers {
  sourcify: boolean;
  etherscan: boolean;
}

function verifySourcifyHardhatConfig(hre: HardhatRuntimeEnvironment) {
  if (
    hre.config.sourcify !== undefined &&
    (hre.config.sourcify.apiUrl === "" || hre.config.sourcify.browserUrl === "")
  ) {
    throw new NomicLabsHardhatPluginError(
      "@nomicfoundation/hardhat-ignition",
      "Sourcify is disabled or has invalid API & Browser URLs"
    );
  }
}

async function verifySourcifyContract(
  instance: Sourcify,
  info: VerifyInfo
): Promise<VerifyStatus> {
  const verificationArgs = { "metadata.json": JSON.stringify(info.metadata) };
  const verificationResult = await instance.verify(
    info.address,
    verificationArgs
  );

  const verificationStatus = await instance.isVerified(info.address);

  if (verificationStatus !== false) {
    const contractURL = instance.getContractUrl(
      info.address,
      verificationStatus
    );
    return { type: "success", contractURL };
  } else {
    // todo: what case would cause verification status not to succeed without throwing?
    throw new VerificationError(verificationResult.error);
  }
}

function verifyEtherscanHardhatConfig(hre: HardhatRuntimeEnvironment) {
  if (
    hre.config.etherscan === undefined ||
    hre.config.etherscan.apiKey === undefined ||
    hre.config.etherscan.apiKey === ""
  ) {
    throw new NomicLabsHardhatPluginError(
      "@nomicfoundation/hardhat-ignition",
      "No etherscan API key configured"
    );
  }
}

export function checkVerifierHardhatConfig(
  hre: HardhatRuntimeEnvironment,
  verifiers: Verifiers
) {
  if (verifiers.etherscan) verifyEtherscanHardhatConfig(hre);
  if (verifiers.sourcify) verifySourcifyHardhatConfig(hre);
}

export async function verifyEtherscanContract(
  instance: Etherscan,
  { address, compilerVersion, sourceCode, name, args }: VerifyInfo
): Promise<VerifyStatus> {
  const contractURL = instance.getContractUrl(address);

  try {
    const { message: guid } = await instance.verify(
      address,
      sourceCode,
      name,
      compilerVersion,
      args
    );

    const verificationStatus = await instance.getVerificationStatus(guid);

    if (verificationStatus.isSuccess()) {
      return { type: "success", contractURL };
    } else {
      throw new VerificationError(verificationStatus.message);
    }
  } catch (e) {
    // Let this pass through as equivalent to a successful verification
    if (e instanceof Error && /already verified/gi.test(e.message)) {
      return { type: "success", contractURL };
    } else {
      throw e;
    }
  }
}

function sourcifyInstance(
  hre: HardhatRuntimeEnvironment,
  chainConfig: ChainConfig
) {
  verifySourcifyHardhatConfig(hre);
  return new Sourcify(
    chainConfig.chainId,
    hre.config.sourcify.apiUrl ?? DEFAULT_SOURCIFY_API_URL,
    hre.config.sourcify.browserUrl ?? DEFAULT_SOURCIFY_BROWSER_URL
  );
}

function etherscanInstance(
  hre: HardhatRuntimeEnvironment,
  chainConfig: ChainConfig
) {
  verifyEtherscanHardhatConfig(hre);
  const apiKeyAndUrls = getEtherscanApiKeyAndUrls(
    hre.config.etherscan.apiKey,
    chainConfig
  );
  return new Etherscan(...apiKeyAndUrls);
}

export async function verifyContract(
  hre: HardhatRuntimeEnvironment,
  chainConfig: ChainConfig,
  verifiers: Verifiers,
  info: VerifyInfo
) {
  return {
    etherscan: verifiers.etherscan
      ? await verifyEtherscanContract(etherscanInstance(hre, chainConfig), info)
      : undefined,
    sourcify: verifiers.sourcify
      ? await verifySourcifyContract(sourcifyInstance(hre, chainConfig), info)
      : undefined,
  };
}
