"""Train GradientBoosting retry predictor and save to models/retry_model.pkl."""
import os
import pandas as pd
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import LabelEncoder
import joblib

df = pd.read_csv("data/training.csv")

# Encode categoricals
method_enc = LabelEncoder().fit(df["method"])
reason_enc = LabelEncoder().fit(df["error_reason"])
df["method_enc"] = method_enc.transform(df["method"])
df["reason_enc"] = reason_enc.transform(df["error_reason"])

FEATURES = ["hour_of_day", "day_of_week", "method_enc", "international",
            "reason_enc", "amount_bucket"]

X = df[FEATURES].values
y = df["retry_success"].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

clf = GradientBoostingClassifier(random_state=42, n_estimators=100)
clf.fit(X_train, y_train)

acc = (clf.predict(X_test) == y_test).mean()
auc = roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1])
print(f"Accuracy: {acc:.3f}  ROC-AUC: {auc:.3f}")
print("Feature importances:")
for name, imp in zip(FEATURES, clf.feature_importances_):
    print(f"  {name}: {imp:.4f}")

os.makedirs("models", exist_ok=True)
joblib.dump({
    "model": clf,
    "features": FEATURES,
    "method_enc": method_enc,
    "reason_enc": reason_enc,
}, "models/retry_model.pkl")
print("Saved -> models/retry_model.pkl")
