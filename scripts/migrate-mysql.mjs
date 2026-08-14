import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// 从 SQLite(data/blog.db)导出数据,生成 MySQL 可导入的 SQL 文件
const db = new DatabaseSync(path.join(process.cwd(), "data", "blog.db"));

function esc(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return (
    "'" +
    String(v)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "''")
      .replace(/\0/g, "")
      .replace(/\r\n/g, "\n") +
    "'"
  );
}

function rows(table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

const tables = ["users", "posts", "likes", "bookmarks", "comments", "notifications"];
const lines = ["USE shiguang;", "SET NAMES utf8mb4;"];
const counts = {};

for (const table of tables) {
  const rs = rows(table);
  counts[table] = rs.length;
  if (!rs.length) continue;
  const cols = Object.keys(rs[0]);
  const colSql = cols.map((c) => (c === "read" ? "`read`" : c)).join(", ");
  for (const r of rs) {
    const vals = cols.map((c) => esc(r[c])).join(", ");
    lines.push(`INSERT INTO ${table} (${colSql}) VALUES (${vals});`);
  }
}

const out = path.join(process.cwd(), "backend", "sql", "migrate.sql");
fs.writeFileSync(out, lines.join("\n"), "utf8");
console.log("已生成 migrate.sql:", JSON.stringify(counts));
db.close();
