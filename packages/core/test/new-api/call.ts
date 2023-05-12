/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { NamedContractCallFutureImplementation } from "../../src/new-api/internal/module";
import { FutureType } from "../../src/new-api/types/module";

describe("call", () => {
  it("should be able to setup a contract call", () => {
    const moduleWithASingleContract = buildModule("Module1", (m) => {
      const contract1 = m.contract("Contract1");

      m.call(contract1, "test");

      return { contract1 };
    });

    assert.isDefined(moduleWithASingleContract);

    // Sets ids based on module id and contract name
    assert.equal(moduleWithASingleContract.id, "Module1");
    assert.equal(
      moduleWithASingleContract.results.contract1.id,
      "Module1:Contract1"
    );

    // 1 contract future & 1 call future
    assert.equal(moduleWithASingleContract.futures.size, 2);
    assert.equal(
      [...moduleWithASingleContract.futures][0].type,
      FutureType.NAMED_CONTRACT_DEPLOYMENT
    );
    assert.equal(
      [...moduleWithASingleContract.futures][1].type,
      FutureType.NAMED_CONTRACT_CALL
    );

    // No submodules
    assert.equal(moduleWithASingleContract.submodules.size, 0);
  });

  it("should be able to pass one contract as an arg dependency to a call", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another");

      m.call(example, "test", [another]);

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example"
    );

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example:test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract call future");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  it("should be able to pass one contract as an after dependency of a call", () => {
    const moduleWithDependentContracts = buildModule("Module1", (m) => {
      const example = m.contract("Example");
      const another = m.contract("Another");

      m.call(example, "test", [], { after: [another] });

      return { example, another };
    });

    assert.isDefined(moduleWithDependentContracts);

    const exampleFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example"
    );

    const anotherFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Another"
    );

    const callFuture = [...moduleWithDependentContracts.futures].find(
      ({ id }) => id === "Module1:Example:test"
    );

    if (!(callFuture instanceof NamedContractCallFutureImplementation)) {
      assert.fail("Not a named contract deployment");
    }

    assert.equal(callFuture.dependencies.size, 2);
    assert(callFuture.dependencies.has(exampleFuture!));
    assert(callFuture.dependencies.has(anotherFuture!));
  });

  describe("passing id", () => {
    it("should be able to call the same function twice by passing an id", () => {
      const moduleWithSameCallTwice = buildModule("Module1", (m) => {
        const sameContract1 = m.contract("Example");

        m.call(sameContract1, "test", [], { id: "first" });
        m.call(sameContract1, "test", [], { id: "second" });

        return { sameContract1 };
      });

      assert.equal(moduleWithSameCallTwice.id, "Module1");

      const callFuture = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:Example:first"
      );

      const callFuture2 = [...moduleWithSameCallTwice.futures].find(
        ({ id }) => id === "Module1:Example:second"
      );

      assert.isDefined(callFuture);
      assert.isDefined(callFuture2);
    });

    it("should throw if the same function is called twice without differentiating ids", () => {
      assert.throws(() => {
        buildModule("Module1", (m) => {
          const sameContract1 = m.contract("SameContract");
          m.call(sameContract1, "test");
          m.call(sameContract1, "test");

          return { sameContract1 };
        });
      }, /Calls must have unique ids, Module1:SameContract:test has already been used/);
    });

    it("should throw if a call tries to pass the same id twice", () => {
      assert.throws(() => {
        buildModule("Module1", (m) => {
          const sameContract1 = m.contract("SameContract");
          m.call(sameContract1, "test", [], { id: "first" });
          m.call(sameContract1, "test", [], { id: "first" });
          return { sameContract1 };
        });
      }, /Calls must have unique ids, Module1:SameContract:first has already been used/);
    });
  });
});
