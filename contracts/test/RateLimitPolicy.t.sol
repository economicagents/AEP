// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {RateLimitPolicy} from "../src/policies/RateLimitPolicy.sol";
import {PackedUserOperation} from "../src/vendor/interfaces/PackedUserOperation.sol";

contract RateLimitPolicyTest is Test {
    RateLimitPolicy public policy;
    address public account;
    address public owner;

    uint256 constant WINDOW = 3600; // 1 hour
    uint256 constant MAX_TX = 10;

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

    function test_CheckPassesWhenUnderLimit() public view {
        assertEq(policy.check(_makeUserOp()), 0);
    }

    function test_CheckFailsAtLimit() public {
        for (uint256 i = 0; i < MAX_TX; i++) {
            vm.prank(account);
            policy.recordSpend("");
        }
        assertEq(policy.check(_makeUserOp()), 1);
    }

    function test_CheckPassesJustUnderLimit() public {
        for (uint256 i = 0; i < MAX_TX - 1; i++) {
            vm.prank(account);
            policy.recordSpend("");
        }
        assertEq(policy.check(_makeUserOp()), 0);
    }

    function test_RecordSpendIncrementsCount() public {
        vm.prank(account);
        policy.recordSpend("");
        assertEq(policy.txCount(), 1);

        vm.prank(account);
        policy.recordSpend("");
        assertEq(policy.txCount(), 2);
    }

    function test_WindowResetsAfterTime() public {
        for (uint256 i = 0; i < MAX_TX; i++) {
            vm.prank(account);
            policy.recordSpend("");
        }
        assertEq(policy.check(_makeUserOp()), 1);

        vm.warp(block.timestamp + WINDOW + 1);
        assertEq(policy.check(_makeUserOp()), 0);
    }

    function test_CheckFailsWrongSender() public {
        PackedUserOperation memory userOp = _makeUserOp();
        userOp.sender = makeAddr("wrong");
        assertEq(policy.check(userOp), 1);
    }

    function test_ZeroLimitUnlimited() public {
        vm.prank(owner);
        policy.setLimits(0, WINDOW);
        for (uint256 i = 0; i < 100; i++) {
            assertEq(policy.check(_makeUserOp()), 0);
        }
    }

    function test_RecordSpendRevertsFromNonAccount() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(RateLimitPolicy.RateLimitPolicyNotAccount.selector);
        policy.recordSpend("");
    }

    function test_SetLimitsOnlyOwner() public {
        vm.prank(owner);
        policy.setLimits(20, 7200);
        assertEq(policy.maxTxPerWindow(), 20);
        assertEq(policy.windowSeconds(), 7200);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(RateLimitPolicy.RateLimitPolicyNotOwner.selector);
        policy.setLimits(1, 1);
    }

    function test_SetLimitsZeroWindowWithCapReverts() public {
        vm.prank(owner);
        vm.expectRevert(RateLimitPolicy.RateLimitPolicyInvalidWindow.selector);
        policy.setLimits(5, 0);
    }

    function test_SetLimitsZeroMaxAndZeroWindowAllowed() public {
        vm.prank(owner);
        policy.setLimits(0, 0);
        assertEq(policy.maxTxPerWindow(), 0);
        assertEq(policy.windowSeconds(), 0);
        assertEq(policy.check(_makeUserOp()), 0);
    }

    function test_SetOwnerOnlyOwner() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        policy.setOwner(newOwner);
        assertEq(policy.owner(), newOwner);
    }

    function test_SetOwnerZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(RateLimitPolicy.RateLimitPolicyZeroOwner.selector);
        policy.setOwner(address(0));
    }

    function test_SetAccountZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(RateLimitPolicy.RateLimitPolicyZeroAccount.selector);
        policy.setAccount(address(0));
    }

    function test_CheckPolicyView() public {
        for (uint256 i = 0; i < MAX_TX - 1; i++) {
            vm.prank(account);
            policy.recordSpend("");
        }
        assertTrue(policy.checkPolicy(0, makeAddr("any")));

        vm.prank(account);
        policy.recordSpend("");
        assertFalse(policy.checkPolicy(0, makeAddr("any")));
    }

    function testFuzz_RecordSpendUpToLimit(uint8 n) public {
        vm.assume(n <= MAX_TX);
        for (uint256 i = 0; i < n; i++) {
            vm.prank(account);
            policy.recordSpend("");
        }
        if (n >= MAX_TX) {
            assertEq(policy.check(_makeUserOp()), 1);
        } else {
            assertEq(policy.check(_makeUserOp()), 0);
        }
    }
}
