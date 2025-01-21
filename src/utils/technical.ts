import { KlineData, BreakoutSignal } from '../types/chart';

/**
 * Detects breakout signals in price action by analyzing support and resistance levels
 * 
 * @param candles - Array of candlestick data to analyze
 * @param period - Number of candles to look back for support/resistance (default: 20)
 * @returns Array of detected breakout signals
 */
export const detectBreakout = (
  candles: KlineData[],
  period: number = 20
): BreakoutSignal[] => {
  const signals: BreakoutSignal[] = [];
  
  // Need at least 'period' candles for analysis
  if (candles.length < period) return signals;

  for (let i = period; i < candles.length; i++) {
    const windowCandles = candles.slice(i - period, i);
    const currentCandle = candles[i];
    
    // Calculate support and resistance levels from the window
    const highs = windowCandles.map(c => c.high);
    const lows = windowCandles.map(c => c.low);
    
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    
    // Check for resistance breakout (0.2% threshold)
    if (currentCandle.close > resistance * 1.002) {
      signals.push({
        time: currentCandle.time,
        type: 'resistance',
        price: currentCandle.close,
        confirmed: currentCandle.close > resistance &&
                  currentCandle.open > resistance
      });
    }
    
    // Check for support breakdown (0.2% threshold)
    if (currentCandle.close < support * 0.998) {
      signals.push({
        time: currentCandle.time,
        type: 'support',
        price: currentCandle.close,
        confirmed: currentCandle.close < support &&
                  currentCandle.open < support
      });
    }
  }
  
  return signals;
};
