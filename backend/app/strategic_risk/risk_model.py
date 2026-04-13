# backend/app/strategic_risk/risk_model.py

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report

from collections import Counter

from app.strategic_risk.data_loader import load_from_url
from app.strategic_risk.data_processor import preprocess_conflict_data


class StrategicRiskModel:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced"
        )
        self.encoder = LabelEncoder()
        self.feature_names = [
            "conflict_intensity",
            "military_spending",
            "border_incidents",
            "political_tension",
        ]

    def preprocess(self, df: pd.DataFrame):
        X = df[self.feature_names]
        y = self.encoder.fit_transform(df["risk_level"])
        return X, y

    def balance_data(self, X, y):
        from imblearn.over_sampling import SMOTE, RandomOverSampler

        class_counts = Counter(y)
        min_samples = min(class_counts.values())

        print("\n=== ORIGINAL CLASS COUNTS ===")
        print(class_counts)

        # 🔥 Adaptive balancing
        if min_samples < 6:
            print("\n⚠️ Using RandomOverSampler (SMOTE not possible)")
            sampler = RandomOverSampler(random_state=42)
        else:
            print("\n🔥 Using SMOTE")
            sampler = SMOTE(
                k_neighbors=min(3, min_samples - 1),
                random_state=42
            )

        X_resampled, y_resampled = sampler.fit_resample(X, y)

        print("\n=== AFTER BALANCING ===")
        print(pd.Series(y_resampled).value_counts())

        return X_resampled, y_resampled

    def train(self, X, y):
        # 🔥 balance dataset safely
        X, y = self.balance_data(X, y)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        self.model.fit(X_train, y_train)

        preds = self.model.predict(X_test)

        print("\n=== MODEL PERFORMANCE ===")
        print(classification_report(y_test, preds, zero_division=0))

    def predict(self, features: list):
        df = pd.DataFrame([features], columns=self.feature_names)

        pred = self.model.predict(df)[0]
        proba = self.model.predict_proba(df)[0]

        return {
            "risk_level": self.encoder.inverse_transform([pred])[0],
            "confidence": round(float(max(proba)), 2)
        }


# 🔥 MAIN EXECUTION
if __name__ == "__main__":
    model = StrategicRiskModel()

    url = "https://raw.githubusercontent.com/plotly/datasets/master/2014_world_gdp_with_codes.csv"

    df = load_from_url(url)

    # simulate conflict dataset
    df = pd.DataFrame({
        "event_date": pd.date_range(start="2023-01-01", periods=len(df)),
        "country": df["COUNTRY"],
        "fatalities": (df["GDP (BILLIONS)"] * 0.01).astype(int),
        "event_type": ["Conflict"] * len(df)
    })

    processed = preprocess_conflict_data(df)

    X, y = model.preprocess(processed)
    model.train(X, y)

    # 🔥 test prediction
    test_input = [0.8, 0.7, 20, 0.75]

    result = model.predict(test_input)

    print("\n=== PREDICTION ===")
    print(result)