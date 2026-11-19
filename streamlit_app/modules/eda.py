"""Module 4: Exploratory Data Analysis with interactive Plotly & Seaborn charts."""

import matplotlib.pyplot as plt
import pandas as pd
import plotly.express as px
import seaborn as sns
import streamlit as st

MONTH_ORDER = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
NAVY_PALETTE = {"yes": "#0284C7", "no": "#0F294A"}


def render_eda_page(df: pd.DataFrame) -> None:
    """Render all 10 interactive EDA visualizations."""
    st.header("Exploratory Data Analysis")
    st.write("Interactive distribution and subscription outcome comparisons across customer demographics and campaign outreach variables.")

    col_a, col_b = st.columns(2)
    with col_a:
        fig_age = px.histogram(
            df, x="age", color="y", nbins=28, barmode="overlay",
            color_discrete_map=NAVY_PALETTE,
            title="Customer Age Distribution by Subscription Outcome",
        )
        st.plotly_chart(fig_age, use_container_width=True)

    with col_b:
        fig_target = px.pie(
            df, names="y", hole=0.55,
            color="y", color_discrete_map=NAVY_PALETTE,
            title="Subscription Success vs Failure Distribution",
        )
        st.plotly_chart(fig_target, use_container_width=True)

    col_c, col_d = st.columns(2)
    with col_c:
        job_df = df.groupby(["job", "y"]).size().reset_index(name="count")
        fig_job = px.bar(
            job_df, x="job", y="count", color="y", barmode="group",
            color_discrete_map=NAVY_PALETTE,
            title="Customer Job Categories",
        )
        fig_job.update_layout(xaxis_tickangle=-35)
        st.plotly_chart(fig_job, use_container_width=True)

    with col_d:
        marital_df = df.groupby(["marital", "y"]).size().reset_index(name="count")
        fig_marital = px.bar(
            marital_df, x="marital", y="count", color="y", barmode="group",
            color_discrete_map=NAVY_PALETTE,
            title="Marital Status Distribution",
        )
        st.plotly_chart(fig_marital, use_container_width=True)

    col_e, col_f = st.columns(2)
    with col_e:
        edu_df = df.groupby(["education", "y"]).size().reset_index(name="count")
        fig_edu = px.bar(
            edu_df, x="education", y="count", color="y", barmode="group",
            color_discrete_map=NAVY_PALETTE,
            title="Education Levels Distribution",
        )
        st.plotly_chart(fig_edu, use_container_width=True)

    with col_f:
        contact_df = df.groupby(["contact", "y"]).size().reset_index(name="count")
        fig_contact = px.bar(
            contact_df, x="contact", y="count", color="y", barmode="group",
            color_discrete_map=NAVY_PALETTE,
            title="Contact Methods Distribution",
        )
        st.plotly_chart(fig_contact, use_container_width=True)

    col_g, col_h = st.columns(2)
    with col_g:
        fig_dur = px.histogram(
            df, x="duration", color="y", nbins=35, barmode="overlay",
            color_discrete_map=NAVY_PALETTE,
            title="Campaign Call Duration (Seconds) Distribution",
        )
        st.plotly_chart(fig_dur, use_container_width=True)

    with col_h:
        camp_capped = df.assign(campaign_capped=df["campaign"].clip(upper=10))
        camp_df = camp_capped.groupby(["campaign_capped", "y"]).size().reset_index(name="count")
        fig_camp = px.bar(
            camp_df, x="campaign_capped", y="count", color="y", barmode="group",
            color_discrete_map=NAVY_PALETTE,
            title="Number of Campaign Contacts (Capped at 10+)",
        )
        st.plotly_chart(fig_camp, use_container_width=True)

    col_i, col_j = st.columns(2)
    with col_i:
        month_df = df.groupby(["month", "y"]).size().reset_index(name="count")
        fig_month = px.bar(
            month_df, x="month", y="count", color="y", barmode="stack",
            category_orders={"month": MONTH_ORDER},
            color_discrete_map=NAVY_PALETTE,
            title="Monthly Campaign Performance",
        )
        st.plotly_chart(fig_month, use_container_width=True)

    with col_j:
        pout_df = df.groupby(["poutcome", "y"]).size().reset_index(name="count")
        fig_pout = px.bar(
            pout_df, x="poutcome", y="count", color="y", barmode="group",
            color_discrete_map=NAVY_PALETTE,
            title="Previous Campaign Outcomes",
        )
        st.plotly_chart(fig_pout, use_container_width=True)

    st.subheader("Numeric Feature Correlation Heatmap (Matplotlib / Seaborn)")
    num_df = df.select_dtypes(include="number").copy()
    num_df["target_y"] = (df["y"] == "yes").astype(int)
    fig_corr, ax = plt.subplots(figsize=(9, 4.5))
    sns.heatmap(num_df.corr(), annot=True, fmt=".2f", cmap="Blues", ax=ax)
    ax.set_title("Correlation Matrix Including Target Subscription (target_y)")
    st.pyplot(fig_corr)
    plt.close(fig_corr)
