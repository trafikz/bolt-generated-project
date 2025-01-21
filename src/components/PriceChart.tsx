import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { KlineData, BreakoutSignal } from '../types/chart';

interface PriceChartProps {
  data: KlineData[];          // Candlestick data to display
  signals: BreakoutSignal[];  // Breakout signals to overlay
  timeframe: string;          // Current timeframe being displayed
}

/**
 * Component for rendering the price chart with breakout signals
 * Uses lightweight-charts library for rendering
 */
const PriceChart: React.FC<PriceChartProps> = ({ data, signals, timeframe }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize chart with dark theme
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 600,
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeries.setData(data);

    // Add markers for breakout signals
    const markers = signals.map(signal => ({
      time: signal.time,
      position: signal.type === 'resistance' ? 'belowBar' : 'aboveBar',
      color: signal.type === 'resistance' ? '#26a69a' : '#ef5350',
      shape: signal.confirmed ? 'arrowUp' : 'circle',
      text: `${signal.type.charAt(0).toUpperCase()}${signal.type.slice(1)} ${signal.confirmed ? '(Confirmed)' : ''}`
    }));

    candlestickSeries.setMarkers(markers);

    chartRef.current = chart;

    // Handle window resize events
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, signals]);

  return (
    <div className="w-full">
      <div className="text-xl font-bold mb-4">
        BTC/USDT {timeframe} Chart
      </div>
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};

export default PriceChart;
