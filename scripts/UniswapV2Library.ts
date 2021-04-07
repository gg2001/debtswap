import { BigNumber } from "ethers";
import { IUniswapV2Factory, IUniswapV2Pair } from "../typechain";

export function sortTokens(tokenA: string, tokenB: string)

export function pairFor(factory: IUniswapV2Factory, tokenA: string, tokenB: string): string {
  
}

export function getReserves(factory: IUniswapV2Factory, tokenA: string, tokenB: string): [BigNumber, BigNumber] {

}

export function getAmountIn(amountOut: BigNumber, reserveIn: BigNumber, reserveOut: BigNumber): BigNumber {

}

export function getAmountsIn(factory: IUniswapV2Factory, amountOut: BigNumber, path: string[]): BigNumber[] {
  const amounts: BigNumber[] = new Array<BigNumber>(path.length);
  amounts[amounts.length - 1] = amountOut;
  for (let i = (path.length - 1); i > 0; i--) {

  }
  return amounts;
}