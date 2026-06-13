# Stocks — Summary

## Purpose

The Summary page displays real-time stock price data with live streaming updates. It provides a quick overview of current prices, daily changes, and market status for monitored equities.

## Features

- **Live Price Table** — Real-time bid/ask prices with colour-coded changes
- **Streaming Updates** — Prices update automatically via WebSocket connection
- **Market Status Indicator** — Shows whether markets are open, closed, or in pre/post-market
- **Quick Filters** — Filter by exchange, sector, or watchlist
- **Price Alerts** — Visual highlighting when prices cross configured thresholds

## Access

Navigate to **Front Office → Stocks → Summary** or directly via `/front-office/stocks/summary`.

## Notes

- Data is streamed from a Web Worker to avoid blocking the UI
- Price updates are throttled to 1-second intervals for performance
- The toolbar shows the currently selected stock symbol
