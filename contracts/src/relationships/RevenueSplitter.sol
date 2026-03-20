// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title RevenueSplitter
 * @notice Splits token balance among recipients by fixed weights (basis points).
 *         Uses SafeERC20 for compatibility with non-standard ERC-20 (e.g. USDT).
 *         Fee-on-transfer safe: recomputes from actual balance each iteration to handle tokens that deduct fees.
 */
contract RevenueSplitter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error RevenueSplitterZeroAddress();
    error RevenueSplitterInvalidWeights();
    error RevenueSplitterTransferFailed();

    event Distributed(address indexed token, uint256 totalAmount);

    address[] public recipients;
    uint256[] public weights;
    IERC20 public immutable token;
    uint256 public constant WEIGHT_DENOMINATOR = 10000;

    constructor(address[] memory _recipients, uint256[] memory _weights, address _token) {
        if (_token == address(0)) revert RevenueSplitterZeroAddress();
        if (_recipients.length != _weights.length || _recipients.length == 0) revert RevenueSplitterInvalidWeights();

        uint256 sum = 0;
        for (uint256 i = 0; i < _weights.length; i++) {
            if (_recipients[i] == address(0)) revert RevenueSplitterZeroAddress();
            sum += _weights[i];
        }
        if (sum != WEIGHT_DENOMINATOR) revert RevenueSplitterInvalidWeights();

        recipients = _recipients;
        weights = _weights;
        token = IERC20(_token);
    }

    /// @dev Fee-on-transfer safe: uses actual balance each iteration so tokens that deduct fees on transfer do not cause reverts.
    function distribute() external nonReentrant {
        uint256 total = token.balanceOf(address(this));
        if (total == 0) return;

        uint256 len = recipients.length;
        uint256 remainingWeight = WEIGHT_DENOMINATOR;
        for (uint256 i = 0; i < len; i++) {
            uint256 balance = token.balanceOf(address(this));
            if (balance == 0) break;
            uint256 amount = (balance * weights[i]) / remainingWeight;
            if (amount > 0) {
                token.safeTransfer(recipients[i], amount);
            }
            remainingWeight -= weights[i];
        }
        emit Distributed(address(token), total);
    }

    function getState()
        external
        view
        returns (address[] memory _recipients, uint256[] memory _weights, uint256 _balance)
    {
        return (recipients, weights, token.balanceOf(address(this)));
    }
}
