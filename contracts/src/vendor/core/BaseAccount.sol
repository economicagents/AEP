// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-empty-blocks */

import {IAccount} from "../interfaces/IAccount.sol";
import {IEntryPoint} from "../interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "../interfaces/PackedUserOperation.sol";
import {UserOperationLib} from "./UserOperationLib.sol";

/**
 * Basic account implementation.
 * This contract provides the basic logic for implementing the IAccount interface - validateUserOp
 * Specific account implementation should inherit it and provide the account-specific logic.
 */
abstract contract BaseAccount is IAccount {
    error BaseAccountNotFromEntryPoint();
    error BaseAccountPrefundFailed();

    using UserOperationLib for PackedUserOperation;

    function getNonce() public view virtual returns (uint256) {
        return entryPoint().getNonce(address(this), 0);
    }

    function entryPoint() public view virtual returns (IEntryPoint);

    /// @inheritdoc IAccount
    function validateUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        virtual
        override
        returns (uint256 validationData)
    {
        _requireFromEntryPoint();
        validationData = _validateSignature(userOp, userOpHash);
        _validateNonce(userOp.nonce);
        _payPrefund(missingAccountFunds);
    }

    function _requireFromEntryPoint() internal view virtual {
        if (msg.sender != address(entryPoint())) revert BaseAccountNotFromEntryPoint();
    }

    function _validateSignature(PackedUserOperation calldata userOp, bytes32 userOpHash)
        internal
        virtual
        returns (uint256 validationData);

    function _validateNonce(uint256 nonce) internal view virtual {}

    function _payPrefund(uint256 missingAccountFunds) internal virtual {
        if (missingAccountFunds != 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds, gas: type(uint256).max}("");
            if (!success) revert BaseAccountPrefundFailed();
        }
    }
}
