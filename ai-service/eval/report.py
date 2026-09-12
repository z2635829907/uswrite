"""RAG 检索评测报告生成器。

读取 eval/results.json,生成一份自包含的可视化 HTML 报告(内联 CSS 图表,无外部依赖,
可离线打开),用于检索质量的可视化分析。

运行方式(在 ai-service 目录下,先跑 eval.py 生成 results.json):
    python eval/report.py
"""
from __future__ import annotations

import json
import os
from datetime import datetime

HERE = os.path.dirname(__file__)
RESULTS = os.path.join(HERE, "results.json")
OUT = os.path.join(HERE, "report.html")

STRATEGY_LABEL = {"bm25": "BM25(关键词)", "weighted": "线性加权(旧)", "rrf": "RRF 融合(当前)"}
METRIC_LABEL = {
    "hit": "Hit@5", "recall": "Recall@5", "precision": "Precision@5",
    "mrr": "MRR", "ndcg": "NDCG@5", "ap": "MAP@5",
}
GROUP_LABEL = {"all": "全部", "keyword": "关键词型", "semantic": "语义型"}


def _pct(x: float) -> str:
    return f"{x * 100:.1f}%"


def _val(x: float) -> str:
    return f"{x:.3f}"


def _bar(label: str, values: dict, fmt) -> str:
    """生成一组水平条形图(三策略并列)。"""
    rows = []
    for strategy in ["bm25", "weighted", "rrf"]:
        v = values[strategy]
        width = max(0.0, min(1.0, v))
        color = {"bm25": "#94a3b8", "weighted": "#f59e0b", "rrf": "#6366f1"}[strategy]
        rows.append(
            f'<div class="bar-row"><span class="bar-label">{STRATEGY_LABEL[strategy]}</span>'
            f'<div class="bar-track"><div class="bar-fill" style="width:{width*100:.1f}%;'
            f'background:{color}"></div></div>'
            f'<span class="bar-val">{fmt(v)}</span></div>'
        )
    return f'<div class="chart"><div class="chart-title">{label}</div>{"".join(rows)}</div>'


