"""Module 7: Interactive Customer Subscription Prediction Form."""

import os
import joblib
import pandas as pd
import streamlit as st
from modules.ml_pipeline import MODEL_PATH


def render_prediction_page(df: pd.DataFrame) -> None:
    """Render interactive prediction form and output subscription probability."""
    st.header("Customer Subscription Prediction")

    model_bundle = None
    if "ml_results" in st.session_state:
        res = st.session_state["ml_results"]
        model_bundle = {
            "pipeline": res["best_pipeline"],
            "model_name": res["best_name"],
            "columns": res["feature_columns"],
        }
    elif os.path.exists(MODEL_PATH):
        model_bundle = joblib.load(MODEL_PATH)

    if model_bundle is None:
        st.warning("Please train the models in the 'Machine Learning' section first before running individual customer predictions.")
        return

    st.write(f"Active Predictor: **{model_bundle['model_name']}**")

    with st.form("customer_prediction_form"):
        c1, c2, c3 = st.columns(3)
        age = c1.number_input("Age", min_value=18, max_value=95, value=36)
        job = c2.selectbox("Job", sorted(df["job"].dropna().unique().tolist()))
        marital = c3.selectbox("Marital Status", sorted(df["marital"].dropna().unique().tolist()))

        c4, c5, c6 = st.columns(3)
        education = c4.selectbox("Education", sorted(df["education"].dropna().unique().tolist()))
        default_status = c5.selectbox("Credit Default", ["no", "yes"])
        housing = c6.selectbox("Housing Loan", ["yes", "no"])

        c7, c8, c9 = st.columns(3)
        loan = c7.selectbox("Personal Loan", ["no", "yes"])
        contact = c8.selectbox("Contact Type", sorted(df["contact"].dropna().unique().tolist()))
        month = c9.selectbox("Contact Month", ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])

        c10, c11, c12 = st.columns(3)
        campaign = c10.number_input("Campaign Contacts", min_value=1, max_value=50, value=2)
        poutcome = c11.selectbox("Previous Campaign Outcome", sorted(df["poutcome"].dropna().unique().tolist()))
        balance = c12.number_input("Account Balance", value=1200)

        submitted = st.form_submit_button("Predict Subscription Likelihood", type="primary")

    if submitted:
        row_data = {
            "age": age, "job": job, "marital": marital, "education": education,
            "default": default_status, "balance": balance, "housing": housing,
            "loan": loan, "contact": contact, "day": 15, "month": month,
            "duration": 220, "campaign": campaign,
            "pdays": 90 if poutcome == "success" else -1,
            "previous": 1 if poutcome != "unknown" else 0,
            "poutcome": poutcome,
        }
        input_df = pd.DataFrame([{k: row_data.get(k) for k in model_bundle["columns"]}])
        prob = float(model_bundle["pipeline"].predict_proba(input_df)[0][1])
        pred = prob >= 0.5

        st.subheader("Prediction Result")
        r1, r2 = st.columns(2)
        r1.metric("Predicted Outcome", "Likely to Subscribe (Yes)" if pred else "Unlikely to Subscribe (No)")
        r2.metric("Subscription Probability", f"{prob * 100:.1f}%")
        st.progress(min(1.0, max(0.0, prob)))
        st.caption("Disclaimer: Predicted probabilities are statistical estimates based on historical campaign data, not guarantees.")
