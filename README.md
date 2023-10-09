[![npm](https://img.shields.io/npm/v/@nomicfoundation/hardhat-ignition.svg)](https://www.npmjs.com/package/@nomicfoundation/hardhat-ignition) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Hardhat Ignition

> **WARNING**: This repository is **highly experimental**, and is under **active development**. Any code or binaries produced from this project **should not be used in any production or critical workloads**. The API is preliminary, **the API will change**.

Hardhat Ignition is **Hardhat**'s deployment solution. It is a **Hardhat** plugin that allows you to create declarative deployments that can be reproduced across different networks.

Built by the [Nomic Foundation](https://nomic.foundation/) for the Ethereum community.

Join our [Hardhat Support Discord server](https://hardhat.org/discord) to stay up to date on new releases, plugins and tutorials.

## Installation

```bash
npm install --save-dev @nomicfoundation/hardhat-ignition
```

And add the following statement to your `hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-ignition");
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```js
import "@nomicfoundation/hardhat-ignition";
```

## Getting Started

See our [Getting started guide](./docs/getting-started-guide.md) for a worked example of **Hardhat Ignition usage**.

## Documentation

- [Getting started](./docs/getting-started-guide.md)
- [Explanation](./docs/explanation.md)
- [Creating Modules for Deployments](./docs/creating-modules-for-deployment.md)
  - [Deploying a Contract](./docs/creating-modules-for-deployment.md#deploying-a-contract)
  - [Calling contract methods](./docs/creating-modules-for-deployment.md#calling-contract-methods)
  - [Network Accounts Management](./docs/creating-modules-for-deployment.md#network-accounts-management)
  - [Including modules within modules](./docs/creating-modules-for-deployment.md#including-modules-within-modules)
  - [Module Parameters](./docs/creating-modules-for-deployment.md#module-parameters)
- [Using Hardhat Ignition in _Hardhat_ tests](./docs/using-ignition-in-hardhat-tests.md)
- [Running a deployment](./docs/running-a-deployment.md)
  - [Visualizing your deployment with the `visualize` task](./docs/running-a-deployment.md#visualizing-your-deployment-with-the-visualize-task)
  - [Executing the deployment](./docs/running-a-deployment.md#executing-the-deployment)

### Examples

This repo contains example projects that show **Hardhat Ignition** features in context (under `./examples`):

- [Sample](./examples/sample) - the **Hardhat** starter project enhanced with Hardhat Ignition
- [Typescript Sample](./examples/ts-sample) - the **Hardhat** typescript starter project enhanced with Hardhat Ignition
- [ENS](./examples/ens) - deploy ENS and its registry for local testing

## Contributing

Contributions are always welcome! Feel free to open any issue or send a pull request.

Go to [CONTRIBUTING.md](./CONTRIBUTING.md) to learn about how to set up Hardhat Ignition's development environment.

## Feedback, help and news

[Hardhat Support Discord server](https://hardhat.org/discord): for questions and feedback.

[Follow Hardhat on Twitter.](https://twitter.com/HardhatHQ)
