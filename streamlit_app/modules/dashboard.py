"""Module 8: Interactive Executive Dashboard with Multi-Select Filters & Heatmap."""

import pandas as pd
import plotly.express as px
import streamlit as st

MONTH_ORDER = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def render_dashboard_page(df: pd.DataFrame) -> None:
    """Render Interactive Dashboard with KPIs, Filters, Bar, Pie, Line, and Heatmap."""
    st.header("Executive Banking Campaign Dashboard")

    with st.expander("Interactive Segment Filters", expanded=True):
        f1, f2, f3, f4 = st.columns(4)
        months = f1.multiselect("Month", [m for m in MONTH_ORDER if m in df["month"].unique()])
        jobs = f2.multiselect("Occupation", sorted(df["job"].unique().tolist()))
        marital = f3.multiselect("Marital Status", sorted(df["marital"].unique().tolist()))
        contact = f4.multiselect("Contact Method", sorted(df["contact"].unique().tolist()))

    filtered = df.copy()
    if months:
        filtered = filtered[filtered["month"].isin(months)]
    if jobs:
        filtered = filtered[filtered["job"].isin(jobs)]
    if marital:
        filtered = filtered[filtered["marital"].isin(marital)]
    if contact:
        filtered = filtered[filtered["contact"].isin(contact)]

    total = len(filtered)
    subs = int((filtered["y"] == "yes").sum())
    rate = round((subs / total) * 100, 2) if total else 0.0
    job_rates = filtered.assign(s=(filtered["y"] == "yes").astype(int)).groupby("job").agg(n=("y", "count"), r=("s", "mean")).reset_index()
    best_seg = job_rates.sort_values("r", ascending=False).iloc[0] if not job_rates.empty else None

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Total Customers", f"{total:,}")
    k2.metric("Successful Subscriptions", f"{subs:,}")
    k3.metric("Conversion Rate", f"{rate:.2f}%")
    k4.metric("Best Segment (Job)", f"{best_seg['job']} ({best_seg['r']*100:.1f}%)" if best_seg is not None else "N/A")

    c1, c2 = st.columns(2)
    with c1:
        job_plot = job_rates.assign(conv_pct=(job_rates["r"] * 100).round(2)).sort_values("conv_pct", ascending=False)
        st.plotly_chart(px.bar(job_plot, x="job", y="conv_pct", title="Conversion Rate by Occupation (%)", color_discrete_sequence=["#0F294A"]), use_container_width=True)
    with c2:
        st.plotly_chart(px.pie(filtered, names="y", hole=0.5, title="Outcome Share (Subscribed vs Declined)", color="y", color_discrete_map={"yes": "#0284C7", "no": "#0F294A"}), use_container_width=True)

    mon_df = (
        filtered.assign(s=(filtered["y"] == "yes").astype(int))
        .groupby("month")
        .agg(conversion_pct=("s", lambda x: round(x.mean() * 100, 2)))
        .reset_index()
    )
    mon_df["month"] = pd.Categorical(mon_df["month"], categories=MONTH_ORDER, ordered=True)
    mon_df = mon_df.sort_values("month")
    st.plotly_chart(px.line(mon_df, x="month", y="conversion_pct", markers=True, title="Monthly Conversion Rate Trend (%)"), use_container_width=True)

    pivot = (
        filtered.assign(s=(filtered["y"] == "yes").astype(int))
        .pivot_table(index="job", columns="month", values="s", aggfunc="mean")
        .mul(100)
        .round(1)
    )
    cols_present = [m for m in MONTH_ORDER if m in pivot.columns]
    if not pivot.empty and cols_present:
        fig_hm = px.imshow(pivot[cols_present], text_auto=True, color_continuous_scale="Blues", title="Occupation x Month Conversion Rate Heatmap (%)")
        st.plotly_chart(fig_hm, use_container_width=True)
