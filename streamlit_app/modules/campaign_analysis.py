"""Module 5: Campaign Performance Analysis & Best Segment Identification."""

import pandas as pd
import plotly.express as px
import streamlit as st

MONTH_ORDER = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]


def compute_conversion_table(df: pd.DataFrame, group_col: str, order=None) -> pd.DataFrame:
    """Compute contacted count, subscriptions, and conversion percentage by group."""
    grp = (
        df.assign(subscribed=(df["y"] == "yes").astype(int))
        .groupby(group_col, observed=False)
        .agg(contacted=("y", "count"), subscriptions=("subscribed", "sum"))
        .reset_index()
    )
    grp["conversion_rate"] = (grp["subscriptions"] / grp["contacted"] * 100).round(2)
    if order:
        grp[group_col] = pd.Categorical(grp[group_col], categories=order, ordered=True)
        grp = grp.sort_values(group_col)
    else:
        grp = grp.sort_values("conversion_rate", ascending=False)
    return grp


def render_performance_page(df: pd.DataFrame) -> None:
    """Render Campaign Performance Analysis UI."""
    st.header("Campaign Performance Analysis")

    total = len(df)
    yes_cnt = int((df["y"] == "yes").sum())
    no_cnt = total - yes_cnt
    conv_rate = round((yes_cnt / total) * 100, 2) if total else 0.0

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Customers Contacted", f"{total:,}")
    k2.metric("Successful Subscriptions", f"{yes_cnt:,}")
    k3.metric("Unsuccessful Responses", f"{no_cnt:,}")
    k4.metric("Overall Conversion Rate", f"{conv_rate:.2f}%")

    df_aged = df.copy()
    df_aged["age_group"] = pd.cut(
        df_aged["age"],
        bins=[0, 25, 35, 45, 55, 65, 120],
        labels=["18-25", "26-35", "36-45", "46-55", "56-65", "65+"],
    )

    occ_tbl = compute_conversion_table(df_aged, "job")
    age_tbl = compute_conversion_table(df_aged, "age_group", order=["18-25", "26-35", "36-45", "46-55", "56-65", "65+"])
    edu_tbl = compute_conversion_table(df_aged, "education")
    con_tbl = compute_conversion_table(df_aged, "contact")
    mon_tbl = compute_conversion_table(df_aged, "month", order=MONTH_ORDER)

    c1, c2 = st.columns(2)
    with c1:
        st.plotly_chart(px.bar(occ_tbl, x="job", y="conversion_rate", title="Conversion Rate by Occupation (%)", color_discrete_sequence=["#0F294A"]), use_container_width=True)
        st.plotly_chart(px.bar(edu_tbl, x="education", y="conversion_rate", title="Conversion Rate by Education (%)", color_discrete_sequence=["#0284C7"]), use_container_width=True)
    with c2:
        st.plotly_chart(px.bar(age_tbl, x="age_group", y="conversion_rate", title="Conversion Rate by Age Group (%)", color_discrete_sequence=["#0284C7"]), use_container_width=True)
        st.plotly_chart(px.bar(con_tbl, x="contact", y="conversion_rate", title="Conversion Rate by Contact Method (%)", color_discrete_sequence=["#0F294A"]), use_container_width=True)

    st.plotly_chart(px.line(mon_tbl, x="month", y="conversion_rate", markers=True, title="Conversion Rate by Month (%)"), use_container_width=True)

    st.subheader("Top-Performing Customer Segments")
    min_sample = max(15, int(total * 0.005))
    segments = []
    for dim, tbl in [("Occupation", occ_tbl), ("Age Group", age_tbl), ("Education", edu_tbl), ("Contact", con_tbl), ("Month", mon_tbl)]:
        sub = tbl[tbl["contacted"] >= min_sample].copy()
        sub["Dimension"] = dim
        sub["Segment"] = sub.iloc[:, 0].astype(str)
        sub["Lift vs Baseline"] = (sub["conversion_rate"] / (conv_rate or 1)).round(2)
        segments.append(sub[["Dimension", "Segment", "contacted", "subscriptions", "conversion_rate", "Lift vs Baseline"]])
    ranked = pd.concat(segments, ignore_index=True).sort_values("conversion_rate", ascending=False).head(12)
    st.dataframe(ranked, use_container_width=True)
