# recommender.py
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import math

# CSV 로드
df = pd.read_csv("novels_100.csv", encoding="cp949", engine="python")
df.columns = [c.strip() for c in df.columns]
df = df.rename(columns={"book_description": "summary"})
df["summary"] = df["summary"].fillna("")

titles = df["title"].tolist()
authors = df["author"].tolist()
descriptions = df["summary"].tolist()

# 모델 로드
model = SentenceTransformer("jhgan/ko-sroberta-multitask")
embeddings = model.encode(descriptions, convert_to_tensor=True)

def recommend_books(query, top_k=5):
    query_embedding = model.encode(query, convert_to_tensor=True)
    scores_list = []
    for desc_emb in embeddings:
        sim = util.cos_sim(query_embedding, desc_emb).item()
        if math.isnan(sim) or math.isinf(sim) or abs(sim) > 1e6:
            sim = 0.0
        scores_list.append(sim)

    top_indices = sorted(range(len(scores_list)), key=lambda i: scores_list[i], reverse=True)
    results = []
    for idx in top_indices[:top_k]:
        results.append({
            "title": titles[idx],
            "author": authors[idx],
            "summary": descriptions[idx]
        })
    return results
