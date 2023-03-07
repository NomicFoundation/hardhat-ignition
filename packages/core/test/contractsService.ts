/* eslint-disable import/no-unused-modules */
import { assert } from "chai";
import { ethers } from "ethers";

import {
  ContractsService,
  ContractsServiceProviders,
} from "../src/services/ContractsService";
import type { TxSender } from "../src/utils/tx-sender";

const txSender: TxSender = {
  async send(..._) {
    return "0xabc";
  },
  async sendAndReplace(..._) {
    return "0xabc";
  },
} as TxSender;

const providersFake = {
  web3Provider: {
    n: 0,
    async getBlockNumber() {
      this.n++;
      return this.n;
    },
    async getTransaction() {
      return {
        hash: "",
        nonce: 0,
        gasLimit: 21000,
        gasPrice: 100,
      };
    },
  },
  transactionsProvider: {
    async isConfirmed(_) {
      return false;
    },
    async isMined(_) {
      return false;
    },
  },
  gasProvider: {
    async estimateGasLimit(_) {
      return ethers.BigNumber.from(0);
    },
    async estimateGasPrice() {
      return ethers.BigNumber.from(0);
    },
  },
} as unknown as ContractsServiceProviders;

describe("ContractsService", function () {
  it("should retry an unconfirmed transaction until the retry limit is hit", async function () {
    const contractsService = new ContractsService(providersFake, txSender);

    const fakeTx: ethers.providers.TransactionRequest = {};

    await assert.isRejected(
      contractsService.sendTx(fakeTx, {
        maxRetries: 4,
        gasPriceIncrementPerRetry: null,
        pollingInterval: 10,
        signer: {} as any,
      }),
      /Transaction not confirmed within max retry limit/
    );
  });
});
