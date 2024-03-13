# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 0.15.0 - 2024-03-13

### Added

- Support `create2` through strategies, for more details see [our `create2` guide](https://hardhat.org/ignition/docs/guides/create2). ([#629](https://github.com/NomicFoundation/hardhat-ignition/issues/629))

## 0.14.0 - 2024-02-21

### Added

- Support BigInt values in Module Parameter files by encoding them as strings with the format /d+n/ ([#663](https://github.com/NomicFoundation/hardhat-ignition/issues/663))

### Changed

- Upgrade to `viem@2`, a breaking change for scripts or tests that leverage viem contract instances returned from an Ignition deploy call, see [the viem@2 migration guide for more details](https://viem.sh/docs/migration-guide#2xx-breaking-changes) ([#692](https://github.com/NomicFoundation/hardhat-ignition/issues/692))

## 0.13.2 - 2024-01-25

### Fixed

- Add memory pool lookup retry to reduce errors from slow propogation ([#667](https://github.com/NomicFoundation/hardhat-ignition/pull/667))

### Added

- Improve Module API typescript doc comments to enhance intellisense experience ([#642](https://github.com/NomicFoundation/hardhat-ignition/issues/642))
- Support module parameters taking accounts as the default value ([673](https://github.com/NomicFoundation/hardhat-ignition/issues/673))

## 0.13.1 - 2023-12-19

### Added

- New flag `--reset` for `ignition deploy` to wipe the existing deployment state before running ([#649](https://github.com/NomicFoundation/hardhat-ignition/issues/649))

### Fixed

- Fix bug with `process.stdout` being used in a non-tty context ([#644](https://github.com/NomicFoundation/hardhat-ignition/issues/644))

## 0.13.0 - 2023-12-13

### Added

- Add `@nomicfoundation/hardhat-plugin-viem` package, that adds an `ignition` object to the Hardhat Runtime Environment that supports deploying Ignition modules and returning deployed contracts as [Viem](https://viem.sh/) contract instances, see the our [Viem guide](https://hardhat.org/ignition/docs/guides/viem) for more details ([#612](https://github.com/NomicFoundation/hardhat-ignition/pull/612))
- Add support for setting the default sender account from tests and scripts ([#639](https://github.com/NomicFoundation/hardhat-ignition/issues/639))
