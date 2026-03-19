// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {CreditFacility} from "./CreditFacility.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CreditFacilityFactory
 * @notice Deploys CreditFacility instances. Collects origination fee to treasury when fee > 0.
 */
contract CreditFacilityFactory {
    using SafeERC20 for IERC20;

    error CreditFacilityFactoryZeroAddress();
    error CreditFacilityFactoryFeeRequiresTreasury();
    error CreditFacilityFactoryLenderMustCreate();

    event FacilityCreated(address indexed facility, address indexed lender, address indexed borrower);

    address public immutable treasury;

    constructor(address _treasury) {
        treasury = _treasury;
    }

    /// @param originationFee Fee in token (6 decimals). Lender pays. Pass 0 for no fee.
    function createFacility(
        address lender,
        address borrower,
        address token,
        uint256 limit,
        uint256 minReputation,
        uint256 repaymentInterval,
        address reputationRegistry,
        address identityRegistry,
        uint256 borrowerAgentId,
        uint256 originationFee
    ) external returns (address facility) {
        if (lender == address(0) || borrower == address(0) || token == address(0)) {
            revert CreditFacilityFactoryZeroAddress();
        }
        if (originationFee > 0) {
            if (treasury == address(0)) revert CreditFacilityFactoryFeeRequiresTreasury();
            if (msg.sender != lender) revert CreditFacilityFactoryLenderMustCreate();
            IERC20(token).safeTransferFrom(lender, treasury, originationFee);
        }
        facility = address(
            new CreditFacility(
                lender,
                borrower,
                token,
                limit,
                minReputation,
                repaymentInterval,
                reputationRegistry,
                identityRegistry,
                borrowerAgentId
            )
        );
        emit FacilityCreated(facility, lender, borrower);
    }
}
