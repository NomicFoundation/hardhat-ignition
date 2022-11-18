# Running a deployment

---

### Table of Contents

- [Visualizing your deployment with the `plan` task](./running-a-deployment.md#visualizing-your-deployment-with-the-plan-task)
- [Executing the deployment](./running-a-deployment.md#executing-the-deployment)
  - [Global configuration](./running-a-deployment.md#global-configuration)
  - [Resuming a failed or onhold deployment (TBD)](./running-a-deployment.md#visualizing-your-deployment-with-the-plan-task)

---

Once you have built and tested your deployment module, it is time to deploy it! Start by making sure you understand exactly what will be executed on chain.

## Visualizing your deployment with the `plan` task

**Ignition** adds a `plan` task to the cli, that will generate a HTML report showing a _dry run_ of the deployment - the contract deploys and contract calls.

The `plan` task takes one argument, the module to visualize. For example, using the `ENS.js` module from our [ENS example project](../examples/ens/README.md):

```bash
npx hardhat plan ENS.js
```

Running `plan` will generate the report based on the given module (in this case `ENS.js`), it will then open the report in your system's default browser:

![Main plan output](images/plan-1.png)

The report summarises the contract that will be deployed and the contract calls that will be made.

It shows the dependency graph as it will be executed by Ignition (where a dependency will not be run until all its dependents have successfully completed).

If something in your deployment isn't behaving the way you expected, the `plan` task can be an extremely helpful tool for debugging and verifying that your and **Ignition**'s understanding of the deployment are the same.

## Executing the deployment

Deploying a module is done using the **Ignition** deploy task:

```sh
npx hardhat deploy LockModule.js
```

Module parameters can be passed as a `json` string to the `parameters` flag:

```sh
npx hardhat deploy --parameters "{\"unlockTime\":4102491600,\"lockedAmount\":2000000000}" LockModule.js
```

By default the deploy task will deploy to an ephemeral Hardhat network. To target a network from your Hardhat config, you can pass its name to the network flag:

```sh
npx hardhat deploy --network mainnet LockModule.js
```

### Global Configuration

There are currently two configurable options you can add to your `hardhat.config.js` file in order to adjust the way **Ignition** functions:

```typescript
interface IgnitionConfig {
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
}

// example inside hardhat.config.js
const { ethers } = require('ethers');

module.exports = {
  ignition: {
    maxRetries: 10,
    gasIncrementPerRetry: ethers.utils.parseUnits('0.001');
  }
}
```

These config values control how **Ignition** retries unconfirmed transactions that are taking too long to confirm.

The value of `maxRetries` is the number of times an unconfirmed transaction will be retried before considering it failed. (default value is 4)

The value of `gasIncrementPerRetry` must be an `ethers.BigNumber` and is assumed to be in wei units. This value will be added to the previous transactions gas price on each subsequent retry. However, if not given or if given value is `null`, then the default logic will run which adds 10% of the previous transactions gas price on each retry.

## Resuming a failed or onhold deployment (TBD)

Currently, failed transactions will be retried a number of times, with an increasing gas price each time, up to a max retry limit. If it has failed past that point, the deployment is considered failed and will be stopped. But what happens if some transactions in the deployment had already succeeded?

Broadly speaking, if some part of the deployment fails, the user will be able to retry it, or to modify the failing action. With the help of an internal journaling service, successfully completed transactions would not be run a second time when resuming a partially failed deployment.

Similarly, a user with a deployment that is considered "on hold" and awaiting the completion of an external action of some kind (multisig wallet signatures, as an example) would be able to close the running **Ignition** process and resume the deployment safely whenever they choose without worrying about the previous actions being resolved again.

For non-development network deployments, this means some form of deployment freezing will be recommended that records relevant information such as contract abi, deployed address and network. These files will be recommended to be committed into project repositories as well.

The exact nature of these files is TBD as this feature is being developed.
