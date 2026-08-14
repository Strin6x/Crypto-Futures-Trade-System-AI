"""Local, dependency-free paper-trade review engine. Advisory only."""
import json
import sys

MINIMUM_CLOSED_TRADES = 30

def main():
    payload = json.load(sys.stdin)
    trades = [row for row in payload.get("trades", []) if row.get("realizedPnl") is not None]
    wins = [row for row in trades if float(row.get("realizedPnl", 0)) > 0]
    losses = [row for row in trades if float(row.get("realizedPnl", 0)) < 0]
    report = {
        "mode": "advisory_only", "closedTrades": len(trades), "wins": len(wins), "losses": len(losses),
        "winRatePct": round(len(wins) / len(trades) * 100, 2) if trades else None,
        "totalRealizedPnl": round(sum(float(row.get("realizedPnl", 0)) for row in trades), 8),
        "safety": ["AI cannot place orders, change settings, or override risk controls."],
        "recommendations": []
    }
    if len(trades) < MINIMUM_CLOSED_TRADES:
        report["status"] = "insufficient_data"
        report["recommendations"].append(f"Collect at least {MINIMUM_CLOSED_TRADES} closed paper trades before considering a configuration change.")
    else:
        report["status"] = "ready_for_review"
        report["recommendations"].append("Backtest and paper-validate any suggestion before manually changing defaults.")
    print(json.dumps(report))

if __name__ == "__main__":
    main()
