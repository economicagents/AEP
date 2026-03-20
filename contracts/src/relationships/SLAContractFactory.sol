// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {SLAContract} from "./SLAContract.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SLAContractFactory
 * @notice Deploys SLAContract instances. Collects setup fee to treasury when fee > 0.
 */
contract SLAContractFactory {
    using SafeERC20 for IERC20;

    error SLAContractFactoryZeroAddress();
    error SLAContractFactoryFeeRequiresTreasury();

    event SLACreated(address indexed sla, address indexed provider, address indexed consumer);

    address public immutable treasury;

    constructor(address _treasury) {
        treasury = _treasury;
    }

    /// @param setupFee Fee in stakeToken (6 decimals). Caller (typically provider) pays. Pass 0 for no fee.
    function createSLA(
        address provider,
        address consumer,
        uint256 providerAgentId,
        address stakeToken,
        uint256 stakeAmount,
        address validationRegistry,
        uint8 breachThreshold,
        uint256 setupFee
    ) external returns (address sla) {
        if (
            provider == address(0) || consumer == address(0) || stakeToken == address(0)
                || validationRegistry == address(0)
        ) {
            revert SLAContractFactoryZeroAddress();
        }
        if (setupFee > 0) {
            if (treasury == address(0)) revert SLAContractFactoryFeeRequiresTreasury();
            IERC20(stakeToken).safeTransferFrom(msg.sender, treasury, setupFee);
        }
        sla = address(
            new SLAContract(
                provider, consumer, providerAgentId, stakeToken, stakeAmount, validationRegistry, breachThreshold
            )
        );
        emit SLACreated(sla, provider, consumer);
    }
}
