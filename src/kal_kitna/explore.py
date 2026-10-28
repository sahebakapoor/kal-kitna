"""Quick look at the perishables data. Prints key facts and saves two charts."""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # save charts to files without opening windows
import matplotlib.pyplot as plt
import pandas as pd

FIGURES = Path("reports/figures")
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def main() -> None:
    df = pd.read_parquet("data/processed/perishables.parquet")
    print(f"Rows: {len(df):,}")
    print(f"Dates: {df['date'].min().date()} to {df['date'].max().date()}")
    print(f"Stores: {df['store_nbr'].nunique()}, families: {df['family'].nunique()}")

    print("\nShare of days with zero sales, by family:")
    zero_share = df.assign(zero=df["sales"].eq(0)).groupby("family")["zero"].mean()
    print(zero_share.sort_values(ascending=False).round(3))

    daily = df.groupby("date")["sales"].sum()
    print("\nFive biggest sales days:")
    print(daily.sort_values(ascending=False).head(5).round(0))

    FIGURES.mkdir(parents=True, exist_ok=True)
    ax = daily.plot(figsize=(12, 4), lw=0.6, title="Total perishable sales per day")
    ax.set_ylabel("Units sold")
    ax.figure.tight_layout()
    ax.figure.savefig(FIGURES / "daily_sales.png", dpi=120)
    plt.close(ax.figure)

    by_day = df.assign(day=df["date"].dt.day_name()).groupby("day")["sales"].mean().reindex(DAYS)
    ax = by_day.plot(kind="bar", figsize=(8, 4), title="Average sales by day of week")
    ax.set_ylabel("Average units per store-family-day")
    ax.figure.tight_layout()
    ax.figure.savefig(FIGURES / "sales_by_weekday.png", dpi=120)
    plt.close(ax.figure)
    print(f"\nCharts saved to {FIGURES}")


if __name__ == "__main__":
    main()