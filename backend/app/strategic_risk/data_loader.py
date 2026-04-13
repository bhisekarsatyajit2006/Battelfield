# backend/app/strategic_risk/data_loader.py

import pandas as pd
from datasets import load_dataset


def load_from_huggingface(dataset_name: str):
    ds = load_dataset(dataset_name)
    return ds["train"].to_pandas()


def load_from_url(url: str):
    return pd.read_csv(url)