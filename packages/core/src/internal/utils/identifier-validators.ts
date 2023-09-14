/**
 * A regex that captures Ignitions rules for user provided ids, specifically
 * that they can only contain alphanumerics and underscores, and that they
 * start with a letter.
 */
const ignitionIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * The regex that captures Solidity's identifier rule.
 */
const solidityIdentifierRegex = /^[a-zA-Z$_][a-zA-Z0-9$_]*$/;

/**
 * A regex capturing the solidity identifier rule but extended to support
 * the `myfun(uint256,bool)` parameter syntax
 */
const functionNameRegex = /^[a-zA-Z$_][a-zA-Z0-9$_,()]*$/;

/**
 * Does the identifier match Ignition's rules for ids. Specifically that they
 * started with a letter and only contain alphanumerics and underscores.
 *
 * @param identifier - the id to test
 * @returns true if the identifier is valid
 */
export function isValidIgnitionIdentifier(identifier: string): boolean {
  return ignitionIdRegex.test(identifier);
}

/**
 * Does the identifier match Solidity's rules for ids. See the Solidity
 * language spec for more details.
 *
 * @param identifier - the id to test
 * @returns true if the identifier is a valid Solidity identifier
 */
export function isValidSolidityIdentifier(identifier: string): boolean {
  return solidityIdentifierRegex.test(identifier);
}

/**
 * Does the function or event name match Ignition's rules. This is
 * looser than Solidity's rules, but allows Ethers style `myfun(uint256,bool)`
 * function/event specifications.
 *
 * @param functionName - the function name to test
 * @returns true if the function name is valid
 */
export function isValidFunctionOrEventName(functionName: string): boolean {
  return functionNameRegex.test(functionName);
}
