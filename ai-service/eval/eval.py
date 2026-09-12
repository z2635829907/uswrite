"""RAG 检索评测脚本(完整指标体系)。

对比三种检索策略(纯 BM25 / 线性加权 / RRF)在评测集上的表现,计算:
  - Hit@k      :top-k 结果中是否命中至少一个相关文档(命中率)
  - Recall@k   :命中的相关文档数 / 该查询全部相关文档数(召回率)
  - Precision@k:命中的相关文档数 / k(精确率)
  - MRR        :第一个相关文档排名的倒数平均(平均倒数排名)
  - NDCG@k     :归一化折损累计增益(考虑排序位置与相关性)
  - MAP@k      :平均精度均值(对每个查询的精度@k 求平均)

按「关键词型 / 语义型 / 全部」分组统计,并把逐条明细写入 eval/results.json,
供可视化报告(eval/report.py)消费。

运行方式(在 ai-service 目录下):
    python eval/eval.py
"""
from __future__ import annotations

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import rag  # noqa: E402

DATASET = os.path.join(os.path.dirname(__file__), "qa_dataset.json")
RESULTS = os.path.join(os.path.dirname(__file__), "results.json")
STRATEGIES = ["bm25", "weighted", "rrf"]
K = 5          # 主评测 top-k
K_RECALL = 10  # 召回率附加档,观察召回曲线


def _retrieved_post_ids(top: list[rag.ChunkItem], k: int) -> list[int]:
    """把 chunk 级检索结果去重为文档(post)级有序列表,取前 k 个。"""
    seen: set[int] = set()
    out: list[int] = []
    for c in top:
        if c.kind != "post":
            continue
        pid = c.source_id
        if pid in seen:
            continue
        seen.add(pid)
        out.append(pid)
        if len(out) >= k:
            break
    return out


def _metrics_one(retrieved: list[int], relevant: set[int], k: int) -> dict:
    """对单条查询计算全部指标。"""
    n_rel = len(relevant)
    hits = [pid for pid in retrieved if pid in relevant]

    # Hit@k / Recall@k / Precision@k
    hit = 1.0 if hits else 0.0
    recall = (len(hits) / n_rel) if n_rel else 0.0
    precision = (len(hits) / k) if k else 0.0

    # MRR
    mrr = 0.0
    for rank, pid in enumerate(retrieved, start=1):
        if pid in relevant:
            mrr = 1.0 / rank
            break

    # NDCG@k(二元相关:rel=0/1)
    dcg = 0.0
    for i, pid in enumerate(retrieved, start=1):
        if pid in relevant:
            dcg += 1.0 / math.log2(i + 1)
    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, min(n_rel, k) + 1))
    ndcg = dcg / idcg if idcg > 0 else 0.0

    # AP@k(用于 MAP)
    ap = 0.0
    num_hit = 0
    for i, pid in enumerate(retrieved, start=1):
        if pid in relevant:
            num_hit += 1
            ap += num_hit / i
    ap = (ap / n_rel) if n_rel else 0.0

    return {
        "hit": hit, "recall": recall, "precision": precision,
        "mrr": mrr, "ndcg": ndcg, "ap": ap,
    }


def _evaluate_subset(subset: list[dict], strategy: str, k: int) -> dict:
    """对一批查询计算平均指标与逐条明细。"""
    per_query: list[dict] = []
    sums = {"hit": 0.0, "recall": 0.0, "precision": 0.0, "mrr": 0.0, "ndcg": 0.0, "ap": 0.0}
    for item in subset:
        relevant = set(item["relevant"])
        top = rag.retrieve(item["question"], strategy=strategy, top_k=max(k, K_RECALL))
        retrieved_k = _retrieved_post_ids(top, k)
        m = _metrics_one(retrieved_k, relevant, k)
        for key in sums:
            sums[key] += m[key]
        per_query.append({
            "question": item["question"],
            "type": item["type"],
            "relevant": sorted(relevant),
            "retrieved": retrieved_k,
            "hit": bool(m["hit"]),
        })
    n = len(subset)
    avg = {key: (sums[key] / n if n else 0.0) for key in sums}
    avg["n"] = n
    return {"avg": avg, "per_query": per_query}


def main() -> None:
    with open(DATASET, encoding="utf-8") as f:
        dataset = json.load(f)

    keyword = [d for d in dataset if d["type"] == "keyword"]
    semantic = [d for d in dataset if d["type"] == "semantic"]

    result: dict = {
        "dataset_size": len(dataset),
        "keyword_size": len(keyword),
        "semantic_size": len(semantic),
        "k": K,
        "k_recall": K_RECALL,
        "strategies": {},
    }

    print(f"评测集:{len(dataset)} 条(关键词型 {len(keyword)} / 语义型 {len(semantic)}),top-k={K}\n")

    for strategy in STRATEGIES:
        result["strategies"][strategy] = {}
        for name, subset in [("all", dataset), ("keyword", keyword), ("semantic", semantic)]:
            result["strategies"][strategy][name] = _evaluate_subset(subset, strategy, K)

    # 控制台表格
    for name, subset in [("全部", dataset), ("关键词型", keyword), ("语义型", semantic)]:
        print(f"--- {name}({len(subset)} 条) ---")
        header = f"{'策略':<10}{'Hit@k':>8}{'Recall@k':>10}{'Prec@k':>9}{'MRR':>8}{'NDCG@k':>9}{'MAP@k':>8}"
        print(header)
        for strategy in STRATEGIES:
            a = result["strategies"][strategy]["all" if name == "全部" else
                                           ("keyword" if name == "关键词型" else "semantic")]["avg"]
            print(f"{strategy:<10}{a['hit']:>8.2%}{a['recall']:>10.2%}{a['precision']:>9.2%}"
                  f"{a['mrr']:>8.3f}{a['ndcg']:>9.3f}{a['ap']:>8.3f}")
        print()

    # 召回率附加档(Recall@10,仅全部集合)
    print(f"--- 召回率曲线(全部 {len(dataset)} 条) ---")
    print(f"{'策略':<10}{'Recall@5':>10}{'Recall@10':>11}")
    for strategy in STRATEGIES:
        rec5 = result["strategies"][strategy]["all"]["avg"]["recall"]
        # 单独算 Recall@10
        sums = 0.0
        for item in dataset:
            relevant = set(item["relevant"])
            top = rag.retrieve(item["question"], strategy=strategy, top_k=K_RECALL)
            retrieved = _retrieved_post_ids(top, K_RECALL)
            hits = [pid for pid in retrieved if pid in relevant]
            sums += (len(hits) / len(relevant)) if relevant else 0.0
        rec10 = sums / len(dataset)
        result["strategies"][strategy]["all"]["avg"]["recall10"] = rec10
        print(f"{strategy:<10}{rec5:>10.2%}{rec10:>11.2%}")

    with open(RESULTS, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\n逐条明细已写入 {RESULTS}")


if __name__ == "__main__":
    main()
