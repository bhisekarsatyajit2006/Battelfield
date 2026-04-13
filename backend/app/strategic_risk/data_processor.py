# backend/app/strategic_risk/data_processor.py

import pandas as pd


def preprocess_conflict_data(df: pd.DataFrame):
    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce")

    grouped = df.groupby("country").agg(
        {
            "fatalities": "sum",
            "event_type": "count"
        }
    ).rename(columns={"event_type": "event_count"})

    max_fatalities = grouped["fatalities"].max() + 1e-6
    max_events = grouped["event_count"].max() + 1e-6

    grouped["conflict_intensity"] = grouped["fatalities"] / max_fatalities
    grouped["political_tension"] = grouped["event_count"] / max_events

    grouped["military_spending"] = grouped["conflict_intensity"] * 0.8
    grouped["border_incidents"] = grouped["event_count"]

    def label_risk(row):
        score = (
            0.5 * row["conflict_intensity"] +
            0.3 * row["political_tension"] +
            0.2 * (row["border_incidents"] / max_events)
        )

        if score > 0.6:
            return "HIGH"
        elif score > 0.3:
            return "MEDIUM"
        else:
            return "LOW"

    grouped["risk_level"] = grouped.apply(label_risk, axis=1)

    print("\n=== CLASS DISTRIBUTION ===")
    print(grouped["risk_level"].value_counts())

    return grouped.reset_index()