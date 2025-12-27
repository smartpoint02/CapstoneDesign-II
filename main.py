import os
import math
import pandas as pd
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sentence_transformers import SentenceTransformer, util

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# ================= CSV 로드 =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, "novels_100.csv")

df = pd.read_csv(csv_path, encoding="cp949", engine="python")
df.columns = df.columns.str.strip()
df = df.rename(columns={"book_description": "summary"})
if "Unnamed: 3" in df.columns:
    df = df.drop(columns=["Unnamed: 3"])
df["summary"] = df["summary"].fillna("")

titles = df["title"].tolist()
authors = df["author"].tolist()
descriptions = df["summary"].tolist()

# ================= 모델 임베딩 =================
model = SentenceTransformer("jhgan/ko-sroberta-multitask")
embeddings = model.encode(descriptions, convert_to_tensor=True)

# ================= 서버 저장 데이터 =================
read_books = []   # {title, author, review}
qa_list = []      # {id, title, content, author, password, answers}

# ================= 메인 페이지 =================
@app.get("/", response_class=HTMLResponse)
async def index():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

# ================= 책 추천 API =================
@app.post("/search")
async def search_book(keyword: str = Form(...)):
    query_embedding = model.encode(keyword, convert_to_tensor=True)
    scores = [float(util.cos_sim(query_embedding, emb)) for emb in embeddings]
    top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:5]
    results = [{"title": titles[i], "author": authors[i], "summary": descriptions[i]} for i in top_indices]
    return JSONResponse(results)

# ================= 읽은 책 API =================
@app.get("/read")
async def get_read_books():
    return JSONResponse({"read_books": read_books})

@app.post("/read")
async def add_read_book(title: str = Form(...), author: str = Form(...), review: str = Form(...)):
    read_books.append({"title": title, "author": author, "review": review})
    return JSONResponse({"message": "책 기록 저장 완료"})

@app.delete("/read/{index}")
async def delete_read_book(index: int):
    if 0 <= index < len(read_books):
        read_books.pop(index)
        return JSONResponse({"message": "삭제 완료"})
    return JSONResponse({"message": "잘못된 인덱스"})

# ================= Q&A API =================
@app.get("/qa")
async def get_qa():
    return JSONResponse({"qa_list": qa_list})

@app.post("/qa")
async def ask_question(title: str = Form(...), content: str = Form(...), author: str = Form(...), password: str = Form(...)):
    qid = len(qa_list)
    qa_list.append({"id": qid, "title": title, "content": content, "author": author, "password": password, "answers": []})
    return JSONResponse({"message": "질문 저장 완료"})

@app.post("/qa/{qid}/answer")
async def add_answer(qid: int, content: str = Form(...), author: str = Form(...)):
    for q in qa_list:
        if q["id"] == qid:
            q["answers"].append({"content": content, "author": author})
            return JSONResponse({"message": "답변 저장 완료"})
    return JSONResponse({"message": "질문 없음"})

@app.delete("/qa/{qid}")
async def delete_question(qid: int, request: Request):
    data = await request.json()
    password = data.get("password")
    for i, q in enumerate(qa_list):
        if q["id"] == qid:
            if q["password"] == password:
                qa_list.pop(i)
                return JSONResponse({"message": "질문 삭제 완료"})
            return JSONResponse({"message": "비밀번호가 일치하지 않습니다"})
    return JSONResponse({"message": "질문 없음"})
