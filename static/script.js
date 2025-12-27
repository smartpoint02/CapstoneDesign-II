document.addEventListener("DOMContentLoaded", () => {
    /* ================= 책 추천 ================= */
    const searchForm = document.getElementById("searchForm");
    const booksDiv = document.getElementById("books");

    searchForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const keyword = document.getElementById("keyword").value.trim();
        if (!keyword) { alert("검색어 입력"); return; }

        const res = await fetch("/search", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ keyword })
        });

        const data = await res.json();
        booksDiv.innerHTML = "";
        data.forEach(book => {
            const div = document.createElement("div");
            div.innerHTML = `<h3>${book.title}</h3><p><b>저자:</b> ${book.author}</p><p>${book.summary || "줄거리가 없습니다."}</p>`;
            booksDiv.appendChild(div);
        });
    });

    /* ================= 읽은 책 ================= */
    const readForm = document.getElementById("readForm");
    const readBooksList = document.getElementById("readBooksList");
    const readPagination = document.getElementById("readPagination");
    const readPerPage = 5;
    let readCurrentPage = 1;
    let read_books = [];

    async function loadReadBooks() {
        const res = await fetch("/read");
        const data = await res.json();
        read_books = data.read_books;
        renderReadBooks(readCurrentPage);
    }

    async function addReadBook(title, author, review) {
        await fetch("/read", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ title, author, review })
        });
        loadReadBooks();
    }

    async function deleteReadBook(index) {
        await fetch(`/read/${index}`, { method: "DELETE" });
        loadReadBooks();
    }

    function renderReadBooks(page = 1) {
        readCurrentPage = page;
        const start = (page - 1) * readPerPage;
        const end = start + readPerPage;
        const pageBooks = read_books.slice(start, end);

        readBooksList.innerHTML = "";
        pageBooks.forEach((book, index) => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="book-title">${book.title}</span><span class="delete-btn">삭제</span>
                            <div class="book-detail" style="display:none;"><p><b>저자:</b> ${book.author}</p><p><b>리뷰:</b> ${book.review}</p></div>`;

            const detail = li.querySelector(".book-detail");
            li.querySelector(".book-title").addEventListener("click", () => {
                detail.style.display = detail.style.display === "none" ? "block" : "none";
            });

            li.querySelector(".delete-btn").addEventListener("click", () => {
                const globalIndex = (readCurrentPage - 1) * readPerPage + index;
                deleteReadBook(globalIndex);
            });

            readBooksList.appendChild(li);
        });
    }

    readForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = document.getElementById("bookTitle").value.trim();
        const author = document.getElementById("bookAuthor").value.trim();
        const review = document.getElementById("bookReview").value.trim();
        if (!title || !author || !review) { alert("모든 항목 입력"); return; }
        addReadBook(title, author, review);
        readForm.reset();
    });

    loadReadBooks();

    /* ================= Q&A ================= */
    const qaForm = document.getElementById("qaForm");
    const questionsList = document.getElementById("questionsList");
    const qaPagination = document.getElementById("qaPagination");
    const qaPerPage = 5;
    let qaCurrentPage = 1;
    let qa_list = [];

    async function loadQuestions(page = 1) {
        qaCurrentPage = page;
        const res = await fetch("/qa");
        const data = await res.json();
        qa_list = data.qa_list;

        const start = (page - 1) * qaPerPage;
        const end = start + qaPerPage;
        const pageQuestions = qa_list.slice(start, end);

        questionsList.innerHTML = "";
        pageQuestions.forEach(q => {
            const li = document.createElement("li");
            const answersHTML = q.answers.map(a => `<p><b>${a.author}:</b> ${a.content}</p>`).join("");

            li.innerHTML = `
                <div class="qa-header">
                    <div class="qa-title-author">
                        <span class="q-title">${q.title}</span>
                        <span class="q-author">${q.author}</span>
                    </div>
                    <span class="q-delete-btn">삭제</span>
                </div>
                <div class="q-content" style="display:none;">
                    <p>${q.content}</p>
                    <div class="answers">${answersHTML}</div>
                    <textarea class="answer-input" placeholder="답변 내용을 입력"></textarea>
                    <button class="answer-btn">답변 등록</button>
                </div>
            `;

            const qTitle = li.querySelector(".q-title");
            const qContent = li.querySelector(".q-content");
            const qDeleteBtn = li.querySelector(".q-delete-btn");
            const answerBtn = li.querySelector(".answer-btn");
            const answerInput = li.querySelector(".answer-input");

            qTitle.addEventListener("click", () => {
                qContent.style.display = qContent.style.display === "none" ? "block" : "none";
            });

            // 삭제 버튼
            qDeleteBtn.addEventListener("click", async () => {
                const password = prompt("질문 삭제 비밀번호를 입력하세요");
                if (!password) return;

                const res = await fetch(`/qa/${q.id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password })
                });
                const result = await res.json();
                alert(result.message);
                loadQuestions(qaCurrentPage);
            });

            // 답변 등록
            answerBtn.addEventListener("click", async () => {
                const content = answerInput.value.trim();
                if (!content) { alert("답변 내용을 입력하세요"); return; }
                await fetch(`/qa/${q.id}/answer`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ content, author: "익명" })
                });
                answerInput.value = "";
                loadQuestions(qaCurrentPage);
            });

            questionsList.appendChild(li);
        });

        renderQAPagination();
    }

    function renderQAPagination() {
        qaPagination.innerHTML = "";
        const pageCount = Math.ceil(qa_list.length / qaPerPage);
        for (let i = 1; i <= pageCount; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.disabled = i === qaCurrentPage;
            btn.addEventListener("click", () => loadQuestions(i));
            qaPagination.appendChild(btn);
        }
    }

    qaForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("qaTitle").value.trim();
        const content = document.getElementById("qaQuestion").value.trim();
        const author = document.getElementById("qaAuthor").value.trim();
        const password = document.getElementById("qaPassword").value.trim();
        if (!title || !content || !author || !password) { alert("모든 항목 입력"); return; }

        await fetch("/qa", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ title, content, author, password })
        });

        qaForm.reset();
        loadQuestions();
    });

    loadQuestions();
});
