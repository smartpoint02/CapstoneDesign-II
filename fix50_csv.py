import pandas as pd
import csv

# novels.txt 읽기 (UTF-8-SIG)
df = pd.read_csv(
    "novels_050.txt",
    header=None,
    names=["title", "author", "book_description"],
    encoding="utf-8-sig"
)

# CSV로 저장, 모든 값을 "로 감싸기
df.to_csv(
    "novels_fixed_50.csv",
    index=False,
    encoding="utf-8-sig",
    quoting=csv.QUOTE_ALL
)

print("완료: novels_fixed_50.csv 생성됨")