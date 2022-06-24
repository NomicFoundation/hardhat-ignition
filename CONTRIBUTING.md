# How to contribute to Ignition

This document contains some tips on how to collaborate in this project.

## Filing an issue

If you find a bug or want to propose a new feature, please open an issue. Pull requests are welcome, but we recommend you discuss it in an issue first, especially for big changes. This will increase the odds that we can accept your PR.

## Project Structure

This repository is a monorepo handled with `Yarn` workspaces.

There are two packages:

* [**core**](./packages/core/README.md) - containing the ignition library for orchestrating deployments
* [**hardhat-plugin**](./packages/hardhat-plugin/README.md) - containing the Hardhat plugin wrapper for the core library

## Setup

Ignition is a `typescript` project managed by `yarn`.

The install the dependencies, run `yarn` in the project root:

```shell
yarn
```

## Building

The packages are written in `typescript` and so require a build step, to build:

```shell
yarn build
```

The **Hardhat** plugin depends on **core**, while developing you may want to run a continuous build with `watch`:

```shell
yarn watch
```

## Testing

The test suite is written in `mocha`, to run:

```shell
yarn test
```

## Linting

Formatting is enforced with `prettier` and code rules with `eslint`, to run both:

```shell
yarn lint
```

## Clean

If typescript or testing gets into a weird state, `clean` will remove ephemeral folders (i.e. `./dist`, `./coverage` etc) and clear the typescript build info cache, allowing you to start from clean:

```shell
yarn clean
```
