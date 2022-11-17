const { buildModule } = require("@ignored/hardhat-ignition");

const UniswapV3Factory = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const UniswapInterfaceMulticall = require("@uniswap/v3-periphery/artifacts/contracts/lens/UniswapInterfaceMulticall.sol/UniswapInterfaceMulticall.json");
const ProxyAdmin = require("@openzeppelin/contracts/build/contracts/ProxyAdmin.json");
const TickLens = require("@uniswap/v3-periphery/artifacts/contracts/lens/TickLens.sol/TickLens.json");
const NFTDescriptor = require("v3-periphery-1_3_0/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json");
const NonfungibleTokenPositionDescriptor = require("v3-periphery-1_3_0/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json");
const TransparentUpgradeableProxy = require("@openzeppelin/contracts/build/contracts/TransparentUpgradeableProxy.json");
const NonfungiblePositionManager = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
const V3Migrator = require("@uniswap/v3-periphery/artifacts/contracts/V3Migrator.sol/V3Migrator.json");
const UniswapV3Staker = require("@uniswap/v3-staker/artifacts/contracts/UniswapV3Staker.sol/UniswapV3Staker.json");
const QuoterV2 = require("@uniswap/swap-router-contracts/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json");
const SwapRouter02 = require("@uniswap/swap-router-contracts/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json");

const ONE_BP_FEE = 100;
const ONE_BP_TICK_SPACING = 1;
const NATIVE_CURRENCY_LABEL = "ETH";

const ONE_MINUTE_SECONDS = 60;
const ONE_HOUR_SECONDS = ONE_MINUTE_SECONDS * 60;
const ONE_DAY_SECONDS = ONE_HOUR_SECONDS * 24;
const ONE_MONTH_SECONDS = ONE_DAY_SECONDS * 30;
const ONE_YEAR_SECONDS = ONE_DAY_SECONDS * 365;

// 2592000
const MAX_INCENTIVE_START_LEAD_TIME = ONE_MONTH_SECONDS;
// 1892160000
const MAX_INCENTIVE_DURATION = ONE_YEAR_SECONDS * 2;

const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

const ACCOUNT_0 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function isAscii(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

function asciiStringToBytes32(str) {
  if (str.length > 32 || !isAscii(str)) {
    throw new Error("Invalid label, must be less than 32 characters");
  }

  return "0x" + Buffer.from(str, "ascii").toString("hex").padEnd(64, "0");
}

module.exports = buildModule("Uniswap", (m) => {
  const owner = ACCOUNT_0;
  const v2CoreFactoryAddress = ADDRESS_ZERO;

  const weth9 = m.contract("WETH9");

  // DEPLOY_V3_CORE_FACTORY
  const uniswapV3Factory = m.contract("UniswapV3Factory", UniswapV3Factory);

  // 1 - add-1bp-fee-tier
  m.call(uniswapV3Factory, "enableFeeAmount", {
    args: [ONE_BP_FEE, ONE_BP_TICK_SPACING],
  });

  // 2 - deploy-multicall2
  const multicall2Address = m.contract("Multicall2", UniswapInterfaceMulticall);

  // DEPLOY_PROXY_ADMIN
  const proxyAdmin = m.contract("ProxyAdmin", ProxyAdmin);

  // DEPLOY_TICK_LENS
  const tickLens = m.contract("TickLens", TickLens);

  // DEPLOY_NFT_DESCRIPTOR_LIBRARY_V1_3_0
  const nftDescriptor = m.contract("NFTDescriptor", NFTDescriptor);

  // DEPLOY_NFT_POSITION_DESCRIPTOR_V1_3_0
  const nonfungibleTokenPositionDescriptor = m.contract(
    "nonfungibleTokenPositionDescriptorAddressV1_3_0",
    NonfungibleTokenPositionDescriptor,
    {
      args: [weth9, asciiStringToBytes32(NATIVE_CURRENCY_LABEL)],
      libraries: {
        NFTDescriptor: nftDescriptor,
      },
    }
  );

  // DEPLOY_TRANSPARENT_PROXY_DESCRIPTOR
  const descriptorProxy = m.contract(
    "TransparentUpgradeableProxy",
    TransparentUpgradeableProxy,
    {
      args: [nonfungibleTokenPositionDescriptor, proxyAdmin, "0x"],
    }
  );

  // DEPLOY_NONFUNGIBLE_POSITION_MANAGER
  const nonfungibleTokenPositionManager = m.contract(
    "NonfungibleTokenPositionManager",
    NonfungiblePositionManager,
    {
      args: [uniswapV3Factory, weth9, descriptorProxy],
    }
  );

  // DEPLOY_V3_MIGRATOR
  const v3Migrator = m.contract("V3Migrator", V3Migrator, {
    args: [uniswapV3Factory, weth9, nonfungibleTokenPositionManager],
  });

  // TRANSFER_V3_CORE_FACTORY_OWNER
  m.call(uniswapV3Factory, "setOwner", {
    args: [owner],
    after: [v3Migrator],
  });

  // DEPLOY_V3_STAKER
  const v3Staker = m.contract("UniswapV3Staker", UniswapV3Staker, {
    args: [
      uniswapV3Factory,
      nonfungibleTokenPositionManager,
      MAX_INCENTIVE_START_LEAD_TIME,
      MAX_INCENTIVE_DURATION,
    ],
  });

  // DEPLOY_QUOTER_V2
  const quoterV2 = m.contract("QuoterV2", QuoterV2, {
    args: [uniswapV3Factory, weth9],
  });

  // DEPLOY_V3_SWAP_ROUTER_02
  const swapRouter02 = m.contract("SwapRouter02", SwapRouter02, {
    args: [
      v2CoreFactoryAddress,
      uniswapV3Factory,
      nonfungibleTokenPositionManager,
      weth9,
    ],
  });

  // TRANSFER_PROXY_ADMIN
  m.call(proxyAdmin, "transferOwnership", {
    args: [owner],
  });

  return {
    weth9,
    uniswapV3Factory,
    multicall2Address,
    proxyAdmin,
    tickLens,
    nftDescriptor,
    nonfungibleTokenPositionDescriptor,
    descriptorProxy,
    nonfungibleTokenPositionManager,
    v3Migrator,
    v3Staker,
    quoterV2,
    swapRouter02,
  };
});
