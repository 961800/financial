"""Module 9: Automated Business Insights & Strategic Recommendations."""

import pandas as pd
import streamlit as st


def generate_insights_summary(df: pd.DataFrame) -> dict:
    """Compute data-driven campaign insights dynamically from the active DataFrame."""
    work = df.assign(s=(df["y"] == "yes").astype(int))
    baseline = round(work["s"].mean() * 100, 2)
    job_stats = work.groupby("job").agg(n=("y", "count"), rate=("s", "mean")).reset_index()
    job_stats = job_stats[job_stats["n"] >= max(10, len(df) * 0.005)].sort_values("rate", ascending=False)
    contact_stats = work.groupby("contact").agg(n=("y", "count"), rate=("s", "mean")).reset_index().sort_values("rate", ascending=False)
    month_stats = work.groupby("month").agg(n=("y", "count"), rate=("s", "mean")).reset_index()
    month_stats = month_stats[month_stats["n"] >= max(10, len(df) * 0.005)].sort_values("rate", ascending=False)
    return {
        "baseline": baseline,
        "best_job": job_stats.iloc[0].to_dict() if not job_stats.empty else {},
        "best_contact": contact_stats.iloc[0].to_dict() if not contact_stats.empty else {},
        "peak_months": month_stats.head(3).to_dict("records"),
    }


def render_insights_page(df: pd.DataFrame) -> None:
    """Render Business Insights & Recommendations UI."""
    st.header("Business Insights & Strategic Recommendations")
    info = generate_insights_summary(df)

    st.metric("Portfolio Baseline Conversion Rate", f"{info['baseline']:.2f}%")

    if info["best_job"]:
        st.subheader("1. Highest-Responding Customer Segment")
        st.write(f"**{info['best_job']['job'].title()}** customers lead conversion at **{info['best_job']['rate']*100:.2f}%** across {int(info['best_job']['n']):,} contacts.")

    if info["best_contact"]:
        st.subheader("2. Best-Performing Outreach Channel")
        st.write(f"**{info['best_contact']['contact'].title()}** delivers the strongest response rate at **{info['best_contact']['rate']*100:.2f}%**.")

    if info["peak_months"]:
        st.subheader("3. Peak Conversion Months")
        months_str = ", ".join([f"{m['month'].upper()} ({m['rate']*100:.1f}%)" for m in info["peak_months"]])
        st.write(f"Top seasonal efficiency months: **{months_str}**.")

    st.subheader("4. Actionable Recommendations for Bank Marketing Teams")
    recs = [
        "Score outbound lead lists using the trained ML propensity model before dialing to focus advisor capacity on top-decile prospects.",
        "Enforce a 3-attempt contact frequency cap per campaign cycle to eliminate diminishing returns and customer fatigue.",
        "Prioritize cellular outreach and enrich missing contact channel records.",
        "Align term deposit promotional launches with peak-conversion months and retarget prior campaign responders (poutcome = success).",
    ]
    for i, r in enumerate(recs, 1):
        st.write(f"**{i}.** {r}")
