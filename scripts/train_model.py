"""Train GradientBoosting retry predictor and save to models/retry_model.pkl."""
import os
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import LabelEncoder
import joblib

CATEGORICALS = ["method", "error_reason", "card_network", "card_type", "card_issuer"]

FEATURES = ["hour_of_day", "day_of_week", "hours_since_failure", "method_enc",
            "international", "reason_enc", "amount_bucket",
            "card_network_enc", "card_type_enc", "card_issuer_enc", "is_payday"]

_ENC_NAME = {"method": "method_enc", "error_reason": "reason_enc",
             "card_network": "card_network_enc", "card_type": "card_type_enc",
             "card_issuer": "card_issuer_enc"}


def main():
    df = pd.read_csv("data/training.csv")

    encoders = {}
    for col in CATEGORICALS:
        enc = LabelEncoder().fit(df[col].astype(str))
        encoders[_ENC_NAME[col]] = enc
        df[_ENC_NAME[col]] = enc.transform(df[col].astype(str))

    X = df[FEATURES].values
    y = df["retry_success"].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    clf = GradientBoostingClassifier(random_state=42, n_estimators=100)
    clf.fit(X_train, y_train)

    acc = (clf.predict(X_test) == y_test).mean()
    auc = roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1])
    print(f"Accuracy: {acc:.3f}  ROC-AUC: {auc:.3f}")
    print("Feature importances:")
    for name, imp in sorted(zip(FEATURES, clf.feature_importances_), key=lambda x: -x[1]):
        print(f"  {name}: {imp:.4f}")

    os.makedirs("models", exist_ok=True)
    joblib.dump({"model": clf, "features": FEATURES, **encoders}, "models/retry_model.pkl")
    print("Saved -> models/retry_model.pkl")


if __name__ == "__main__":
    main()
