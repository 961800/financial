"""Module 6: Leakage-Free Scikit-learn ML Pipelines, Evaluation & Model Saving."""

import os
import joblib
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "best_bank_model.joblib")


def train_and_evaluate_models(
    df: pd.DataFrame,
    test_size: float = 0.2,
    handle_imbalance: bool = True,
    exclude_duration: bool = True,
) -> dict:
    """Train Logistic Regression, Decision Tree, and Random Forest via leakage-free Pipelines."""
    feature_df = df.drop(columns=["y"]).copy()
    if exclude_duration and "duration" in feature_df.columns:
        feature_df = feature_df.drop(columns=["duration"])

    y = (df["y"] == "yes").astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        feature_df, y, test_size=test_size, random_state=42, stratify=y
    )

    num_cols = feature_df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = [c for c in feature_df.columns if c not in num_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
        ]
    )

    cw = "balanced" if handle_imbalance else None
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, class_weight=cw, random_state=42),
        "Decision Tree": DecisionTreeClassifier(max_depth=7, min_samples_leaf=10, class_weight=cw, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=150, max_depth=12, min_samples_leaf=5, class_weight=cw, random_state=42, n_jobs=-1),
    }

    results = []
    pipelines = {}
    roc_traces = {}
    cms = {}

    for name, clf in models.items():
        pipe = Pipeline([("prep", preprocessor), ("clf", clf)])
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        y_prob = pipe.predict_proba(X_test)[:, 1]
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        auc_val = roc_auc_score(y_test, y_prob)

        results.append({
            "Model": name,
            "Accuracy (%)": round(accuracy_score(y_test, y_pred) * 100, 2),
            "Precision (%)": round(precision_score(y_test, y_pred, zero_division=0) * 100, 2),
            "Recall (%)": round(recall_score(y_test, y_pred, zero_division=0) * 100, 2),
            "F1-Score (%)": round(f1_score(y_test, y_pred, zero_division=0) * 100, 2),
            "ROC-AUC": round(auc_val, 4),
        })
        pipelines[name] = pipe
        roc_traces[name] = (fpr, tpr, auc_val)
        cms[name] = confusion_matrix(y_test, y_pred)

    comp_df = pd.DataFrame(results).sort_values("ROC-AUC", ascending=False).reset_index(drop=True)
    best_name = comp_df.iloc[0]["Model"]
    best_pipe = pipelines[best_name]
    joblib.dump({"pipeline": best_pipe, "model_name": best_name, "exclude_duration": exclude_duration, "columns": feature_df.columns.tolist()}, MODEL_PATH)

    return {
        "comparison": comp_df,
        "best_name": best_name,
        "best_pipeline": best_pipe,
        "roc_traces": roc_traces,
        "confusion_matrices": cms,
        "feature_columns": feature_df.columns.tolist(),
    }


def render_ml_page(df: pd.DataFrame) -> None:
    """Module 6 UI: Model Training, Evaluation, ROC-AUC, and Persistence."""
    st.header("Machine Learning Model Training & Comparison")
    st.info("Note: Machine learning predictions represent probabilistic estimates learned from historical campaign outcomes, not guarantees of subscription.")

    c1, c2, c3 = st.columns(3)
    test_size = c1.slider("Test Split Ratio", 0.15, 0.35, 0.20, 0.05)
    handle_imbalance = c2.checkbox("Handle Class Imbalance (class_weight='balanced')", value=True)
    exclude_duration = c3.checkbox("Exclude 'duration' (Prevent Post-Call Data Leakage)", value=True)

    if st.button("Train & Compare All 3 Models", type="primary"):
        with st.spinner("Fitting preprocessing pipelines and training models..."):
            res = train_and_evaluate_models(df, test_size, handle_imbalance, exclude_duration)
            st.session_state["ml_results"] = res
            st.success(f"Best performing model saved: {res['best_name']}")

    if "ml_results" not in st.session_state:
        st.warning("Click 'Train & Compare All 3 Models' above to evaluate Logistic Regression, Decision Tree, and Random Forest.")
        return

    res = st.session_state["ml_results"]
    st.subheader("Model Performance Comparison")
    st.dataframe(res["comparison"], use_container_width=True)

    fig_roc = go.Figure()
    for name, (fpr, tpr, auc_val) in res["roc_traces"].items():
        fig_roc.add_trace(go.Scatter(x=fpr, y=tpr, mode="lines", name=f"{name} (AUC = {auc_val:.4f})"))
    fig_roc.add_trace(go.Scatter(x=[0, 1], y=[0, 1], mode="lines", line=dict(dash="dash", color="gray"), name="Random Baseline"))
    fig_roc.update_layout(title="ROC Curve Comparison", xaxis_title="False Positive Rate", yaxis_title="True Positive Rate")
    st.plotly_chart(fig_roc, use_container_width=True)

    st.subheader("Confusion Matrices")
    cm_cols = st.columns(3)
    for idx, (name, cm) in enumerate(res["confusion_matrices"].items()):
        with cm_cols[idx]:
            st.write(f"**{name}**")
            st.dataframe(pd.DataFrame(cm, index=["Actual No", "Actual Yes"], columns=["Pred No", "Pred Yes"]))
