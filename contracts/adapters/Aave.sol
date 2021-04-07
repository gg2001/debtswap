// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { IUniswapV2Factory } from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import { IUniswapV2Router02 } from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { ILendingPoolAddressesProvider } from "../interfaces/ILendingPoolAddressesProvider.sol";
import { ILendingPool } from "../interfaces/ILendingPool.sol";
import { IFlashLoanReceiver } from "../interfaces/IFlashLoanReceiver.sol";

/// @author Ganesh Gautham Elango
/// @title Aave flash loan receiver
abstract contract Aave is IFlashLoanReceiver {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /// @dev Aave lending pool addresses provider
    ILendingPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;
    /// @dev Aave lending pool address
    ILendingPool public immutable override LENDING_POOL;
    /// @dev Uniswap V2 factory address
    IUniswapV2Factory public immutable uniswapFactory;
    /// @dev Uniswap V2 router 02 address
    IUniswapV2Router02 public immutable uniswapV2Router02;

    /// @param provider Aave lending pool addresses provider
    /// @param _uniswapFactory Uniswap V2 factory address
    /// @param _uniswapV2Router02 Uniswap V2 router 02 address
    constructor(
        address provider,
        address _uniswapFactory,
        address _uniswapV2Router02
    ) {
        ADDRESSES_PROVIDER = ILendingPoolAddressesProvider(provider);
        LENDING_POOL = ILendingPool(ILendingPoolAddressesProvider(provider).getLendingPool());
        uniswapFactory = IUniswapV2Factory(_uniswapFactory);
        uniswapV2Router02 = IUniswapV2Router02(_uniswapV2Router02);
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
        require(msg.sender == address(LENDING_POOL), "Callback only from LENDING_POOL");
        require(initiator == address(this), "FlashLoan only from this contract");
        (address[] memory path, address onBehalfOf, uint256 repayMode, uint256 amountToRepay) =
            abi.decode(params, (address[], address, uint256, uint256));
        IERC20(path[0]).safeApprove(address(uniswapV2Router02), amountToRepay);
        uniswapV2Router02.swapTokensForExactTokens(amountToRepay, amounts[0], path, address(this), block.timestamp);
        IERC20(path[path.length - 1]).safeApprove(address(LENDING_POOL), amountToRepay);
        LENDING_POOL.repay(path[path.length - 1], amountToRepay, repayMode, onBehalfOf);
        return true;
    }
}
