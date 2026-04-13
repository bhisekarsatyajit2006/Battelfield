import xgboost as xgb
import numpy as np

# Dummy trained model (hackathon shortcut)
model = xgb.XGBClassifier()
model.fit(
    np.array([
        [2, 10, 1, 0.2],
        [7, 40, 3, 0.9],
        [2, 20, 2, 0.5]
    ]),
    [0, 2, 1]  # LOW, HIGH, MED
)


def predict_threat(features):
    pred = model.predict([features])[0]

    mapping = {
        0: "LOW",
        1: "MEDIUM",
        2: "HIGH"
    }

    return mapping[pred]