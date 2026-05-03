"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import type { PublicJobPosting } from "@/types/job"
import {
  getRecommendedJobs,
  type DiagnosisUser,
  type RecommendedJob,
} from "@/lib/match"

const SHEET_ID = "1gqpXq2TERXU3Rlarew-hCWUIdM30_Vt9_sY1tYlmjMA"
const SHEET_NAME = "求人入力テンプレ"

type SheetJobRow = Record<string, string>

type RecommendedJobWithSheet = RecommendedJob & {
  salary_year_1?: number | null
  salary_year_3?: number | null
  salary_year_5?: number | null
  growth_route?: string | null
  salary_growth_note?: string | null
  required_step?: string | null
  fit_person?: string | null
}

function yen(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-"
  return `${value.toLocaleString()}円`
}

function parseMoney(value: string | undefined): number | null {
  if (!value) return null

  const cleaned = String(value)
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[,，円\s]/g, "")

  if (!cleaned) return null

  if (cleaned.includes("万")) {
    const n = Number(cleaned.replace("万", ""))
    return Number.isFinite(n) ? n * 10000 : null
  }

  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseLevel(value: string | undefined, fallback = 3) {
  if (!value) return fallback

  const normalized = String(value)
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .trim()

  const n = Number(normalized)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(5, n))
}

function yes(value: string | undefined) {
  if (!value) return false
  return ["yes", "YES", "Yes", "はい", "あり", "有", "○", "〇", "true", "TRUE"].includes(
    value.trim()
  )
}

function normalizeRoute(value: string | undefined): "stable" | "career_up" | "balance" {
  if (!value) return "balance"

  const v = value.trim()

  if (v === "stable" || v.includes("安定")) return "stable"
  if (
    v === "career_up" ||
    v.includes("収入") ||
    v.includes("挑戦") ||
    v.includes("成長") ||
    v.includes("将来")
  ) {
    return "career_up"
  }

  return "balance"
}

function rowToJob(row: SheetJobRow, index: number): PublicJobPosting {
  const baseSalary = parseMoney(row["初年度年収"])
  const year3Salary = parseMoney(row["3年後年収"])
  const year5Salary = parseMoney(row["5年後年収"])
  const salaryMax = year5Salary ?? year3Salary ?? baseSalary

  return {
    id: row["求人ID"] || row["job_id"] || `sheet-job-${index + 1}`,
    public_company_name: null,
    job_title: row["職種名"] || row["求人名"] || "未設定の求人",
    hiring_category: row["業種"] || row["職種カテゴリ"] || row["job_category"] || row["職種名"] || "未設定",
    occupation_name: row["職種名"] || null,
    employment_type: row["雇用形態"] || "正社員",
    prefecture: row["勤務地"] || row["都道府県"] || "全国",
    city: row["市区町村"] || "",
    salary_min: baseSalary,
    salary_max: salaryMax,
    japanese_level_required: row["日本語レベル"] || null,
    accepts_inexperienced: yes(row["未経験OK"]),
    dormitory_available: yes(row["寮あり"]),
    relocation_support: yes(row["引越支援あり"]),
    foreign_nationality_friendly: yes(row["外国籍歓迎"]),
    route: normalizeRoute(row["ルート"] || row["成長ルート"]),
    description: row["仕事内容"] || "",

    // スプレッドシート運用用
    salary_year_1: parseMoney(row["1年後年収"]),
    salary_year_3: year3Salary,
    salary_year_5: year5Salary,
    growth_route: row["成長ルート"] || null,
    salary_growth_note: row["年収アップメモ"] || row["年収成長メモ"] || null,
    required_step: row["必要なこと"] || null,
    fit_person: row["向いている人"] || null,

    // マッチング強化用：既存列をそのまま活用
    routine_level: parseLevel(row["ルーチン度"] || row["ルーチン適性"]),
    change_level: parseLevel(row["変化対応度"] || row["変化適性"]),
    attention_level: parseLevel(row["注意力・正確性"] || row["注意力適性"]),
    communication_level: parseLevel(row["対人度"] || row["対人適性"]),
    difficulty: parseLevel(row["難易度"]),
    growth: parseLevel(row["成長余地"] || row["成長ポテンシャル"]),
  } as unknown as PublicJobPosting
}

