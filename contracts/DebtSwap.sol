// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { UniswapV2Library } from "./libraries/UniswapV2Library.sol";
import { ILendingPool } from "./interfaces/ILendingPool.sol";
import { Aave } from "./adapters/Aave.sol";

/// @author Ganesh Gautham Elango
/// @title DebtSwap contract for swapping your Aave debt
contract DebtSwap is Aave {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    /// @param _uniswapV2Router02 Uniswap V2 router 02 address
    constructor(
        address provider,
        address _uniswapFactory,
        address _uniswapV2Router02
    ) Aave(provider, _uniswapFactory, _uniswapV2Router02) {}

    /// @dev Swaps debt, must approveDelegation maxAmountIn of assets[0] before calling
    /// @param assets Must be length 1, [<the asset you are swapping to>]
    /// @param path Uniswap router path, path[0] == assets[0],
    ///             path[path.length - 1] == asset you are swapping from
    /// @param modes Mode of new debt, must be 1 (stable) or 2 (variable)
    /// @param repayAmount Amount of asset you are swapping from
    /// @param maxAmountIn Maximum amount you want to swap to
    /// @param repayMode Mode of debt you are swapping from, must be 1 (stable) or 2 (variable)
    /// @param debtTokenAddress Debt token address of asset you are swapping from
    ///                         (optional, should be passed when repayAmount = type(uint256).max)
    function swapDebt(
        address[] calldata assets,
        address[] calldata path,
        uint256[] calldata modes,
        uint256 repayAmount,
        uint256 maxAmountIn,
        uint256 repayMode,
        address debtTokenAddress
    ) external {
        uint256 amountToRepay = repayAmount;
        if (repayAmount == type(uint256).max) {
            repayAmount = IERC20(debtTokenAddress).balanceOf(msg.sender);
        }
        uint256[] memory amounts = new uint256[](1);
        // Stack too deep
        {
            uint256[] memory amountsIn = UniswapV2Library.getAmountsIn(address(uniswapFactory), amountToRepay, path);
            require(maxAmountIn >= amountsIn[0], "Exceeded slippage");
            amounts[0] = amountsIn[0];
        }
        bytes memory params = abi.encode(path, msg.sender, repayMode, amountToRepay);
        LENDING_POOL.flashLoan(
            address(this), // receiverAddress
            assets,
            amounts,
            modes,
            msg.sender, // onBehalfOf
            params,
            0 // referralCode
        );
    }
}
