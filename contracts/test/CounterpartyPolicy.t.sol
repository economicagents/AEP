// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {CounterpartyPolicy} from "../src/policies/CounterpartyPolicy.sol";
import {MockERC8004Identity, MockERC8004Reputation} from "./MockERC8004.sol";

contract CounterpartyPolicyTest is Test {
    CounterpartyPolicy public policy;
    MockERC8004Identity public identityRegistry;
    MockERC8004Reputation public reputationRegistry;
    address public account;
    address public owner;

    function setUp() public {
        account = makeAddr("account");
        owner = makeAddr("owner");
        policy = new CounterpartyPolicy(account, owner);
        identityRegistry = new MockERC8004Identity();
        reputationRegistry = new MockERC8004Reputation();
    }

    function test_BlockList() public {
        address blocked = makeAddr("blocked");
        vm.prank(owner);
        policy.addToBlockList(blocked);

        assertFalse(policy.checkPolicy(0, blocked));
        assertTrue(policy.checkPolicy(0, makeAddr("other")));
    }

    function test_AllowList() public {
        vm.prank(owner);
        policy.setUseAllowList(true);

        address allowed = makeAddr("allowed");
        vm.prank(owner);
        policy.addToAllowList(allowed);

        assertTrue(policy.checkPolicy(0, allowed));
        assertFalse(policy.checkPolicy(0, makeAddr("not_allowed")));
    }

    function test_AgentAllowList() public {
        vm.prank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        vm.prank(owner);
        policy.setUseAllowList(true);
        vm.prank(owner);
        policy.setUseAgentAllowList(true);

        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        vm.prank(owner);
        policy.addAgentToAllowList(1);

        assertTrue(policy.checkPolicy(0, agentWallet));
        assertFalse(policy.checkPolicy(0, makeAddr("other")));
    }

    function test_AllowListCap() public {
        vm.prank(owner);
        policy.setUseAllowList(true);

        for (uint256 i = 0; i < 256; i++) {
            vm.prank(owner);
            // forge-lint: disable-next-line(unsafe-typecast)
            policy.addToAllowList(address(uint160(i + 1)));
        }

        vm.prank(owner);
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyAllowListFull.selector);
        // forge-lint: disable-next-line(unsafe-typecast)
        policy.addToAllowList(address(uint160(257)));
    }

    function test_AgentListCap() public {
        vm.prank(owner);
        policy.setUseAllowList(true);
        vm.prank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        vm.prank(owner);
        policy.setUseAgentAllowList(true);

        for (uint256 i = 0; i < 256; i++) {
            vm.prank(owner);
            policy.addAgentToAllowList(i);
        }

        vm.prank(owner);
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyAgentListFull.selector);
        policy.addAgentToAllowList(256);
    }

    function test_RemoveFromAllowList() public {
        vm.prank(owner);
        policy.setUseAllowList(true);

        address allowed = makeAddr("allowed");
        vm.prank(owner);
        policy.addToAllowList(allowed);
        assertTrue(policy.checkPolicy(0, allowed));

        vm.prank(owner);
        policy.removeFromAllowList(allowed);
        assertFalse(policy.checkPolicy(0, allowed));
    }

    function test_RemoveFromBlockList() public {
        address blocked = makeAddr("blocked");
        vm.prank(owner);
        policy.addToBlockList(blocked);
        assertFalse(policy.checkPolicy(0, blocked));

        vm.prank(owner);
        policy.removeFromBlockList(blocked);
        assertTrue(policy.checkPolicy(0, blocked));
    }

    function test_BlockListOverridesAllowList() public {
        vm.prank(owner);
        policy.setUseAllowList(true);

        address addr = makeAddr("addr");
        vm.prank(owner);
        policy.addToAllowList(addr);
        vm.prank(owner);
        policy.addToBlockList(addr);

        assertFalse(policy.checkPolicy(0, addr));
    }

    function test_NonOwnerCannotAddToAllowList() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyNotOwner.selector);
        policy.addToAllowList(makeAddr("addr"));
    }

    function test_NonOwnerCannotSetOwner() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyNotOwner.selector);
        policy.setOwner(makeAddr("attacker"));
    }

    function test_SetOwnerZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyZeroOwner.selector);
        policy.setOwner(address(0));
    }

    function test_SetAccountZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyZeroAccount.selector);
        policy.setAccount(address(0));
    }

    function test_NonOwnerCannotSetIdentityRegistry() public {
        vm.prank(makeAddr("attacker"));
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyNotOwner.selector);
        policy.setIdentityRegistry(address(identityRegistry));
    }

    function test_ClearAgentAllowList() public {
        vm.prank(owner);
        policy.setUseAllowList(true);
        vm.prank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        vm.prank(owner);
        policy.setUseAgentAllowList(true);

        vm.prank(owner);
        policy.addAgentToAllowList(1);
        identityRegistry.setAgentWallet(1, makeAddr("w1"));
        assertTrue(policy.checkPolicy(0, makeAddr("w1")));

        vm.prank(owner);
        policy.clearAgentAllowList();
        assertFalse(policy.checkPolicy(0, makeAddr("w1")));
    }

    function test_AddAgentToAllowListRevertsOnDuplicate() public {
        vm.prank(owner);
        policy.setUseAllowList(true);
        vm.prank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        vm.prank(owner);
        policy.setUseAgentAllowList(true);

        vm.prank(owner);
        policy.addAgentToAllowList(1);

        vm.prank(owner);
        vm.expectRevert(CounterpartyPolicy.CounterpartyPolicyAgentAlreadyInList.selector);
        policy.addAgentToAllowList(1);
    }

    function test_AllowListDisabledPermitsAll() public {
        address random = makeAddr("random");
        assertTrue(policy.checkPolicy(0, random));
    }

    function test_MinReputationRejectsLowScore() public {
        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        reputationRegistry.setReputation(1, makeAddr("client"), 50, 2); // score 50, 2 decimals

        vm.startPrank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        policy.setReputationRegistry(address(reputationRegistry));
        policy.setMinReputation(100, 2); // min 100, 2 decimals (enabled)
        policy.setUseAllowList(true);
        policy.setUseAgentAllowList(true);
        policy.addAgentToAllowList(1);
        vm.stopPrank();

        assertFalse(policy.checkPolicy(0, agentWallet));
    }

    function test_MinReputationAllowsHighScore() public {
        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        reputationRegistry.setReputation(1, makeAddr("client"), 150, 2); // score 150, 2 decimals

        vm.startPrank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        policy.setReputationRegistry(address(reputationRegistry));
        policy.setMinReputation(100, 2); // min 100, 2 decimals (enabled)
        policy.setUseAllowList(true);
        policy.setUseAgentAllowList(true);
        policy.addAgentToAllowList(1);
        vm.stopPrank();

        assertTrue(policy.checkPolicy(0, agentWallet));
    }

    function test_UnsetAgentWalletRejected() public {
        // getAgentWallet(1) returns address(0) - unset
        address agentWallet = makeAddr("agentWallet");
        vm.prank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        vm.prank(owner);
        policy.setUseAllowList(true);
        vm.prank(owner);
        policy.setUseAgentAllowList(true);
        vm.prank(owner);
        policy.addAgentToAllowList(1);
        // identityRegistry.getAgentWallet(1) returns address(0) - never set
        assertFalse(policy.checkPolicy(0, agentWallet));
    }

    function testFuzz_BlockListDenies(address addr) public {
        vm.assume(addr != address(0));
        vm.prank(owner);
        policy.addToBlockList(addr);
        assertFalse(policy.checkPolicy(0, addr));
    }

    function test_GlobalMinReputation_UnregisteredDenied() public {
        vm.prank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        vm.prank(owner);
        policy.setReputationRegistry(address(reputationRegistry));
        vm.prank(owner);
        policy.setMinReputation(80, 2);
        vm.prank(owner);
        policy.setUseGlobalMinReputation(true);

        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        reputationRegistry.setReputation(1, makeAddr("client"), 100, 2);

        vm.prank(owner);
        policy.addVerifiedAgent(1);

        assertTrue(policy.checkPolicy(0, agentWallet));

        address unregistered = makeAddr("unregistered");
        assertFalse(policy.checkPolicy(0, unregistered));
        assertEq(policy.getDenyReason(unregistered), policy.DENY_UNREGISTERED());
    }

    function test_GlobalMinReputation_LowReputationDenied() public {
        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        reputationRegistry.setReputation(1, makeAddr("client"), 50, 2);

        vm.startPrank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        policy.setReputationRegistry(address(reputationRegistry));
        policy.setMinReputation(80, 2);
        policy.setUseGlobalMinReputation(true);
        policy.addVerifiedAgent(1);
        vm.stopPrank();

        assertFalse(policy.checkPolicy(0, agentWallet));
        assertEq(policy.getDenyReason(agentWallet), policy.DENY_REPUTATION_TOO_LOW());
    }

    function test_GlobalMinReputation_HighReputationAllowed() public {
        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        reputationRegistry.setReputation(1, makeAddr("client"), 100, 2);

        vm.startPrank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        policy.setReputationRegistry(address(reputationRegistry));
        policy.setMinReputation(80, 2);
        policy.setUseGlobalMinReputation(true);
        policy.addVerifiedAgent(1);
        vm.stopPrank();

        assertTrue(policy.checkPolicy(0, agentWallet));
        assertEq(policy.getDenyReason(agentWallet), policy.DENY_NONE());
    }

    function test_GetDenyReason_BlockList() public {
        address blocked = makeAddr("blocked");
        vm.prank(owner);
        policy.addToBlockList(blocked);
        assertEq(policy.getDenyReason(blocked), policy.DENY_BLOCK_LIST());
    }

    function test_GetDenyReason_AllowList() public {
        vm.prank(owner);
        policy.setUseAllowList(true);
        address notAllowed = makeAddr("notAllowed");
        assertEq(policy.getDenyReason(notAllowed), policy.DENY_ALLOW_LIST());
    }

    function test_RemoveVerifiedAgent() public {
        address agentWallet = makeAddr("agentWallet");
        identityRegistry.setAgentWallet(1, agentWallet);
        reputationRegistry.setReputation(1, makeAddr("client"), 100, 2);

        vm.startPrank(owner);
        policy.setIdentityRegistry(address(identityRegistry));
        policy.setReputationRegistry(address(reputationRegistry));
        policy.setMinReputation(80, 2);
        policy.setUseGlobalMinReputation(true);
        policy.addVerifiedAgent(1);
        vm.stopPrank();

        assertTrue(policy.checkPolicy(0, agentWallet));

        vm.prank(owner);
        policy.removeVerifiedAgent(agentWallet);
        assertFalse(policy.checkPolicy(0, agentWallet));
        assertEq(policy.getDenyReason(agentWallet), policy.DENY_UNREGISTERED());
    }
}