async function fetchSheetJobs(): Promise<PublicJobPosting[]> {
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(SHEET_NAME)}`
  const res = await fetch(url, { cache: "no-store" })

  if (!res.ok) {
    throw new Error(`スプレッドシート取得失敗: ${res.status}`)
  }

  const rows = (await res.json()) as SheetJobRow[]

  return rows
    .filter((row) => row["職種名"] || row["求人名"])
    .map(rowToJob)
}

const badgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#374151",
  fontSize: 12,
  fontWeight: 700,
}

function JobCard({ job }: { job: RecommendedJobWithSheet }) {
  return (
    <article
      style={{
        border: job.isDreamPick ? "2px solid #22c55e" : "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 16,
        background: "#fff",
        boxShadow: job.isDreamPick
          ? "0 12px 30px rgba(34,197,94,0.16)"
          : "0 8px 24px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: 999,
          background: job.isDreamPick ? "#dcfce7" : "#ecfdf3",
          color: "#166534",
          fontSize: 12,
          fontWeight: 800,
          marginBottom: 8,
        }}
      >
        {job.positionLabel}
      </div>

      <p style={{ color: "#6b7280", fontSize: 13 }}>非公開求人</p>

      <h3 style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>
        {job.job_title}
      </h3>

      <p style={{ marginTop: 8, color: "#111827", fontWeight: 800 }}>
        適性目安：{job.matchPercent}%
      </p>

      <p style={{ marginTop: 10, lineHeight: 1.7, color: "#374151" }}>
        {job.reason}
      </p>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gap: 6,
          fontSize: 14,
          color: "#374151",
        }}
      >
        <p>勤務地：{job.prefecture ?? "-"} {job.city ?? ""}</p>
        <p>給与：{yen(job.salary_min)}〜{yen(job.salary_max)}</p>
        <p>雇用形態：{job.employment_type}</p>
        <p>職種：{job.hiring_category} / {job.occupation_name ?? "-"}</p>
        <p>日本語レベル：{job.japanese_level_required ?? "-"}</p>
      </div>

      {(job.salary_year_1 || job.salary_year_3 || job.salary_year_5 || job.growth_route) && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 800, color: "#166534", marginBottom: 6 }}>
            この案件の年収ルート
          </div>
          {job.growth_route && <p>成長ルート：{job.growth_route}</p>}
          <p>1年後：{yen(job.salary_year_1)}</p>
          <p>3年後：{yen(job.salary_year_3)}</p>
          <p>5年後：{yen(job.salary_year_5)}</p>
          {job.salary_growth_note && <p>補足：{job.salary_growth_note}</p>}
          {job.required_step && <p>必要なこと：{job.required_step}</p>}
        </div>
      )}

      {job.fit_person && (
        <p style={{ marginTop: 12, color: "#374151", lineHeight: 1.7 }}>
          向いている人：{job.fit_person}
        </p>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {job.accepts_inexperienced && <span style={badgeStyle}>未経験OK</span>}
        {job.dormitory_available && <span style={badgeStyle}>寮あり</span>}
        {job.relocation_support && <span style={badgeStyle}>引越支援あり</span>}
        {job.foreign_nationality_friendly && <span style={badgeStyle}>外国籍歓迎</span>}
      </div>
    </article>
  )
}

function RouteSection({
  title,
  description,
  jobs,
}: {
  title: string
  description: string
  jobs: RecommendedJobWithSheet[]
}) {
  if (jobs.length === 0) return null

  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
        {title}
      </h2>
      <p style={{ color: "#6b7280", lineHeight: 1.7, marginBottom: 12 }}>
        {description}
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </section>
  )
}

function getDreamJob(user: DiagnosisUser | null) {
  return user?.dreamRecommendedJob || user?.recommendedJob || "未定"
}

function getPersonalityJob(user: DiagnosisUser | null) {
  return user?.personalityRecommendedJob || user?.recommendedJob || "未定"
}

export default function JobsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userInfo, setUserInfo] = useState<DiagnosisUser | null>(null)
  const [recommended, setRecommended] = useState<RecommendedJobWithSheet[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const jobsData = await fetchSheetJobs()
        const stored = localStorage.getItem("diagnosisResult")

        const user: DiagnosisUser = stored
          ? JSON.parse(stored)
          : {
              continuity: 50,
              change: 50,
              attention: 50,
              communication: 50,
              recommendedJob: "未定",
              personalityRecommendedJob: "未定",
              dreamRecommendedJob: "未定",
              region: "全国どこでもOK",
              experience: "未経験",
            }

        const matched = getRecommendedJobs(jobsData, user) as RecommendedJobWithSheet[]

        setUserInfo(user)
        setRecommended(matched)
      } catch (e) {
        console.error(e)
        setError("求人情報を読み込めませんでした。スプレッドシートの公開設定・シート名を確認してください。")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const topPickJobs = useMemo(() => {
    const dreamPicks = recommended.filter((job) => job.isDreamPick)
    if (dreamPicks.length > 0) return dreamPicks.slice(0, 2)
    return recommended.slice(0, 1)
  }, [recommended])

  const topPickIds = useMemo(() => new Set(topPickJobs.map((job) => job.id)), [topPickJobs])
  const otherJobs = recommended.filter((job) => !topPickIds.has(job.id))

  const stableJobs = otherJobs.filter((job) => job.route === "stable")
  const careerJobs = otherJobs.filter((job) => job.route === "career_up")
  const balanceJobs = otherJobs.filter((job) => job.route === "balance")

  if (loading) {
    return <main style={{ padding: 24 }}>求人を読み込み中...</main>
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <section
          style={{
            background: "#111827",
            color: "#fff",
            borderRadius: 22,
            padding: 22,
          }}
        >
          <p style={{ fontSize: 13, opacity: 0.8, fontWeight: 700 }}>
            診断結果から見る
          </p>

          <h1 style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>
            あなたの夢に近づくおすすめルート
          </h1>

          {userInfo && (
            <div
              style={{
                marginTop: 16,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: 14,
                display: "grid",
                gap: 6,
                fontSize: 14,
              }}
            >
              <p>性格診断的に合いやすい業種：{getPersonalityJob(userInfo)}</p>
              <p>夢を叶えるためのおすすめ業種：{getDreamJob(userInfo)}</p>
              <p>希望地域：{userInfo.region ?? "未定"}</p>
              <p>経験：{userInfo.experience ?? "未経験"}</p>
            </div>
          )}

          <p style={{ marginTop: 14, lineHeight: 1.8, opacity: 0.9 }}>
            ここでは「今すぐ応募できるか」だけでなく、
            あなたの生活・収入・将来像に近づくためのルートとして求人を整理しています。
          </p>
        </section>

        {error ? (
          <section
            style={{
              marginTop: 24,
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #f59e0b",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              求人情報を読み込めませんでした
            </h2>
            <p style={{ marginTop: 8, color: "#92400e", lineHeight: 1.7 }}>
              {error}
            </p>
          </section>
        ) : recommended.length === 0 ? (
          <section
            style={{
              marginTop: 24,
              background: "#fff",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #e5e7eb",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>
              現在表示できる求人がありません
            </h2>
            <p style={{ marginTop: 8, color: "#6b7280", lineHeight: 1.7 }}>
              条件を少し広げると、あなたに合うルートが見つかる可能性があります。
            </p>
          </section>
        ) : (
          <>
            <RouteSection
              title="まず一番に見てほしい本命ルート"
              description="診断で出た「夢を叶えるためのおすすめ業種」に近い案件です。生活・収入・将来像から逆算して、最初に比較してほしい求人を上に出しています。"
              jobs={topPickJobs}
            />

            <RouteSection
              title="今すぐ安定を作るルート"
              description="未経験から始めやすく、まず生活基盤を整えたい人に向いた案件です。"
              jobs={stableJobs}
            />

            <RouteSection
              title="収入アップを目指すルート"
              description="将来的な年収アップやスキル形成を狙う人に向いた案件です。"
              jobs={careerJobs}
            />

            <RouteSection
              title="働きやすさと安定のバランスルート"
              description="経験や対人力を活かしながら、無理なく続けやすい働き方を目指す案件です。"
              jobs={balanceJobs}
            />
          </>
        )}

        <button
          onClick={() => (window.location.href = "/")}
          style={{
            marginTop: 28,
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "1px solid #d1d5db",
            background: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          もう一度診断する
        </button>
      </div>
    </main>
  )
}