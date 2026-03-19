// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {BudgetPolicy} from "../src/policies/BudgetPolicy.sol";
import {PackedUserOperation} from "../src/vendor/interfaces/PackedUserOperation.sol";

contract BudgetPolicyTest is Test {
    BudgetPolicy public policy;
    address public account;
    address public owner;

    uint256 constant SECONDS_PER_DAY = 86400;
    uint256 constant SECONDS_PER_WEEK = 604800;

    function setUp() public {
        account = makeAddr("account");
        owner = makeAddr("owner");
        policy = new BudgetPolicy(account, owner, 1e6, 2e6, 5e6, 0, 0, 0, 0); // 1 per-tx, 2 daily, 5 weekly
    }

    function _makeExecuteCalldata(address dest, uint256 value, bytes memory data) internal pure returns (bytes memory) {
        return abi.encodeWithSignature("execute(address,uint256,bytes)", dest, value, data);
    }

    function _makeExecuteWithTransferCalldata(address dest, address tokenRecipient, uint256 amount)
        internal
        pure
        returns (bytes memory)
    {
        bytes memory inner = abi.encodeWithSignature("transfer(address,uint256)", tokenRecipient, amount);
        return abi.encodeWithSignature("execute(address,uint256,bytes)", dest, 0, inner);
    }

    function _makeUserOp(bytes memory callData) internal view returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: account,
            nonce: 0,
            initCode: "",
            callData: callData,
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });
    }

    function test_CheckPassesWithinPerTxCap() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 0.5e6);
        PackedUserOperation memory userOp = _makeUserOp(cd);
        assertEq(policy.check(userOp), 0);
    }

    function test_CheckFailsExceedsPerTxCap() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 2e6);
        PackedUserOperation memory userOp = _makeUserOp(cd);
        assertEq(policy.check(userOp), 1);
    }

    function test_CheckPassesAtPerTxCapBoundary() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 1e6);
        PackedUserOperation memory userOp = _makeUserOp(cd);
        assertEq(policy.check(userOp), 0);
    }

    function test_CheckFailsWrongSender() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 0.5e6);
        PackedUserOperation memory userOp = _makeUserOp(cd);
        userOp.sender = makeAddr("wrong");
        assertEq(policy.check(userOp), 1);
    }

    function test_RecordSpendUpdatesState() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 0.5e6);
        vm.prank(account);
        policy.recordSpend(cd);

        assertEq(policy.spentDaily(), 0.5e6);
        assertEq(policy.spentWeekly(), 0.5e6);
    }

    function test_RecordSpendCumulativeWithinDailyCap() public {
        bytes memory cd1 = _makeExecuteWithTransferCalldata(makeAddr("d1"), makeAddr("t1"), 0.5e6);
        bytes memory cd2 = _makeExecuteWithTransferCalldata(makeAddr("d2"), makeAddr("t2"), 0.5e6);

        vm.prank(account);
        policy.recordSpend(cd1);
        vm.prank(account);
        policy.recordSpend(cd2);

        assertEq(policy.spentDaily(), 1e6);
        assertEq(policy.spentWeekly(), 1e6);
    }

    function test_CheckFailsAfterDailyCapExceeded() public {
        bytes memory cd1 = _makeExecuteWithTransferCalldata(makeAddr("d1"), makeAddr("t1"), 1e6);
        bytes memory cd2 = _makeExecuteWithTransferCalldata(makeAddr("d2"), makeAddr("t2"), 1e6);
        bytes memory cd3 = _makeExecuteWithTransferCalldata(makeAddr("d3"), makeAddr("t3"), 0.5e6);

        vm.prank(account);
        policy.recordSpend(cd1);
        vm.prank(account);
        policy.recordSpend(cd2);
        // spentDaily = 2e6 = maxDaily; one more 0.5e6 would exceed
        vm.prank(account);
        policy.recordSpend(cd3);

        PackedUserOperation memory userOp =
            _makeUserOp(_makeExecuteWithTransferCalldata(makeAddr("d4"), makeAddr("t4"), 1));
        assertEq(policy.check(userOp), 1); // would exceed daily
    }

    function test_DailyWindowResetsAfterTime() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 1e6);
        vm.prank(account);
        policy.recordSpend(cd);
        assertEq(policy.spentDaily(), 1e6);

        vm.warp(block.timestamp + SECONDS_PER_DAY + 1);
        bytes memory cd2 = _makeExecuteWithTransferCalldata(makeAddr("dest2"), makeAddr("to2"), 1e6);
        PackedUserOperation memory userOp = _makeUserOp(cd2);
        assertEq(policy.check(userOp), 0); // new window, should pass
    }

    function test_WeeklyWindowResetsAfterTime() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 4e6);
        vm.prank(account);
        policy.recordSpend(cd);
        assertEq(policy.spentWeekly(), 4e6);

        vm.warp(block.timestamp + SECONDS_PER_WEEK + 1);
        // Use 1e6 to stay within per-tx cap; weekly was reset so 4e6 spent is cleared
        bytes memory cd2 = _makeExecuteWithTransferCalldata(makeAddr("dest2"), makeAddr("to2"), 1e6);
        PackedUserOperation memory userOp = _makeUserOp(cd2);
        assertEq(policy.check(userOp), 0); // new window
    }

    function test_CheckPolicyView() public {
        assertTrue(policy.checkPolicy(0.5e6, makeAddr("any")));
        assertTrue(policy.checkPolicy(1e6, makeAddr("any")));
        assertFalse(policy.checkPolicy(2e6, makeAddr("any")));
    }

    function test_RecordSpendRevertsFromNonAccount() public {
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 0.5e6);
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(BudgetPolicy.BudgetPolicyNotAccount.selector);
        policy.recordSpend(cd);
    }

    function test_SetCapsOnlyOwner() public {
        vm.prank(owner);
        policy.setCaps(2e6, 4e6, 10e6);
        assertEq(policy.maxPerTx(), 2e6);
        assertEq(policy.maxDaily(), 4e6);
        assertEq(policy.maxWeekly(), 10e6);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(BudgetPolicy.BudgetPolicyNotOwner.selector);
        policy.setCaps(1, 1, 1);
    }

    function test_SetOwnerOnlyOwner() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        policy.setOwner(newOwner);
        assertEq(policy.owner(), newOwner);

        vm.prank(makeAddr("attacker"));
        vm.expectRevert(BudgetPolicy.BudgetPolicyNotOwner.selector);
        policy.setOwner(makeAddr("attacker"));
    }

    function test_SetOwnerZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(BudgetPolicy.BudgetPolicyZeroOwner.selector);
        policy.setOwner(address(0));
    }

    function test_SetAccountZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(BudgetPolicy.BudgetPolicyZeroAccount.selector);
        policy.setAccount(address(0));
    }

    function test_SetAccountOnlyOwner() public {
        address newAccount = makeAddr("newAccount");
        vm.prank(owner);
        policy.setAccount(newAccount);
        assertEq(policy.account(), newAccount);
    }

    function test_ZeroCapsUnlimited() public {
        BudgetPolicy unlimited = new BudgetPolicy(account, owner, 0, 0, 0, 0, 0, 0, 0);
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 1e12);
        PackedUserOperation memory userOp = _makeUserOp(cd);
        assertEq(unlimited.check(userOp), 0);
        assertTrue(unlimited.checkPolicy(1e12, makeAddr("any")));
    }

    function test_RecordSpendZeroAmountNoOp() public {
        bytes memory cd = _makeExecuteCalldata(makeAddr("dest"), 0, "");
        vm.prank(account);
        policy.recordSpend(cd);
        assertEq(policy.spentDaily(), 0);
        assertEq(policy.spentWeekly(), 0);
    }

    function test_ExecuteWithValueDecoded() public {
        bytes memory cd = abi.encodeWithSignature("execute(address,uint256,bytes)", makeAddr("dest"), 0.3e6, "");
        PackedUserOperation memory userOp = _makeUserOp(cd);
        assertEq(policy.check(userOp), 0);
    }

    function testFuzz_CheckPolicyWithinCaps(uint256 amount) public {
        vm.assume(amount <= 1e6);
        assertTrue(policy.checkPolicy(amount, makeAddr("any")));
    }

    function testFuzz_CheckPolicyExceedsPerTx(uint256 amount) public {
        vm.assume(amount > 1e6);
        assertFalse(policy.checkPolicy(amount, makeAddr("any")));
    }

    function test_PerTaskCap() public {
        BudgetPolicy taskPolicy = new BudgetPolicy(account, owner, 1e6, 10e6, 50e6, 1.5e6, 3600, 0, 0); // 1.5e6 per task, 1hr window
        bytes memory cd1 = _makeExecuteWithTransferCalldata(makeAddr("d1"), makeAddr("t1"), 1e6);
        bytes memory cd2 = _makeExecuteWithTransferCalldata(makeAddr("d2"), makeAddr("t2"), 0.6e6);

        vm.prank(account);
        taskPolicy.recordSpend(cd1);
        vm.prank(account);
        taskPolicy.recordSpend(cd2);
        // spentInTask = 1.6e6 > 1.5e6
        PackedUserOperation memory userOp =
            _makeUserOp(_makeExecuteWithTransferCalldata(makeAddr("d3"), makeAddr("t3"), 1));
        assertEq(taskPolicy.check(userOp), 1);
    }

    function test_PerTaskWindowResets() public {
        BudgetPolicy taskPolicy = new BudgetPolicy(account, owner, 1e6, 10e6, 50e6, 1e6, 3600, 0, 0); // 1e6 per task, 1hr window
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 1e6);
        vm.prank(account);
        taskPolicy.recordSpend(cd);
        assertEq(taskPolicy.spentInTask(), 1e6);

        vm.warp(block.timestamp + 3601);
        PackedUserOperation memory userOp =
            _makeUserOp(_makeExecuteWithTransferCalldata(makeAddr("d2"), makeAddr("t2"), 1e6));
        assertEq(taskPolicy.check(userOp), 0); // new task window
    }

    function test_ConfigurableDailyWindow() public {
        BudgetPolicy customPolicy = new BudgetPolicy(account, owner, 1e6, 2e6, 10e6, 0, 0, 7200, 0); // 2hr daily window
        bytes memory cd = _makeExecuteWithTransferCalldata(makeAddr("dest"), makeAddr("to"), 1e6);
        vm.prank(account);
        customPolicy.recordSpend(cd);

        vm.warp(block.timestamp + 86401); // > 1 day but default would reset
        // With 7200s window, 86401s has passed = 12 full windows, so spent should have reset
        PackedUserOperation memory userOp =
            _makeUserOp(_makeExecuteWithTransferCalldata(makeAddr("d2"), makeAddr("t2"), 1e6));
        assertEq(customPolicy.check(userOp), 0);
    }

    function test_SetCapsFull() public {
        vm.prank(owner);
        policy.setCapsFull(2e6, 4e6, 10e6, 1e6, 1800, 43200, 302400);
        assertEq(policy.maxPerTx(), 2e6);
        assertEq(policy.maxDaily(), 4e6);
        assertEq(policy.maxWeekly(), 10e6);
        assertEq(policy.maxPerTask(), 1e6);
        assertEq(policy.taskWindowSeconds(), 1800);
        assertEq(policy.dailyWindowSeconds(), 43200);
        assertEq(policy.weeklyWindowSeconds(), 302400);
    }
}
