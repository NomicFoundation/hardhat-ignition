import { assert } from "chai";

import { EvmTuple } from "../../../../src/internal/new-execution/types/evm-execution";
import { convertEvmTupleToSolidityParam } from "../../../../src/internal/new-execution/utils/convert-evm-tuple-to-solidity-param";

describe("converting evm tuples to solidity params", () => {
  it("should convert a tuple", () => {
    const tuple: EvmTuple = {
      positional: [1, "b", true],
      named: {},
    };

    const result = convertEvmTupleToSolidityParam(tuple);

    assert.deepStrictEqual(result, [1, "b", true]);
  });

  it("should convert a nested tuple", () => {
    const tuple: EvmTuple = {
      positional: [
        {
          positional: [1, "b", true],
          named: {},
        },
      ],
      named: {},
    };

    const result = convertEvmTupleToSolidityParam(tuple);

    assert.deepStrictEqual(result, [[1, "b", true]]);
  });

  it("should convert a nested array", () => {
    const tuple: EvmTuple = {
      positional: [[1, "b", true]],
      named: {},
    };

    const result = convertEvmTupleToSolidityParam(tuple);

    assert.deepStrictEqual(result, [[1, "b", true]]);
  });
});
