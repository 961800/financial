"""Main Streamlit Application: Bank Marketing Campaign Analysis Using Data Analytics & ML."""

import streamlit as st
from modules.campaign_analysis import render_performance_page
from modules.dashboard import render_dashboard_page
from modules.data_cleaning import render_cleaning_page
from modules.data_loader import load_uci_dataset, read_bank_csv, render_exploration_page
from modules.eda import render_eda_page
from modules.insights import render_insights_page
from modules.ml_pipeline import render_ml_page
from modules.prediction import render_prediction_page
from modules.report_generator import render_report_page

st.set_page_config(
    page_title="Bank Marketing Campaign Analysis",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .stApp { background-color: #F8FAFC; }
    section[data-testid="stSidebar"] { background-color: #0A192F; color: #FFFFFF; }
    section[data-testid="stSidebar"] label, section[data-testid="stSidebar"] p, section[data-testid="stSidebar"] h1, section[data-testid="stSidebar"] h2 {
        color: #E2E8F0 !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


def main():
    st.sidebar.title("Bank Analytics & ML")
    st.sidebar.caption("Term Deposit Campaign Intelligence")

    source_choice = st.sidebar.radio(
        "Dataset Source",
        ["UCI Bundled Sample (4,521)", "Download UCI Full (45,211)", "Upload Custom CSV"],
    )

    if source_choice == "Upload Custom CSV":
        uploaded = st.sidebar.file_uploader("Upload Bank CSV", type=["csv"])
        if uploaded is not None:
            df, target = read_bank_csv(uploaded.getvalue())
            st.session_state["raw_df"] = df
            st.session_state["active_df"] = df
            st.sidebar.success(f"Loaded {len(df):,} rows (target: {target})")
    elif source_choice == "Download UCI Full (45,211)":
        if st.sidebar.button("Fetch UCI Full Dataset"):
            with st.spinner("Downloading from UCI ML Repository..."):
                df, _ = load_uci_dataset("full")
                st.session_state["raw_df"] = df
                st.session_state["active_df"] = df

    if "raw_df" not in st.session_state:
        try:
            df, _ = load_uci_dataset("local")
        except Exception:
            df, _ = load_uci_dataset("sample")
        st.session_state["raw_df"] = df
        st.session_state["active_df"] = df

    raw_df = st.session_state["raw_df"]
    active_df = st.session_state["active_df"]

    page = st.sidebar.radio(
        "Navigation",
        [
            "1. Home",
            "2. Dataset Exploration",
            "3. Data Cleaning",
            "4. Exploratory Data Analysis",
            "5. Campaign Performance",
            "6. Machine Learning Prediction",
            "7. Customer Prediction Form",
            "8. Interactive Dashboard",
            "9. Business Insights",
            "10. Project Report",
        ],
    )

    if page == "1. Home":
        st.title("Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning")
        st.write(
            "An end-to-end banking intelligence platform analyzing customer demographics, outreach channels, "
            "seasonal trends, and term deposit subscription propensity using Scikit-learn."
        )
        c1, c2, c3 = st.columns(3)
        c1.metric("Active Records", f"{len(active_df):,}")
        c2.metric("Features", f"{active_df.shape[1]}")
        c3.metric("Baseline Subscription Rate", f"{(active_df['y'] == 'yes').mean() * 100:.2f}%")

        st.subheader("Project Objectives")
        st.markdown(
            "- Understand customer behavior and demographic drivers of term deposit adoption.\n"
            "- Clean and preprocess banking outreach data with zero target leakage.\n"
            "- Evaluate campaign conversion across jobs, age cohorts, education, contact channels, and months.\n"
            "- Train and compare Logistic Regression, Decision Tree, and Random Forest models.\n"
            "- Predict individual customer subscription probability and export an academic report."
        )
    elif page == "2. Dataset Exploration":
        render_exploration_page(active_df)
    elif page == "3. Data Cleaning":
        render_cleaning_page(raw_df)
    elif page == "4. Exploratory Data Analysis":
        render_eda_page(active_df)
    elif page == "5. Campaign Performance":
        render_performance_page(active_df)
    elif page == "6. Machine Learning Prediction":
        render_ml_page(active_df)
    elif page == "7. Customer Prediction Form":
        render_prediction_page(active_df)
    elif page == "8. Interactive Dashboard":
        render_dashboard_page(active_df)
    elif page == "9. Business Insights":
        render_insights_page(active_df)
    elif page == "10. Project Report":
        render_report_page(active_df)


if __name__ == "__main__":
    main()
