"""Module 10: Academic Project Report Generator (Markdown & HTML Downloads)."""

import pandas as pd
import streamlit as st
from modules.insights import generate_insights_summary


def build_markdown_report(df: pd.DataFrame, ml_comp: pd.DataFrame = None) -> str:
    """Generate a complete college mini-project report in Markdown format."""
    info = generate_insights_summary(df)
    total = len(df)
    subs = int((df["y"] == "yes").sum())
    ml_section = ml_comp.to_markdown(index=False) if ml_comp is not None else "Run ML Training module to populate model metrics."

    return f"""# Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning

## 1. Abstract
This project analyzes direct telemarketing campaign records ({total:,} customer interactions) from the banking sector to uncover behavioral drivers of term deposit subscriptions and build leakage-free Machine Learning classifiers capable of predicting customer propensity.

## 2. Introduction
Retail banks rely on outbound marketing campaigns to mobilize term deposits. Untargeted mass dialing incurs high operational cost and customer fatigue. Data analytics and predictive modeling allow institutions to optimize outreach targeting.

## 3. Problem Statement
With a baseline subscription rate of {info['baseline']:.2f}% ({subs:,} subscriptions out of {total:,} contacts), identifying likely subscribers prior to dialing is essential to improve ROI and conversion efficiency.

## 4. Objectives
- Explore and clean raw bank marketing campaign records.
- Conduct univariate and bivariate exploratory data analysis (EDA).
- Quantify campaign conversion rates across occupations, age cohorts, education, channels, and months.
- Train and compare Logistic Regression, Decision Tree, and Random Forest models using balanced class weights.
- Provide real-time customer propensity scoring and actionable banking recommendations.

## 5. Literature / Background
Prior studies on the UCI Portuguese Bank Marketing dataset (Moro et al., 2014) demonstrate that ensemble classifiers combined with careful handling of class imbalance and post-call leakage features (`duration`) provide reliable pre-call lead scoring.

## 6. Dataset Description
- **Records Analyzed**: {total:,}
- **Features**: Demographic (`age`, `job`, `marital`, `education`), Financial (`default`, `balance`, `housing`, `loan`), Campaign (`contact`, `day`, `month`, `duration`, `campaign`, `pdays`, `previous`, `poutcome`), Target (`y`: yes/no).

## 7. Methodology
1. Data Ingestion & Target Auto-Detection (`y`)
2. Data Cleaning (Mode imputation, deduplication, IQR outlier capping)
3. Exploratory Data Analysis & Segment Conversion Profiling
4. Stratified Train/Test Split & Scikit-learn ColumnTransformer Pipeline
5. Model Comparison (ROC-AUC, F1, Precision, Recall) & Model Persistence

## 8. Algorithms Used
- **Logistic Regression** (L2-regularized linear probabilistic classifier)
- **Decision Tree Classifier** (CART Gini impurity splitting)
- **Random Forest Classifier** (Bagged ensemble of decorrelated decision trees)

## 9. Results and Discussion
{ml_section}

## 10. Conclusion
Data-driven segmentation combined with class-weighted machine learning substantially improves lead prioritization over random outreach.

## 11. Future Enhancements
- Gradient Boosted Trees (XGBoost / LightGBM) and SHAP value explainability.
- CRM real-time API integration and automated A/B campaign uplift testing.

## 12. References
1. Moro, S., Cortez, P., & Rita, P. (2014). *A Data-Driven Approach to Predict the Success of Bank Telemarketing*. Decision Support Systems, Elsevier.
2. UCI Machine Learning Repository: Bank Marketing Dataset (ID 222).
3. Pedregosa et al. (2011). *Scikit-learn: Machine Learning in Python*. JMLR.
"""


def render_report_page(df: pd.DataFrame) -> None:
    """Render Project Report preview and download buttons."""
    st.header("Academic Project Report Generator")
    ml_res = st.session_state.get("ml_results")
    comp_df = ml_res["comparison"] if ml_res else None
    md_report = build_markdown_report(df, comp_df)

    st.download_button(
        "Download Project Report (Markdown .md)",
        md_report.encode("utf-8"),
        file_name="bank_marketing_project_report.md",
        mime="text/markdown",
        type="primary",
    )
    st.markdown(md_report)
