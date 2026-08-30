#!/usr/bin/env node
// 离线 RAG 评估脚本:调用后端 AI 助手接口,统计答案是否命中期望关键词。
// 用法: node tests/rag-eval.mjs   (需后端已在 8080 运行)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.RAG_BASE || "http://localhost:8080";

const cases = JSON.parse(
  fs.readFileSync(path.join(__dirname, "rag-eval-cases.json"), "utf8")
);

async function run() {
  const results = [];
  for (const c of cases) {
    let answer = "";
    let srcTitles = "";
    let llm = false;
    let error = null;
    try {
      const res = await fetch(`${BASE}/api/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: c.q }),
      });
      const data = await res.json();
      answer = String(data?.answer || "").toLowerCase();
      srcTitles = (data?.sources || [])
        .map((s) => String(s.title || "").toLowerCase())
        .join(" ");
      llm = Boolean(data?.llm);
    } catch (e) {
      error = String(e.message || e);
    }
    const hits = error
      ? []
      : c.keywords.filter(
          (k) => answer.includes(k.toLowerCase()) || srcTitles.includes(k.toLowerCase())
        );
    results.push({
      q: c.q,
      llm,
      hit: hits.length > 0,
      hits,
      nSrc: error ? 0 : (srcTitles.split(" ").filter(Boolean).length),
      error,
    });
  }

  const n = results.length;
  const hitCount = results.filter((r) => r.hit).length;
  const avgSrc =
    n > 0 ? (results.reduce((a, r) => a + r.nSrc, 0) / n).toFixed(1) : "0.0";
  const llmCount = results.filter((r) => r.llm).length;
  console.log(
    JSON.stringify(
      {
        total: n,
        hitCount,
        hitRate: n > 0 ? `${((hitCount / n) * 100).toFixed(1)}%` : "0%",
        avgSources: avgSrc,
        llmYes: llmCount,
        results,
      },
      null,
      2
    )
  );
}

run().catch((e) => {
  console.error("评估失败:", e);
  process.exit(1);
});
