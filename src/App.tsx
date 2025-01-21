import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bitcoin } from 'lucide-react';
import PriceChart from './components/PriceChart';
import { KlineData, BreakoutSignal } from './types/chart';
import { detectBreakout } from './utils/technical';

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString(navigator.language, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
};

type Timeframe = '4h' | '8h' | '12h' | '1d';

function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>('4h');
  const [data, setData] = useState<KlineData[]>([]);
  const [signals, setSignals] = useState<BreakoutSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const get24HourPrices = (data: KlineData[]) => {
    if (data.length === 0) return { high: 0, low: 0 };

    let candlesToCheck = 24;
    switch (timeframe) {
      case '4h':
        candlesToCheck = 6;
        break;
      case '8h':
        candlesToCheck = 3;
        break;
      case '12h':
        candlesToCheck = 2;
        break;
      case '1d':
        candlesToCheck = 1;
        break;
    }

    const last24HoursData = data.slice(-candlesToCheck);
    const high = Math.max(...last24HoursData.map(d => d.high));
    const low = Math.min(...last24HoursData.map(d => d.low));
    
    return { high, low };
  };

  const calculateSupportResistance = (data: KlineData[]) => {
    if (data.length < 10) return { support: 0, resistance: 0 };

    const recentData = data.slice(-10);
    const pivot = (recentData[0].high + recentData[0].low + recentData[0].close) / 3;
    const resistance = (2 * pivot) - recentData[0].low;
    const support = (2 * pivot) - recentData[0].high;

    return {
      support: Math.min(support, ...recentData.map(d => d.low)),
      resistance: Math.max(resistance, ...recentData.map(d => d.high))
    };
  };

  const fetchData = async (retryCount = 0) => {
    try {
      setLoading(true);
      const interval = timeframe === '1d' ? '1d' : timeframe;
      const response = await axios.get(
        `https://api.binance.us/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=100`,
        {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const formattedData: KlineData[] = response.data.map((d: any) => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));

      setData(formattedData);
      const newSignals = detectBreakout(formattedData);
      setSignals(newSignals);
      setError(null);
      setLastUpdate(Date.now());
    } catch (err) {
      if (retryCount < 3 && axios.isAxiosError(err) && !err.response) {
        console.warn(`Retry attempt ${retryCount + 1} of 3`);
        setTimeout(() => fetchData(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price data';
      setError(`${errorMessage}. Please try again later.`);
      console.error('Error fetching data:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const resistanceSignals = signals
    .filter(signal => signal.type === 'resistance')
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);

  const supportSignals = signals
    .filter(signal => signal.type === 'support')
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Bitcoin className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold">Bitcoin Breakout Tracker</h1>
          </div>
          <div className="flex gap-4">
            {(['4h', '8h', '12h', '1d'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 rounded ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-center py-20">Loading...</div>}
        {error && (
          <div className="text-red-500 text-center py-20">{error}</div>
        )}
        {!loading && !error && (
          <div className="bg-gray-800 rounded-lg p-6">
            <PriceChart
              data={data}
              signals={signals}
              timeframe={timeframe}
            />
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-green-400">
                  Resistance Breakouts
                </h3>
                <ul className="space-y-2">
                  {resistanceSignals.map((signal, idx) => (
                    <li key={idx} className="flex flex-col text-green-400">
                      <div className="flex items-center justify-between">
                        <span>
                          Resistance
                          {signal.confirmed ? ' (Confirmed)' : ''}
                        </span>
                        <span>${signal.price.toFixed(2)}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {formatTimestamp(signal.time)}
                      </span>
                    </li>
                  ))}
                  {resistanceSignals.length === 0 && (
                    <li className="text-gray-400 text-sm">No resistance breakouts detected</li>
                  )}
                </ul>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2 text-red-400">
                  Support Breakdowns
                </h3>
                <ul className="space-y-2">
                  {supportSignals.map((signal, idx) => (
                    <li key={idx} className="flex flex-col text-red-400">
                      <div className="flex items-center justify-between">
                        <span>
                          Support
                          {signal.confirmed ? ' (Confirmed)' : ''}
                        </span>
                        <span>${signal.price.toFixed(2)}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {formatTimestamp(signal.time)}
                      </span>
                    </li>
                  ))}
                  {supportSignals.length === 0 && (
                    <li className="text-gray-400 text-sm">No support breakdowns detected</li>
                  )}
                </ul>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Current Price</h3>
                <div className="text-3xl font-bold">
                  ${data[data.length - 1]?.close.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Last updated: {formatTimestamp(lastUpdate / 1000)}
                </div>
                <div className="mt-4 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>24h High:</span>
                    <span>${get24HourPrices(data).high.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>24h Low:</span>
                    <span>${get24HourPrices(data).low.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-600">
                    <div className="flex justify-between text-green-400">
                      <span>Resistance:</span>
                      <span>${calculateSupportResistance(data).resistance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>Support:</span>
                      <span>${calculateSupportResistance(data).support.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
