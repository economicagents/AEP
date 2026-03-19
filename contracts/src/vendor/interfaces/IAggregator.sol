// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.5;

import {PackedUserOperation} from "./PackedUserOperation.sol";

interface IAggregator {
    function validateSignatures(PackedUserOperation[] calldata userOps, bytes calldata signature) external view;

    function validateUserOpSignature(PackedUserOperation calldata userOp)
        external
        view
        returns (bytes memory sigForUserOp);

    function aggregateSignatures(PackedUserOperation[] calldata userOps)
        external
        view
        returns (bytes memory aggregatedSignature);
}
