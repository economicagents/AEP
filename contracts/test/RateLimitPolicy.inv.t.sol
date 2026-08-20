// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {RateLimitPolicy} from "../src/policies/RateLimitPolicy.sol";
import {PackedUserOperation} from "../src/vendor/interfaces/PackedUserOperation.sol";

/**
 * @title RateLimitPolicyInvariantTest
 * @notice Invariant: txCount never exceeds max in a window after recordSpend.
 */
contract RateLimitPolicyInvariantTest is Test {
    RateLimitPolicy public policy;
    address public account;
    address public owner;

    uint256 constant MAX_TX = 5;
    uint256 constant WINDOW = 3600;

    function setUp() public {
        account = makeAddr("account");
        owner = makeAddr("owner");
        policy = new RateLimitPolicy(account, owner);
        vm.prank(owner);
        policy.setLimits(MAX_TX, WINDOW);
    }

    function _makeUserOp() internal view returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: account,
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });
    }

    function testFuzz_InvariantTxCountNeverExceedsMaxInWindow(uint8 n) public {
        n = uint8(bound(n, 0, MAX_TX * 2));

        for (uint256 i = 0; i < n; i++) {
            if (policy.check(_makeUserOp()) == 0) {
                vm.prank(account);
                policy.recordSpend("");
            }
        }

        assertLe(policy.txCount(), MAX_TX);
    }

    function testFuzz_WindowRolloverResetsCount(uint8 n, uint256 warpSeconds) public {
        n = uint8(bound(n, 1, MAX_TX));
        warpSeconds = bound(warpSeconds, WINDOW + 1, WINDOW * 10);

        for (uint256 i = 0; i < n; i++) {
            vm.prank(account);
            policy.recordSpend("");
        }
        assertEq(policy.txCount(), n);

        vm.warp(block.timestamp + warpSeconds);
        assertEq(policy.check(_makeUserOp()), 0);

        vm.prank(account);
        policy.recordSpend("");
        assertEq(policy.txCount(), 1);
    }
}
