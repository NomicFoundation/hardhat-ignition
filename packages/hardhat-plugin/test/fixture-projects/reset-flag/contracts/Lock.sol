// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Foo {
  uint256 public value;

  function setValue(uint256 _value) public {
    value = _value;
  }
}
