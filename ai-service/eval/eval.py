"""RAG 检索评测脚本。

对比三种检索策略(纯 BM25 / 线性加权 / RRF)在评测集上的命中率与 MRR,
并按"关键词型 / 语义型"分别统计,用数据验证向量检索与 RRF 融合的价值。

运行方式(在 ai-service 目录下):
    python eval/eval.py
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import rag  # noqa: E402

DATASET = os.path.join(os.path.dirname(__file__), "qa_dataset.json")
STRATEGIES = ["bm25", "weighted", "rrf"]
K = 5


def _hit_and_mrr(item: dict, strategy: str, k: int) -> tuple[bool, float]:
    expected = set(item["expected"])
    top = rag.retrieve(item["question"], strategy=strategy, top_k=k)
    post_ids = [c.source_id for c in top if c.kind == "post"]
    hit = bool(expected & set(post_ids))
    mrr = 0.0
    for rank, pid in enumerate(post_ids, start=1):
        if pid in expected:
            mrr = 1.0 / rank
            break
    return hit, mrr


def evaluate(dataset: list[dict], strategy: str, k: int = K) -> tuple[float, float]:
    hits = 0
    mrr = 0.0
    for item in dataset:
        h, m = _hit_and_mrr(item, strategy, k)
        hits += h
        mrr += m
    n = len(dataset)
    return hits / n, mrr / n


def main() -> None:
    with open(DATASET, encoding="utf-8") as f:
        dataset = json.load(f)

    keyword = [d for d in dataset if d.get("type") != "semantic"]
    semantic = [d for d in dataset if d.get("type") == "semantic"]

    print(f"评测集:{len(dataset)} 条(关键词型 {len(keyword)} / 语义型 {len(semantic)}),top-k={K}\n")

    for name, subset in [("全部", dataset), ("关键词型", keyword), ("语义型", semantic)]:
        print(f"--- {name}({len(subset)} 条) ---")
        print(f"{'策略':<10}{'Hit@k':>8}{'MRR':>10}")
        for strategy in STRATEGIES:
            hit, mrr = evaluate(subset, strategy)
            print(f"{strategy:<10}{hit:>8.2%}{mrr:>10.3f}")
        print()


if __name__ == "__main__":
    main()
