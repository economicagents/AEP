// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/**
 * @title IERC8004Reputation
 * @notice Minimal interface for ERC-8004 Reputation Registry.
 * Used by CounterpartyPolicy for min-reputation enforcement.
 * Matches ReputationRegistryUpgradeable.sol from erc-8004-contracts.
 */
interface IERC8004Reputation {
    /**
     * @notice Get all client addresses that have given feedback for an agent.
     * @param agentId The ERC-721 tokenId (agentId) from the Identity Registry.
     * @return Array of client addresses.
     */
    function getClients(uint256 agentId) external view returns (address[] memory);

    /**
     * @notice Get aggregated reputation summary for an agent across specified clients.
     * @param agentId The agent ID.
     * @param clientAddresses List of client addresses to include (required for Sybil resistance).
     * @param tag1 Filter by tag1 (empty string = no filter).
     * @param tag2 Filter by tag2 (empty string = no filter).
     * @return count Number of feedback entries included.
     * @return summaryValue Aggregated value in mode decimals.
     * @return summaryValueDecimals Decimal places of summaryValue.
     */
    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2)
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
}
