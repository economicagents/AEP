// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/**
 * @title IERC8004Identity
 * @notice Minimal interface for ERC-8004 Identity Registry (agentWallet).
 * Used by CounterpartyPolicy for agentId -> payment address resolution.
 */
interface IERC8004Identity {
    /**
     * @notice Get the payment wallet address for an agent.
     * @param agentId The ERC-721 tokenId (agentId) from the Identity Registry.
     * @return The address where the agent receives payments.
     */
    function getAgentWallet(uint256 agentId) external view returns (address);
}
