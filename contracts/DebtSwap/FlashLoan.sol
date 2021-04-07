// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Pair } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import { UniswapV2Library } from "../libraries/UniswapV2Library.sol";
import { ILendingPoolAddressesProvider } from "../interfaces/ILendingPoolAddressesProvider.sol";
import { ILendingPool } from "../interfaces/ILendingPool.sol";
import { IFlashLoanReceiver } from "../interfaces/IFlashLoanReceiver.sol";

/// @author Ganesh Gautham Elango
/// @title Flash loan receiver
contract FlashLoan is IFlashLoanReceiver {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @dev Aave lending pool addresses provider
    ILendingPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
    /// @dev Aave lending pool address
    ILendingPool public immutable override LENDING_POOL;
    /// @dev Uniswap V2 factory address
    address public immutable uniswapFactory;

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    constructor(address provider, address _uniswapFactory) {
        ADDRESSES_PROVIDER = ILendingPoolAddressesProvider(provider);
        LENDING_POOL = ILendingPool(ILendingPoolAddressesProvider(provider).getLendingPool());
        uniswapFactory = _uniswapFactory;
    }

    /// @dev Aave flash loan callback. Receives the token amounts and gives it back + premiums.
    /// @param assets The addresses of the assets being flash-borrowed
    /// @param amounts The amounts amounts being flash-borrowed
    /// @param premiums Fees to be paid for each asset
    /// @param initiator The msg.sender to Aave
    /// @param params Arbitrary packed params to pass to the receiver as extra information
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(LENDING_POOL), "DebtSwap: Callback only from LENDING_POOL");
        require(initiator == address(this), "DebtSwap: FlashLoan only from this contract");
        (
            address[] memory path,
            uint256[] memory amountsIn,
            address onBehalfOf,
            uint256 repayMode,
            uint256 amountToRepay
        ) = abi.decode(params, (address[], uint256[], address, uint256, uint256));
        IERC20(path[0]).safeTransfer(
            address(UniswapV2Library.pairFor(uniswapFactory, path[0], path[1])),
            amounts[0]
        );
        _swap(amountsIn, path, address(this));
        IERC20(path[path.length - 1]).safeApprove(address(LENDING_POOL), amountToRepay);
        LENDING_POOL.repay(path[path.length - 1], amountToRepay, repayMode, onBehalfOf);
        return true;
    }

    function _swap(
        uint256[] memory amounts,
        address[] memory path,
        address _to
    ) internal virtual {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, ) = UniswapV2Library.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(uniswapFactory, output, path[i + 2]) : _to;
            IUniswapV2Pair(UniswapV2Library.pairFor(uniswapFactory, input, output)).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
        }
    }
}
