// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {PackedUserOperation} from "../vendor/interfaces/PackedUserOperation.sol";

/**
 * @title IPolicyModule
 * @notice Interface for AEP policy modules. Each module validates UserOperations
 * against economic policy (budget, counterparty, rate limit, etc.).
 */
interface IPolicyModule {
    /**
     * @notice Validate a UserOperation against this policy.
     * @param userOp The UserOperation to validate.
     * @return validationData 0 for pass (SIG_VALIDATION_SUCCESS), 1 for fail (SIG_VALIDATION_FAILED).
     */
    function check(PackedUserOperation calldata userOp) external view returns (uint256 validationData);

    /**
     * @notice Optional: Pre-check policy for x402 interceptor (amount + recipient).
     * Modules that don't support this can revert or return false.
     * @param amount Payment amount (e.g. USDC 6 decimals).
     * @param recipient Payment recipient address.
     * @return allowed True if payment would pass policy.
     */
    function checkPolicy(uint256 amount, address recipient) external view returns (bool allowed);

    /**
     * @notice Called by AEPAccount after successful execution. Modules can update state (e.g. spend tracking).
     * @param callData The execute/executeBatch calldata from the executed UserOp.
     */
    function recordSpend(bytes calldata callData) external;
}
