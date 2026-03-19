// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IPolicyModule} from "../interfaces/IPolicyModule.sol";
import {PackedUserOperation} from "../vendor/interfaces/PackedUserOperation.sol";
import {PaymentDecoder} from "../libraries/PaymentDecoder.sol";

/**
 * @title BudgetPolicy
 * @notice Enforces per-tx, daily, weekly, per-task spend caps. Tracks cumulative spend in contract storage.
 *         Window lengths are configurable; 0 means use default (daily=86400, weekly=604800).
 */
contract BudgetPolicy is IPolicyModule, Initializable {
    error BudgetPolicyNotOwner();
    error BudgetPolicyNotAccount();
    error BudgetPolicyAlreadyInitialized();
    error BudgetPolicyZeroOwner();
    error BudgetPolicyZeroAccount();

    uint256 constant SECONDS_PER_DAY = 86400;
    uint256 constant SECONDS_PER_WEEK = 604800;

    address public account;
    address public owner;

    uint256 public maxPerTx;
    uint256 public maxDaily;
    uint256 public maxWeekly;
    uint256 public maxPerTask;
    uint256 public taskWindowSeconds;

    uint256 public spentDaily;
    uint256 public spentWeekly;
    uint256 public spentInTask;
    uint256 public dailyWindowStart;
    uint256 public weeklyWindowStart;
    uint256 public taskWindowStart;

    uint256 public dailyWindowSeconds;
    uint256 public weeklyWindowSeconds;

    event PolicyUpdated(
        uint256 maxPerTx,
        uint256 maxDaily,
        uint256 maxWeekly,
        uint256 maxPerTask,
        uint256 taskWindowSeconds,
        uint256 dailyWindowSeconds,
        uint256 weeklyWindowSeconds
    );
    event OwnerChanged(address indexed previousOwner, address indexed newOwner);
    event PolicyAccountUpdated(address indexed previousAccount, address indexed newAccount);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyAccount() {
        _onlyAccount();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert BudgetPolicyNotOwner();
    }

    function _onlyAccount() internal view {
        if (msg.sender != account) revert BudgetPolicyNotAccount();
    }

    /// @param _maxPerTask 0 = disabled.
    /// @param _taskWindowSeconds 0 = disabled (ignored if maxPerTask is 0).
    /// @param _dailyWindowSeconds 0 = use 86400.
    /// @param _weeklyWindowSeconds 0 = use 604800.
    constructor(
        address _account,
        address _owner,
        uint256 _maxPerTx,
        uint256 _maxDaily,
        uint256 _maxWeekly,
        uint256 _maxPerTask,
        uint256 _taskWindowSeconds,
        uint256 _dailyWindowSeconds,
        uint256 _weeklyWindowSeconds
    ) {
        if (_account == address(0)) revert BudgetPolicyZeroAccount();
        if (_owner == address(0)) revert BudgetPolicyZeroOwner();
        account = _account;
        owner = _owner;
        maxPerTx = _maxPerTx;
        maxDaily = _maxDaily;
        maxWeekly = _maxWeekly;
        maxPerTask = _maxPerTask;
        taskWindowSeconds = _taskWindowSeconds;
        dailyWindowSeconds = _dailyWindowSeconds;
        weeklyWindowSeconds = _weeklyWindowSeconds;
    }

    /// @dev Policy modules must be deployed via factory or initialize called atomically in same tx as deployment.
    function initialize(address _account, address _owner) external initializer {
        if (account != address(0)) revert BudgetPolicyAlreadyInitialized();
        if (_account == address(0)) revert BudgetPolicyZeroAccount();
        if (_owner == address(0)) revert BudgetPolicyZeroOwner();
        account = _account;
        owner = _owner;
    }

    /// @dev Policy modules must be deployed via factory or initialize called atomically in same tx as deployment.
    function initialize(address _account, address _owner, uint256 _maxPerTx, uint256 _maxDaily, uint256 _maxWeekly)
        external
        initializer
    {
        if (account != address(0)) revert BudgetPolicyAlreadyInitialized();
        if (_account == address(0)) revert BudgetPolicyZeroAccount();
        if (_owner == address(0)) revert BudgetPolicyZeroOwner();
        account = _account;
        owner = _owner;
        maxPerTx = _maxPerTx;
        maxDaily = _maxDaily;
        maxWeekly = _maxWeekly;
    }

    function setAccount(address _account) external onlyOwner {
        if (_account == address(0)) revert BudgetPolicyZeroAccount();
        emit PolicyAccountUpdated(account, _account);
        account = _account;
    }

    function setOwner(address _owner) external onlyOwner {
        if (_owner == address(0)) revert BudgetPolicyZeroOwner();
        emit OwnerChanged(owner, _owner);
        owner = _owner;
    }

    /// @notice Set only budget caps (per-tx, daily, weekly). Preserves per-task and window config.
    function setCaps(uint256 _maxPerTx, uint256 _maxDaily, uint256 _maxWeekly) external onlyOwner {
        maxPerTx = _maxPerTx;
        maxDaily = _maxDaily;
        maxWeekly = _maxWeekly;
        emit PolicyUpdated(
            _maxPerTx, _maxDaily, _maxWeekly, maxPerTask, taskWindowSeconds, dailyWindowSeconds, weeklyWindowSeconds
        );
    }

    /// @param _maxPerTask 0 = disabled.
    /// @param _taskWindowSeconds 0 = disabled.
    /// @param _dailyWindowSeconds 0 = use 86400.
    /// @param _weeklyWindowSeconds 0 = use 604800.
    function setCapsFull(
        uint256 _maxPerTx,
        uint256 _maxDaily,
        uint256 _maxWeekly,
        uint256 _maxPerTask,
        uint256 _taskWindowSeconds,
        uint256 _dailyWindowSeconds,
        uint256 _weeklyWindowSeconds
    ) external onlyOwner {
        maxPerTx = _maxPerTx;
        maxDaily = _maxDaily;
        maxWeekly = _maxWeekly;
        maxPerTask = _maxPerTask;
        taskWindowSeconds = _taskWindowSeconds;
        dailyWindowSeconds = _dailyWindowSeconds;
        weeklyWindowSeconds = _weeklyWindowSeconds;
        emit PolicyUpdated(
            _maxPerTx, _maxDaily, _maxWeekly, _maxPerTask, _taskWindowSeconds, _dailyWindowSeconds, _weeklyWindowSeconds
        );
    }

    function _effectiveDailyWindow() internal view returns (uint256) {
        return dailyWindowSeconds == 0 ? SECONDS_PER_DAY : dailyWindowSeconds;
    }

    function _effectiveWeeklyWindow() internal view returns (uint256) {
        return weeklyWindowSeconds == 0 ? SECONDS_PER_WEEK : weeklyWindowSeconds;
    }

    function check(PackedUserOperation calldata userOp) external view override returns (uint256 validationData) {
        if (userOp.sender != account) return 1;

        PaymentDecoder.PaymentInfo memory info = PaymentDecoder.decode(userOp.callData);

        if (info.totalAmount == 0) return 0;

        uint256 _spentDaily = spentDaily;
        uint256 _spentWeekly = spentWeekly;
        uint256 _spentInTask = spentInTask;
        uint256 _dailyWindowStart = dailyWindowStart;
        uint256 _weeklyWindowStart = weeklyWindowStart;
        uint256 _taskWindowStart = taskWindowStart;
        uint256 now_ = block.timestamp;
        uint256 dailyWindow = _effectiveDailyWindow();
        uint256 weeklyWindow = _effectiveWeeklyWindow();

        if (_dailyWindowStart == 0) _dailyWindowStart = now_;
        if (_weeklyWindowStart == 0) _weeklyWindowStart = now_;
        if (_taskWindowStart == 0) _taskWindowStart = now_;

        if (now_ >= _dailyWindowStart + dailyWindow) {
            _spentDaily = 0;
            _dailyWindowStart = now_;
        }
        if (now_ >= _weeklyWindowStart + weeklyWindow) {
            _spentWeekly = 0;
            _weeklyWindowStart = now_;
        }
        if (maxPerTask != 0 && taskWindowSeconds != 0 && now_ >= _taskWindowStart + taskWindowSeconds) {
            _spentInTask = 0;
            _taskWindowStart = now_;
        }

        if (maxPerTx != 0 && info.totalAmount > maxPerTx) return 1;
        if (maxDaily != 0 && _spentDaily + info.totalAmount > maxDaily) return 1;
        if (maxWeekly != 0 && _spentWeekly + info.totalAmount > maxWeekly) return 1;
        if (maxPerTask != 0 && taskWindowSeconds != 0 && _spentInTask + info.totalAmount > maxPerTask) return 1;

        return 0;
    }

    function checkPolicy(uint256 amount, address) external view override returns (bool) {
        if (amount == 0) return true;

        uint256 _spentDaily = spentDaily;
        uint256 _spentWeekly = spentWeekly;
        uint256 _spentInTask = spentInTask;
        uint256 _dailyWindowStart = dailyWindowStart;
        uint256 _weeklyWindowStart = weeklyWindowStart;
        uint256 _taskWindowStart = taskWindowStart;
        uint256 now_ = block.timestamp;
        uint256 dailyWindow = _effectiveDailyWindow();
        uint256 weeklyWindow = _effectiveWeeklyWindow();

        if (_dailyWindowStart == 0) _dailyWindowStart = now_;
        if (_weeklyWindowStart == 0) _weeklyWindowStart = now_;
        if (_taskWindowStart == 0) _taskWindowStart = now_;

        if (now_ >= _dailyWindowStart + dailyWindow) _spentDaily = 0;
        if (now_ >= _weeklyWindowStart + weeklyWindow) _spentWeekly = 0;
        if (maxPerTask != 0 && taskWindowSeconds != 0 && now_ >= _taskWindowStart + taskWindowSeconds) {
            _spentInTask = 0;
        }

        if (maxPerTx != 0 && amount > maxPerTx) return false;
        if (maxDaily != 0 && _spentDaily + amount > maxDaily) return false;
        if (maxWeekly != 0 && _spentWeekly + amount > maxWeekly) return false;
        if (maxPerTask != 0 && taskWindowSeconds != 0 && _spentInTask + amount > maxPerTask) return false;

        return true;
    }

    /**
     * @notice Called by AEPAccount after successful execution to update spend tracking.
     * @param callData The execute/executeBatch calldata (from msg.data).
     */
    function recordSpend(bytes calldata callData) external onlyAccount {
        PaymentDecoder.PaymentInfo memory info = PaymentDecoder.decode(callData);
        if (info.totalAmount == 0) return;

        uint256 now_ = block.timestamp;
        uint256 dailyWindow = _effectiveDailyWindow();
        uint256 weeklyWindow = _effectiveWeeklyWindow();

        if (dailyWindowStart == 0) dailyWindowStart = now_;
        if (weeklyWindowStart == 0) weeklyWindowStart = now_;
        if (taskWindowStart == 0) taskWindowStart = now_;

        if (now_ >= dailyWindowStart + dailyWindow) {
            spentDaily = 0;
            dailyWindowStart = now_;
        }
        if (now_ >= weeklyWindowStart + weeklyWindow) {
            spentWeekly = 0;
            weeklyWindowStart = now_;
        }
        if (maxPerTask != 0 && taskWindowSeconds != 0 && now_ >= taskWindowStart + taskWindowSeconds) {
            spentInTask = 0;
            taskWindowStart = now_;
        }

        spentDaily += info.totalAmount;
        spentWeekly += info.totalAmount;
        if (maxPerTask != 0 && taskWindowSeconds != 0) spentInTask += info.totalAmount;
    }
}
