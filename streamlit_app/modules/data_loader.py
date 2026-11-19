"""Dataset loading, UCI remote fetch, delimiter detection, and target column 'y' normalization."""

import io
import os
import zipfile
from typing import Tuple

import pandas as pd
import requests
import streamlit as st

UCI_ZIP_URL = "https://archive.ics.uci.edu/static/public/222/bank+marketing.zip"
LOCAL_SAMPLE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "bank.csv")


def detect_target_column(df: pd.DataFrame) -> str:
    """Automatically detect the binary subscription target column ('y' or equivalent)."""
    lower_map = {col.strip().lower(): col for col in df.columns}
    if "y" in lower_map:
        return lower_map["y"]
    for candidate in ["target", "deposit", "subscribed", "subscription", "outcome", "label"]:
        if candidate in lower_map:
            return lower_map[candidate]
    for col in df.columns:
        unique_vals = set(df[col].dropna().astype(str).str.strip().str.lower().unique())
        if unique_vals.issubset({"yes", "no", "1", "0", "true", "false"}) and len(unique_vals) >= 2:
            return col
    return df.columns[-1]


def normalize_target_column(df: pd.DataFrame, target_col: str) -> pd.DataFrame:
    """Standardize target column to 'y' with values 'yes' / 'no'."""
    out = df.copy()
    if target_col != "y":
        out = out.rename(columns={target_col: "y"})
    out["y"] = (
        out["y"]
        .astype(str)
        .str.strip()
        .str.lower()
        .map(lambda v: "yes" if v in {"yes", "1", "true", "y", "subscribed"} else "no")
    )
    return out


def read_bank_csv(file_bytes: bytes) -> Tuple[pd.DataFrame, str]:
    """Read semicolon- or comma-delimited bank marketing CSV and normalize target."""
    sample = file_bytes[:2048].decode("utf-8", errors="ignore")
    sep = ";" if sample.count(";") >= sample.count(",") else ","
    df = pd.read_csv(io.BytesIO(file_bytes), sep=sep)
    df.columns = [c.strip() for c in df.columns]
    detected_target = detect_target_column(df)
    df = normalize_target_column(df, detected_target)
    return df, detected_target


@st.cache_data(show_spinner=False)
def load_uci_dataset(variant: str = "sample") -> Tuple[pd.DataFrame, str]:
    """Load local bundled UCI dataset or fetch live from archive.ics.uci.edu."""
    if variant == "local" and os.path.exists(LOCAL_SAMPLE_PATH):
        with open(LOCAL_SAMPLE_PATH, "rb") as f:
            return read_bank_csv(f.read())

    resp = requests.get(UCI_ZIP_URL, timeout=20)
    resp.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(resp.content)) as outer_zip:
        inner_name = "bank.zip"
        with outer_zip.open(inner_name) as inner_file:
            with zipfile.ZipFile(io.BytesIO(inner_file.read())) as inner_zip:
                csv_name = "bank-full.csv" if variant == "full" else "bank.csv"
                with inner_zip.open(csv_name) as csv_file:
                    return read_bank_csv(csv_file.read())


def render_exploration_page(df: pd.DataFrame) -> None:
    """Module 2: Dataset Exploration UI."""
    st.header("Dataset Exploration")
    st.write("Inspect schema, missing values, `'unknown'` categorical tokens, duplicate records, and statistical summaries.")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Rows", f"{df.shape[0]:,}")
    c2.metric("Columns", f"{df.shape[1]}")
    c3.metric("Duplicate Records", f"{int(df.duplicated().sum()):,}")
    unknown_total = int((df.astype(str).apply(lambda s: s.str.lower() == "unknown")).sum().sum())
    c4.metric("Missing / 'unknown'", f"{int(df.isna().sum().sum()):,} / {unknown_total:,}")

    st.subheader("Dataset Preview (First 25 Rows)")
    st.dataframe(df.head(25), use_container_width=True)

    col_info = pd.DataFrame({
        "Column": df.columns,
        "Data Type": [str(t) for t in df.dtypes],
        "Missing (NaN)": [int(df[c].isna().sum()) for c in df.columns],
        "Unknown Count": [int((df[c].astype(str).str.lower() == "unknown").sum()) for c in df.columns],
        "Unique Values": [int(df[c].nunique()) for c in df.columns],
    })
    st.subheader("Schema & Data Quality Profile")
    st.dataframe(col_info, use_container_width=True)

    st.subheader("Statistical Summary (Numeric Features)")
    st.dataframe(df.describe().T.round(2), use_container_width=True)

    st.subheader("Categorical Summary")
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    if cat_cols:
        st.dataframe(df[cat_cols].describe().T, use_container_width=True)
