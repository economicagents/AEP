// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

/**
 * @title IERC20
 * @notice Minimal ERC-20 interface for Phase 3 relationship contracts (USDC).
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
