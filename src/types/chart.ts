/**
 * Represents a single candlestick data point from the Binance API
 */
export interface KlineData {
  time: number;      // Unix timestamp in seconds
  open: number;      // Opening price
  high: number;      // Highest price during the period
  close: number;     // Closing price
  low: number;       // Lowest price during the period
  volume: number;    // Trading volume
}

/**
 * Represents a breakout signal detected in the price action
 */
export interface BreakoutSignal {
  time: number;                      // Unix timestamp in seconds
  type: 'support' | 'resistance';    // Type of breakout
  price: number;                     // Price at which the breakout occurred
  confirmed: boolean;                // Whether the breakout is confirmed by closing beyond the level
}
