// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/**
 * @title IERC8004Validation
 * @notice Minimal interface for ERC-8004 Validation Registry.
 * Used by ConditionalEscrow and SLAContract for validation-based release/breach.
 * Matches ValidationRegistryUpgradeable.sol from erc-8004-contracts.
 */
interface IERC8004Validation {
    /**
     * @notice Get validation status for a request.
     * @param requestHash The hash of the validation request.
     * @return validatorAddress The designated validator.
     * @return agentId The agent being validated.
     * @return response 0-100 score (0 = no response yet or fail, 100 = pass).
     * @return responseHash Hash of the response content.
     * @return tag Optional tag for filtering.
     * @return lastUpdate Timestamp of last update.
     */
    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        );
}
