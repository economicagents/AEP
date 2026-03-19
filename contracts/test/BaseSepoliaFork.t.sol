// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {AEPAccountFactory} from "../src/AEPAccountFactory.sol";
import {IEntryPoint} from "../src/vendor/interfaces/IEntryPoint.sol";

/**
 * @title BaseSepoliaFork
 * @notice Read-only fork tests against deployed Base Sepolia contracts.
 * Skip when BASE_SEPOLIA_RPC not set: run with --no-match-test to skip.
 * Run: forge test --match-contract BaseSepoliaFork --fork-url $BASE_SEPOLIA_RPC
 */
contract BaseSepoliaForkTest is Test {
    address constant FACTORY = 0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546;
    address constant FIRST_ACCOUNT = 0x13A053aAAfa68807dfeD8FAe82C6242429D24A15;
    address constant OWNER = 0xdEc6bDb019BdEaA0591170313D8316F25B29D139;
    bytes32 constant SALT = bytes32(0);

    function setUp() public {
        string memory rpc = vm.envOr("BASE_SEPOLIA_RPC", string(""));
        if (bytes(rpc).length == 0) {
            vm.skip(true);
        }
        vm.createSelectFork(rpc);
    }

    function test_factoryGetAccountAddress() public view {
        address expected = AEPAccountFactory(FACTORY).getAccountAddress(OWNER, SALT);
        assertEq(expected, FIRST_ACCOUNT, "getAccountAddress should match first account");
    }

    function test_accountExists() public view {
        uint256 size;
        assembly {
            size := extcodesize(FIRST_ACCOUNT)
        }
        assertGt(size, 0, "First account should have bytecode");
    }

    function test_policyModules() public view {
        (bool success,) = FIRST_ACCOUNT.staticcall(abi.encodeWithSignature("getPolicyModulesLength()"));
        assertTrue(success, "getPolicyModulesLength should succeed");
    }
}