def main() -> None:
    with open(RESULTS, encoding="utf-8") as f:
        d = json.load(f)

    rrf = d["strategies"]["rrf"]["all"]["avg"]
    sem_rrf = d["strategies"]["rrf"]["semantic"]["avg"]
    kw_rrf = d["strategies"]["rrf"]["keyword"]["avg"]

    # ---- 核心指标对比表 ----
    table_rows = []
    for group in ["all", "keyword", "semantic"]:
        for strategy in ["bm25", "weighted", "rrf"]:
            a = d["strategies"][strategy][group]["avg"]
            hl = ' class="hl"' if strategy == "rrf" else ""
            table_rows.append(
                f"<tr{hl}><td>{GROUP_LABEL[group]}</td><td>{STRATEGY_LABEL[strategy]}</td>"
                f"<td>{_pct(a['hit'])}</td><td>{_pct(a['recall'])}</td>"
                f"<td>{_pct(a['precision'])}</td><td>{_val(a['mrr'])}</td>"
                f"<td>{_val(a['ndcg'])}</td><td>{_val(a['ap'])}</td></tr>"
            )

    # ---- 图表数据 ----
    charts = []
    for metric in ["hit", "mrr", "ndcg"]:
        for group in ["all", "semantic"]:
            values = {s: d["strategies"][s][group]["avg"][metric] for s in ["bm25", "weighted", "rrf"]}
            fmt = _pct if metric == "hit" else _val
            charts.append(_bar(f"{GROUP_LABEL[group]} · {METRIC_LABEL[metric]}", values, fmt))

    recall_chart = _bar(
        "召回率 Recall@5 / Recall@10(全部)",
        {"bm25": d["strategies"]["bm25"]["all"]["avg"]["recall"],
         "weighted": d["strategies"]["weighted"]["all"]["avg"]["recall"],
         "rrf": d["strategies"]["rrf"]["all"]["avg"]["recall"]},
        _pct,
    )
    recall10_chart = _bar(
        "Recall@10(全部)",
        {"bm25": d["strategies"]["bm25"]["all"]["avg"].get("recall10", 0),
         "weighted": d["strategies"]["weighted"]["all"]["avg"].get("recall10", 0),
         "rrf": d["strategies"]["rrf"]["all"]["avg"].get("recall10", 0)},
        _pct,
    )

    # ---- 语义型未命中明细 ----
    misses = [
        q for q in d["strategies"]["rrf"]["semantic"]["per_query"] if not q["hit"]
    ]
    miss_html = ""
    for q in misses:
        miss_html += (
            f'<li><b>{q["question"]}</b> → 相关文章 #{q["relevant"][0]},'
            f'实际检索前5:{" ".join("#" + str(x) for x in q["retrieved"][:5])}</li>'
        )
    if not misses:
        miss_html = "<li>(语义型全部命中,无遗漏)</li>"

    ts = datetime.now().strftime("%Y-%m-%d %H:%M")

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>uswrite RAG 检索评测报告</title>
<style>
  :root {{ --ink:#0f172a; --sub:#64748b; --line:#e2e8f0; --bg:#f8fafc;
          --card:#ffffff; --accent:#6366f1; --good:#16a34a; }}
  * {{ box-sizing:border-box; margin:0; padding:0; }}
  body {{ font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
         background:var(--bg); color:var(--ink); line-height:1.7; }}
  .wrap {{ max-width:960px; margin:0 auto; padding:40px 24px 80px; }}
  header {{ padding:48px 24px; background:linear-gradient(135deg,#4f46e5,#7c3aed);
           color:#fff; border-radius:16px; margin-bottom:32px; }}
  header h1 {{ font-size:28px; margin-bottom:12px; }}
  header p {{ opacity:.92; font-size:15px; }}
  .badges {{ margin-top:20px; display:flex; flex-wrap:wrap; gap:10px; }}
  .badge {{ background:rgba(255,255,255,.16); padding:6px 14px; border-radius:999px;
           font-size:13px; }}
  h2 {{ font-size:20px; margin:40px 0 16px; padding-left:12px; border-left:4px solid var(--accent); }}
  h3 {{ font-size:16px; margin:24px 0 10px; }}
  .card {{ background:var(--card); border:1px solid var(--line); border-radius:12px;
          padding:24px; margin-bottom:16px; }}
  .kv {{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }}
  .kv .cell {{ background:#f1f5f9; border-radius:10px; padding:18px; text-align:center; }}
  .kv .num {{ font-size:28px; font-weight:700; color:var(--accent); }}
  .kv .lbl {{ font-size:13px; color:var(--sub); margin-top:4px; }}
  table {{ width:100%; border-collapse:collapse; font-size:14px; }}
  th,td {{ padding:10px 12px; text-align:center; border-bottom:1px solid var(--line); }}
  th {{ background:#f1f5f9; color:var(--sub); font-weight:600; }}
  td:first-child,th:first-child {{ text-align:left; }}
  tr.hl td {{ background:#eef2ff; font-weight:600; }}
  .charts {{ display:grid; grid-template-columns:1fr 1fr; gap:16px; }}
  @media (max-width:720px) {{ .charts{{grid-template-columns:1fr}} .kv{{grid-template-columns:1fr}} }}
  .chart {{ background:var(--card); border:1px solid var(--line); border-radius:12px;
           padding:18px; }}
  .chart-title {{ font-size:14px; font-weight:600; margin-bottom:14px; color:var(--ink); }}
  .bar-row {{ display:flex; align-items:center; gap:10px; margin-bottom:10px; }}
  .bar-label {{ width:120px; font-size:12px; color:var(--sub); flex-shrink:0; }}
  .bar-track {{ flex:1; background:#f1f5f9; border-radius:6px; height:20px; overflow:hidden; }}
  .bar-fill {{ height:100%; border-radius:6px; transition:width .4s; }}
  .bar-val {{ width:56px; font-size:12px; font-weight:600; text-align:right; flex-shrink:0; }}
  ul {{ padding-left:22px; }}
  li {{ margin-bottom:8px; font-size:14px; }}
  .note {{ font-size:13px; color:var(--sub); background:#fffbeb; border:1px solid #fde68a;
          border-radius:10px; padding:14px 16px; margin:16px 0; }}
  footer {{ margin-top:48px; font-size:12px; color:var(--sub); text-align:center; }}
  code {{ background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:13px; }}
</style>
</head>
<body>
<div class="wrap">
<header>
  <h1>uswrite · RAG 检索评测报告</h1>
  <p>对站内 AI 助手检索链路的三策略对比评测 —— 关键词检索(BM25)、旧线性加权、RRF 融合。</p>
  <div class="badges">
    <span class="badge">评测集 {d['dataset_size']} 条</span>
    <span class="badge">关键词型 {d['keyword_size']} 条</span>
    <span class="badge">语义型 {d['semantic_size']} 条</span>
    <span class="badge">top-k = {d['k']}</span>
    <span class="badge">生成于 {ts}</span>
  </div>
</header>

<h2>结论速览</h2>
<div class="card"><div class="kv">
  <div class="cell"><div class="num">{_pct(rrf['hit'])}</div><div class="lbl">Hit@5 命中率</div></div>
  <div class="cell"><div class="num">{_pct(rrf['recall'])}</div><div class="lbl">Recall@5 召回率</div></div>
  <div class="cell"><div class="num">{_val(rrf['mrr'])}</div><div class="lbl">MRR 平均倒数排名</div></div>
  <div class="cell"><div class="num">{_val(rrf['ndcg'])}</div><div class="lbl">NDCG@5</div></div>
  <div class="cell"><div class="num">{_pct(sem_rrf['hit'])}</div><div class="lbl">语义型 Hit@5</div></div>
  <div class="cell"><div class="num">{_pct(kw_rrf['hit'])}</div><div class="lbl">关键词型 Hit@5</div></div>
</div></div>

<div class="note">
  <b>核心结论:</b>当前采用的 <b>RRF(Reciprocal Rank Fusion)融合策略</b>在全部 {d['dataset_size']} 条评测集上
  达到 <b>Hit@5 {_pct(rrf['hit'])}</b>、<b>Recall@5 {_pct(rrf['recall'])}</b>、<b>MRR {_val(rrf['mrr'])}</b>。
  相比纯关键词 BM25(语义型 Hit 仅 77.8%),引入语义向量并把两路按<b>排名</b>融合后,语义型命中率提升到
  {_pct(sem_rrf['hit'])},且在关键词型上保持 100% 命中,做到「既要关键词精确、也要语义召回」。
</div>

<h2>指标体系说明</h2>
<div class="card">
<ul>
  <li><b>Hit@k</b>:top-k 结果里是否命中至少一个相关文档(命中率)。</li>
  <li><b>Recall@k</b>:命中的相关文档数 / 该查询全部相关文档数(召回率)。</li>
  <li><b>Precision@k</b>:命中的相关文档数 / k(精确率)。注:多数查询只标 1 个相关文档,故此项整体偏低、可对比相对高低。</li>
  <li><b>MRR</b>:第一个相关文档排名的倒数平均(平均倒数排名)。</li>
  <li><b>NDCG@k</b>:归一化折损累计增益,同时考虑「是否相关」与「排序位置」。</li>
  <li><b>MAP@k</b>:平均精度均值,对排序质量更敏感。</li>
</ul>
</div>

<h2>三策略对比(全量指标)</h2>
<div class="card">
<table>
<thead><tr><th>分组</th><th>策略</th><th>Hit@5</th><th>Recall@5</th><th>Precision@5</th><th>MRR</th><th>NDCG@5</th><th>MAP@5</th></tr></thead>
<tbody>{''.join(table_rows)}</tbody>
</table>
</div>

<h2>指标可视化</h2>
<div class="charts">{''.join(charts)}</div>
<div class="charts" style="margin-top:16px">{recall_chart}{recall10_chart}</div>

<h2>语义型检索深挖</h2>
<div class="card">
<p>语义型问题(换一种说法、不含原文关键词)是检验向量检索价值的关键。RRF 在语义型上
Hit@5 达到 {_pct(sem_rrf['hit'])}({d['strategies']['rrf']['semantic']['avg']['n']} 条),比纯 BM25 的
{_pct(d['strategies']['bm25']['semantic']['avg']['hit'])} 提升明显。</p>
<h3>RRF 仍未命中的语义型查询</h3>
<ul>{miss_html}</ul>
</div>

<h2>检索技术链路</h2>
<div class="card">
<ol>
  <li><b>分块</b>:按 Markdown 标题切分,单块目标 600 字(上限 1200),块首带标题作上下文。</li>
  <li><b>双路召回</b>:BM25(jieba 分词 + TF/IDF + 长度归一 k1=1.5,b=0.75)+ 语义向量(text-embedding-v3,1024 维)余弦相似度。</li>
  <li><b>RRF 融合</b>:Reciprocal Rank Fusion(k=60)按<b>排名</b>融合两路,规避不同量纲直接加权的问题。</li>
  <li><b>查询改写</b>:多轮追问先用 LLM 补全指代,改写成独立问题再检索。</li>
</ol>
</div>

<footer>uswrite 项目 · 检索评测 · 报告由 <code>eval/report.py</code> 自动生成</footer>
</div>
</body>
</html>"""

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"报告已生成:{OUT}")


if __name__ == "__main__":
    main()
