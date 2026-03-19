// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {ConditionalEscrow} from "./ConditionalEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ConditionalEscrowFactory
 * @notice Deploys ConditionalEscrow instances. Collects setup fee to treasury when fee > 0.
 */
contract ConditionalEscrowFactory {
    using SafeERC20 for IERC20;

    error ConditionalEscrowFactoryZeroAddress();
    error ConditionalEscrowFactoryFeeRequiresTreasury();

    event EscrowCreated(address indexed escrow, address indexed consumer, address indexed provider);

    address public immutable treasury;

    constructor(address _treasury) {
        treasury = _treasury;
    }

    /// @param setupFee Fee in token (6 decimals). Caller (typically consumer) pays. Pass 0 for no fee.
    function createEscrow(
        address consumer,
        address provider,
        uint256 providerAgentId,
        address token,
        address validationRegistry,
        address validatorAddress,
        uint8 releaseThreshold,
        uint256 setupFee
    ) external returns (address escrow) {
        return _createEscrow(
            consumer,
            provider,
            providerAgentId,
            token,
            validationRegistry,
            validatorAddress,
            releaseThreshold,
            new uint256[](0),
            setupFee
        );
    }

    /// @param milestoneAmounts Amounts per milestone (6 decimals). Empty for single-amount legacy escrow.
    /// @param setupFee Fee in token (6 decimals). Caller pays. Pass 0 for no fee.
    function createEscrowWithMilestones(
        address consumer,
        address provider,
        uint256 providerAgentId,
        address token,
        address validationRegistry,
        address validatorAddress,
        uint8 releaseThreshold,
        uint256[] calldata milestoneAmounts,
        uint256 setupFee
    ) external returns (address escrow) {
        return _createEscrow(
            consumer,
            provider,
            providerAgentId,
            token,
            validationRegistry,
            validatorAddress,
            releaseThreshold,
            milestoneAmounts,
            setupFee
        );
    }

    function _createEscrow(
        address consumer,
        address provider,
        uint256 providerAgentId,
        address token,
        address validationRegistry,
        address validatorAddress,
        uint8 releaseThreshold,
        uint256[] memory milestoneAmounts,
        uint256 setupFee
    ) internal returns (address escrow) {
        if (consumer == address(0) || provider == address(0) || token == address(0) || validationRegistry == address(0))
        {
            revert ConditionalEscrowFactoryZeroAddress();
        }
        if (setupFee > 0) {
            if (treasury == address(0)) revert ConditionalEscrowFactoryFeeRequiresTreasury();
            IERC20(token).safeTransferFrom(msg.sender, treasury, setupFee);
        }
        escrow = address(
            new ConditionalEscrow(
                consumer,
                provider,
                providerAgentId,
                token,
                validationRegistry,
                validatorAddress,
                releaseThreshold,
                milestoneAmounts
            )
        );
        emit EscrowCreated(escrow, consumer, provider);
    }
}
