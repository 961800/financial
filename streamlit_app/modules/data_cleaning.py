"""Data Cleaning & Preprocessing utilities."""

from typing import List, Tuple

import numpy as np
import pandas as pd
import streamlit as st


def clean_bank_dataframe(
    df: pd.DataFrame,
    missing_strategy: str = "mode",
    remove_duplicates: bool = True,
    outlier_strategy: str = "iqr_cap",
    outlier_cols: List[str] = None,
) -> Tuple[pd.DataFrame, dict]:
    """Execute reproducible cleaning pipeline and return audit stats."""
    if outlier_cols is None:
        outlier_cols = [c for c in ["age", "balance", "duration", "campaign"] if c in df.columns]

    cleaned = df.copy()
    before_rows = len(cleaned)
    dupes_removed = 0

    if remove_duplicates:
        dupes_removed = int(cleaned.duplicated().sum())
        cleaned = cleaned.drop_duplicates().reset_index(drop=True)

    missing_handled = 0
    cat_cols = [c for c in cleaned.select_dtypes(include=["object", "category"]).columns if c not in {"y", "poutcome"}]
    num_cols = cleaned.select_dtypes(include=[np.number]).columns.tolist()

    for col in num_cols:
        na_cnt = int(cleaned[col].isna().sum())
        if na_cnt > 0:
            cleaned[col] = cleaned[col].fillna(cleaned[col].median())
            missing_handled += na_cnt

    if missing_strategy == "drop_rows":
        mask = pd.Series(True, index=cleaned.index)
        for col in cat_cols:
            mask &= cleaned[col].notna() & (cleaned[col].astype(str).str.lower() != "unknown")
        missing_handled += int((~mask).sum())
        cleaned = cleaned[mask].reset_index(drop=True)
    elif missing_strategy == "mode":
        for col in cat_cols:
            is_unk = cleaned[col].isna() | (cleaned[col].astype(str).str.lower() == "unknown")
            cnt = int(is_unk.sum())
            if cnt > 0:
                valid = cleaned.loc[~is_unk, col]
                if not valid.empty:
                    cleaned.loc[is_unk, col] = valid.mode().iloc[0]
                    missing_handled += cnt

    outliers_handled = 0
    if outlier_strategy != "none" and outlier_cols:
        for col in outlier_cols:
            if col not in cleaned.columns:
                continue
            q1 = cleaned[col].quantile(0.25)
            q3 = cleaned[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            out_mask = (cleaned[col] < lower) | (cleaned[col] > upper)
            outliers_handled += int(out_mask.sum())
            if outlier_strategy == "iqr_cap":
                cleaned[col] = cleaned[col].clip(lower=lower, upper=upper)
            elif outlier_strategy == "iqr_remove":
                cleaned = cleaned[~out_mask].reset_index(drop=True)

    audit = {
        "before_rows": before_rows,
        "after_rows": len(cleaned),
        "duplicates_removed": dupes_removed,
        "missing_handled": missing_handled,
        "outliers_handled": outliers_handled,
    }
    return cleaned, audit


def render_cleaning_page(raw_df: pd.DataFrame) -> None:
    """Module 3: Interactive Data Cleaning UI."""
    st.header("Data Cleaning & Preparation")
    st.write("Configure missing-value treatment, duplicate removal, IQR outlier handling, and inspect categorical encoding.")

    col1, col2, col3 = st.columns(3)
    with col1:
        missing_strategy = st.selectbox(
            "Missing & 'unknown' Handling",
            options=["mode", "keep_unknown", "drop_rows"],
            format_func=lambda x: {
                "mode": "Impute with Column Mode",
                "keep_unknown": "Keep 'unknown' as Valid Category",
                "drop_rows": "Drop Rows with Unknowns",
            }[x],
        )
    with col2:
        remove_dupes = st.checkbox("Remove Duplicate Records", value=True)
    with col3:
        outlier_strategy = st.selectbox(
            "Outlier Treatment (IQR 1.5x)",
            options=["iqr_cap", "none", "iqr_remove"],
            format_func=lambda x: {
                "iqr_cap": "Cap Outliers at IQR Fences (Winsorize)",
                "none": "No Outlier Modification",
                "iqr_remove": "Filter Out Outlier Rows",
            }[x],
        )

    if st.button("Apply Data Cleaning Pipeline", type="primary"):
        cleaned, audit = clean_bank_dataframe(
            raw_df,
            missing_strategy=missing_strategy,
            remove_duplicates=remove_dupes,
            outlier_strategy=outlier_strategy,
        )
        st.session_state["active_df"] = cleaned
        st.session_state["cleaning_audit"] = audit
        st.success(f"Cleaning complete: {audit['before_rows']:,} -> {audit['after_rows']:,} rows.")

    active_df = st.session_state.get("active_df", raw_df)
    if "cleaning_audit" in st.session_state:
        a = st.session_state["cleaning_audit"]
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Rows Before", f"{a['before_rows']:,}")
        m2.metric("Rows After", f"{a['after_rows']:,}")
        m3.metric("Duplicates Removed", f"{a['duplicates_removed']:,}")
        m4.metric("Outliers Handled", f"{a['outliers_handled']:,}")

    st.subheader("One-Hot Encoded Feature Preview")
    encoded_preview = pd.get_dummies(active_df.drop(columns=["y"]).head(10), drop_first=False, dtype=int)
    st.dataframe(encoded_preview, use_container_width=True)

    csv_bytes = active_df.to_csv(index=False).encode("utf-8")
    st.download_button("Download Cleaned CSV", csv_bytes, "bank_marketing_cleaned.csv", "text/csv")
