// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {AEPAccount} from "./AEPAccount.sol";
import {IEntryPoint} from "./vendor/interfaces/IEntryPoint.sol";
import {BudgetPolicy} from "./policies/BudgetPolicy.sol";
import {CounterpartyPolicy} from "./policies/CounterpartyPolicy.sol";
import {PolicyRegistry} from "./PolicyRegistry.sol";

/**
 * @title AEPAccountFactory
 * @notice Permissionless factory for deploying AEP accounts with CREATE2.
 */
contract AEPAccountFactory {
    error AEPAccountFactoryCreate2Failed();
    error AEPAccountFactoryZeroAddress();

    IEntryPoint public immutable ENTRY_POINT;
    address public immutable ACCOUNT_IMPLEMENTATION;

    uint256 public constant DEFAULT_DAILY_CAP = 1e6; // 1 USDC (6 decimals)

    event AccountDeployed(address indexed account, address indexed owner, bytes32 indexed salt);

    constructor(IEntryPoint _entryPoint, address _accountImplementation) {
        if (address(_entryPoint) == address(0) || _accountImplementation == address(0)) {
            revert AEPAccountFactoryZeroAddress();
        }
        ENTRY_POINT = _entryPoint;
        ACCOUNT_IMPLEMENTATION = _accountImplementation;
    }

    /// @notice Predicts CREATE2 address for an account deployed with the given salt.
    /// @dev The owner parameter is ignored; address depends only on salt and creation code.
    ///      Use different salts for different owners to avoid address collisions.
    function getAccountAddress(
        address,
        /* owner */
        bytes32 salt
    )
        public
        view
        returns (address)
    {
        bytes memory initData = abi.encodeWithSelector(AEPAccount.initialize.selector, address(this));
        bytes memory creationCode =
            bytes.concat(type(ERC1967Proxy).creationCode, abi.encode(ACCOUNT_IMPLEMENTATION, initData));
        // forge-lint: disable-next-line(asm-keccak256)
        bytes32 hash = keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, keccak256(creationCode)));
        return address(uint160(uint256(hash)));
    }

    function deployAccount(address owner, bytes32 salt) external returns (address account) {
        bytes memory initData = abi.encodeWithSelector(AEPAccount.initialize.selector, address(this));

        bytes memory creationCode =
            bytes.concat(type(ERC1967Proxy).creationCode, abi.encode(ACCOUNT_IMPLEMENTATION, initData));

        assembly {
            account := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }
        if (account == address(0)) revert AEPAccountFactoryCreate2Failed();

        BudgetPolicy budgetPolicy = new BudgetPolicy(account, owner, 0, DEFAULT_DAILY_CAP, 0, 0, 0, 0, 0);

        CounterpartyPolicy counterpartyPolicy = new CounterpartyPolicy(account, owner);

        AEPAccount(payable(account)).addPolicyModule(address(budgetPolicy));
        AEPAccount(payable(account)).addPolicyModule(address(counterpartyPolicy));
        AEPAccount(payable(account)).setOwner(owner);

        emit AccountDeployed(account, owner, salt);
    }

    /// @notice Deploy an account from a PolicyRegistry template.
    function deployFromTemplate(address registry, bytes32 templateId, address owner, bytes32 salt)
        external
        returns (address account)
    {
        (
            uint256 maxPerTx,
            uint256 maxDaily,
            uint256 maxWeekly,
            uint256 maxPerTask,
            uint256 taskWindowSeconds,
            uint256 dailyWindowSeconds,
            uint256 weeklyWindowSeconds
        ) = PolicyRegistry(registry).getTemplate(templateId);

        bytes memory initData = abi.encodeWithSelector(AEPAccount.initialize.selector, address(this));
        bytes memory creationCode =
            bytes.concat(type(ERC1967Proxy).creationCode, abi.encode(ACCOUNT_IMPLEMENTATION, initData));

        assembly {
            account := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }
        if (account == address(0)) revert AEPAccountFactoryCreate2Failed();

        BudgetPolicy budgetPolicy = new BudgetPolicy(
            account,
            owner,
            maxPerTx,
            maxDaily,
            maxWeekly,
            maxPerTask,
            taskWindowSeconds,
            dailyWindowSeconds,
            weeklyWindowSeconds
        );
        CounterpartyPolicy counterpartyPolicy = new CounterpartyPolicy(account, owner);

        AEPAccount(payable(account)).addPolicyModule(address(budgetPolicy));
        AEPAccount(payable(account)).addPolicyModule(address(counterpartyPolicy));
        AEPAccount(payable(account)).setOwner(owner);

        emit AccountDeployed(account, owner, salt);
    }

    /// @notice Deploys an account with custom policy modules.
    /// @dev For custom setups. Empty array deploys account with no policy modules. Caller must ensure valid module addresses.
    function deployAccountWithModules(address owner, bytes32 salt, address[] calldata policyModules)
        external
        returns (address account)
    {
        bytes memory initData = abi.encodeWithSelector(AEPAccount.initializeWithModules.selector, owner, policyModules);

        bytes memory creationCode =
            bytes.concat(type(ERC1967Proxy).creationCode, abi.encode(ACCOUNT_IMPLEMENTATION, initData));

        assembly {
            account := create2(0, add(creationCode, 0x20), mload(creationCode), salt)
        }
        if (account == address(0)) revert AEPAccountFactoryCreate2Failed();

        emit AccountDeployed(account, owner, salt);
    }
}
