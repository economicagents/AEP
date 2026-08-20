// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {AEPAccountFactory} from "../src/AEPAccountFactory.sol";
import {AEPAccount} from "../src/AEPAccount.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";

/**
 * @title BaseMainnetForkTest
 * @notice Fork tests against live Base mainnet (chainid 8453).
 * Pinned block: 50000000 (stable snapshot; factory deployed on Base).
 * Run:
 *   forge test --match-path test/BaseMainnetFork.t.sol -vvv \
 *     --fork-url $BASE_MAINNET_RPC --fork-block-number 50000000
 * Fallback RPC: https://mainnet.base.org
 */
contract BaseMainnetForkTest is Test {
    /// @dev Verified AEPAccountFactory on Base mainnet
    address constant FACTORY = 0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546;
    /// @dev ERC-4337 EntryPoint v0.7 on Base
    address constant ENTRY_POINT = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    /// @dev Pinned fork block (see foundry.toml [profile.fork])
    uint256 constant FORK_BLOCK = 50_000_000;

    bytes32 constant TEST_SALT = keccak256("aep-mainnet-fork-test");

    function setUp() public {
        string memory rpc = vm.envOr("BASE_MAINNET_RPC", string("https://mainnet.base.org"));
        vm.createSelectFork(rpc, FORK_BLOCK);
        if (block.chainid != 8453) {
            vm.skip(true);
        }
    }

    function test_chainIdIsBase() public view {
        assertEq(block.chainid, 8453);
    }

    function test_forkBlockPinned() public view {
        assertEq(block.number, FORK_BLOCK);
    }

    function test_factoryHasBytecode() public view {
        uint256 size;
        assembly {
            size := extcodesize(FACTORY)
        }
        assertGt(size, 0, "factory should have bytecode on Base mainnet");
    }

    function test_factoryEntryPointMatches() public view {
        assertEq(address(AEPAccountFactory(FACTORY).ENTRY_POINT()), ENTRY_POINT);
    }

    function test_factoryImplementationHasBytecode() public view {
        address impl = AEPAccountFactory(FACTORY).ACCOUNT_IMPLEMENTATION();
        uint256 size;
        assembly {
            size := extcodesize(impl)
        }
        assertGt(size, 0, "account implementation should have bytecode");
    }

    function test_factoryGetAccountAddressDeterministic() public {
        address owner = makeAddr("forkOwner");
        address predicted = AEPAccountFactory(FACTORY).getAccountAddress(owner, TEST_SALT);
        assertTrue(predicted != address(0));
        assertTrue(predicted != FACTORY);
    }

    function test_factoryDefaultDailyCap() public view {
        assertEq(AEPAccountFactory(FACTORY).DEFAULT_DAILY_CAP(), 1e6);
    }

    function test_entryPointHasBytecode() public view {
        uint256 size;
        assembly {
            size := extcodesize(ENTRY_POINT)
        }
        assertGt(size, 0, "EntryPoint should exist on Base");
    }

    function test_predictedAccountUninitialized() public {
        address owner = makeAddr("uninitializedOwner");
        address predicted = AEPAccountFactory(FACTORY).getAccountAddress(owner, TEST_SALT);
        uint256 size;
        assembly {
            size := extcodesize(predicted)
        }
        assertEq(size, 0, "predicted address should be empty before deploy");
    }

    function test_factoryCreateAccountSimulation() public {
        address owner = makeAddr("deployOwner");
        address predicted = AEPAccountFactory(FACTORY).getAccountAddress(owner, TEST_SALT);

        vm.prank(owner);
        address deployed = AEPAccountFactory(FACTORY).deployAccount(owner, TEST_SALT);

        assertEq(deployed, predicted);
        assertEq(AEPAccount(payable(deployed)).owner(), owner);
        assertEq(AEPAccount(payable(deployed)).getPolicyModulesLength(), 2);
    }
}
