"use client"

import { useEffect, useState } from "react"
import type { PublicJobPosting } from "@/types/job"
import { getPublicJobPostings } from "@/lib/jobs"
import {
  getRecommendedJobs,
  type DiagnosisUser,
  type RecommendedJob,
} from "@/lib/match"

function yen(value: number | null) {
  if (value === null) return "-"
  return `${value.toLocaleString()}円`
}

function RouteSection({
  title,
  description,
  jobs,
}: {
  title: string
  description: string
  jobs: RecommendedJob[]
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
          <article
            key={job.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 16,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                background: "#ecfdf3",
                color: "#166534",
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              {job.positionLabel}
            </div>

            <p style={{ color: "#6b7280", fontSize: 13 }}>
              {job.public_company_name ?? "非公開企業"}
            </p>

            <h3 style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>
              {job.job_title}
            </h3>

            <p
              style={{
                marginTop: 8,
                color: "#111827",
                fontWeight: 800,
              }}
            >
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
              <p>
                勤務地：{job.prefecture ?? "-"} {job.city ?? ""}
              </p>
              <p>
                給与：{yen(job.salary_min)}〜{yen(job.salary_max)}
              </p>
              <p>雇用形態：{job.employment_type}</p>
              <p>職種：{job.hiring_category} / {job.occupation_name ?? "-"}</p>
              <p>日本語レベル：{job.japanese_level_required ?? "-"}</p>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {job.accepts_inexperienced && (
                <span style={badgeStyle}>未経験OK</span>
              )}
              {job.dormitory_available && (
                <span style={badgeStyle}>寮あり</span>
              )}
              {job.relocation_support && (
                <span style={badgeStyle}>引越支援あり</span>
              )}
              {job.foreign_nationality_friendly && (
                <span style={badgeStyle}>外国籍歓迎</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#374151",
  fontSize: 12,
  fontWeight: 700,
}

export default function JobsPage() {
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState<DiagnosisUser | null>(null)
  const [recommended, setRecommended] = useState<RecommendedJob[]>([])

  useEffect(() => {
    async function fetchData() {
      const jobsData: PublicJobPosting[] = await getPublicJobPostings()
      const stored = localStorage.getItem("diagnosisResult")

      const user: DiagnosisUser = stored
        ? JSON.parse(stored)
        : {
            continuity: 50,
            change: 50,
            attention: 50,
            communication: 50,
            recommendedJob: "未定",
            region: "全国どこでもOK",
            experience: "未経験",
          }

      const matched = getRecommendedJobs(jobsData, user)

      setUserInfo(user)
      setRecommended(matched)
      setLoading(false)
    }

    fetchData()
  }, [])

  const stableJobs = recommended.filter((job) => job.route === "stable")
  const careerJobs = recommended.filter((job) => job.route === "career_up")
  const balanceJobs = recommended.filter((job) => job.route === "balance")

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
              <p>おすすめ業種：{userInfo.recommendedJob ?? "未定"}</p>
              <p>希望地域：{userInfo.region ?? "未定"}</p>
              <p>経験：{userInfo.experience ?? "未定"}</p>
            </div>
          )}

          <p style={{ marginTop: 14, lineHeight: 1.8, opacity: 0.9 }}>
            ここでは「今すぐ応募できるか」だけでなく、
            あなたの生活・収入・将来像に近づくためのルートとして求人を整理しています。
          </p>
        </section>

        {recommended.length === 0 ? (
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
          onClick={() => window.location.href = "/"}
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