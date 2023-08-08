// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract D {
  error CustomError2(uint);

  error CustomError3(uint, bool b);

  function fail() public pure {
    revert CustomError2(1);
  }
}

contract C {
  error CustomError(uint, bool b);

  D d = new D();

  function returnString() public pure returns (string memory) {
    return "hello";
  }

  function returnNothing() public pure {}

  function revertWithoutReasonClash() public pure {
    revert();
  }

  function revertWithoutReasonWithoutClash() public pure returns (uint256) {
    revert();
  }

  function revertWithReasonMessage() public pure {
    revert("reason");
  }

  function revertWithEmptyReasonMessage() public pure {
    revert("");
  }

  function revertWithInvalidErrorMessage() public pure {
    // This starts with the right signature and then
    // invalid data wrt the ABI encoding
    bytes memory x = hex"08c379a0123456";
    assembly {
      revert(add(x, 32), 7)
    }
  }

  function revertWithPanicCode() public pure {
    uint i = 0;
    uint j = 1 / i;
  }

  function revertWithInvalidPanicCode() public pure {
    // This starts with the right signature and then
    // invalid data wrt the ABI encoding
    bytes memory x = hex"4e487b71123456";
    assembly {
      revert(add(x, 32), 7)
    }
  }

  function revertWithNonExistentPanicCode() public pure {
    // Returns the error code 0xFF, which doesn't exist
    bytes
      memory x = hex"4e487b7100000000000000000000000000000000000000000000000000000000000000ff";
    assembly {
      revert(add(x, 32), 36)
    }
  }

  function revertWithCustomError() public pure {
    revert CustomError(1, true);
  }

  function revertWithInvalidCustomError() public pure {
    // This starts with the right signature and then
    // invalid data wrt the ABI encoding
    bytes memory x = hex"659c1f59000000";
    assembly {
      revert(add(x, 32), 7)
    }
  }

  function revertWithUnknownCustomError() public view {
    d.fail();
  }

  function revertWithInvalidData() public pure returns (uint256) {
    bytes memory x = hex"0123456789abcdef";
    assembly {
      revert(add(x, 32), 2)
    }
  }

  function invalidOpcode() public pure returns (uint256) {
    assembly {
      invalid()
    }
  }

  function invalidOpcodeClash() public pure {
    assembly {
      invalid()
    }
  }

  function withNamedAndUnamedOutputs()
    public
    pure
    returns (uint, bool b, string memory h)
  {
    return (1, true, "hello");
  }
}
