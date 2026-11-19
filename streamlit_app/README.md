# Bank Marketing Campaign Analysis Using Data Analytics and Machine Learning

A complete B.Tech Computer Science / Data Science mini-project built with **Python**, **Streamlit**, **Pandas**, **NumPy**, **Matplotlib**, **Seaborn**, **Plotly**, and **Scikit-learn**.

## Project Objectives
- Analyze bank direct marketing campaign data to understand customer behavior.
- Identify key demographic, financial, and outreach factors influencing term deposit subscriptions.
- Evaluate campaign effectiveness across channels, occupations, age groups, and seasonal months.
- Train, compare, and persist leakage-free Scikit-learn ML pipelines (Logistic Regression, Decision Tree, Random Forest) with class-imbalance handling.
- Predict term deposit subscription likelihood for individual customers and generate an academic project report.

## Project Structure
```
streamlit_app/
├── app.py                        # Main Streamlit entry point & sidebar navigation
├── requirements.txt              # Python package dependencies
├── .replit                       # Replit execution config
├── README.md                     # Documentation & setup guide
├── data/
│   └── bank.csv                  # Official UCI Bank Marketing sample (4,521 rows)
└── modules/
    ├── __init__.py
    ├── data_loader.py            # UCI dataset download, CSV upload, target 'y' auto-detection
    ├── data_cleaning.py          # Missing/unknown handling, deduplication, IQR outliers, encoding
    ├── eda.py                    # 10 interactive Plotly/Seaborn exploratory charts
    ├── campaign_analysis.py      # Conversion metrics & top-performing segment ranking
    ├── ml_pipeline.py            # Leakage-free Scikit-learn Pipelines, ROC-AUC, model saving
    ├── prediction.py             # Interactive Customer Subscription Prediction form
    ├── dashboard.py              # Multi-filter KPI & heatmap executive dashboard
    ├── insights.py               # Automated business findings & strategic recommendations
    └── report_generator.py       # Downloadable HTML & Markdown academic project report
```

## Installation & Execution

### Local Environment
```bash
pip install -r requirements.txt
streamlit run app.py
```

### Replit Deployment
1. Upload or import this folder into a new Python Replit workspace.
2. Replit automatically installs dependencies from `requirements.txt` and uses `.replit` to launch `streamlit run app.py`.
3. Open the Webview tab to interact with all 10 modules.

## Dataset
Uses the **UCI Machine Learning Repository Bank Marketing Dataset** (`https://archive.ics.uci.edu/dataset/222/bank+marketing`). Includes automatic live fetch from UCI as well as custom CSV upload (auto-detecting semicolon `;` or comma `,` delimiters and target column `y`).
