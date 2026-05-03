import type { PublicJobPosting } from "@/types/job"

export type DiagnosisUser = {
  continuity: number
  change: number
  attention: number
  communication: number
  recommendedJob: string
  personalityRecommendedJob?: string
  dreamRecommendedJob?: string
  region?: string
  experience?: string
  age?: string
}

export type JobRoute = "stable" | "career_up" | "balance"

export type RecommendedJob = PublicJobPosting & {
  matchPercent: number
  reason: string
  route: JobRoute
  positionLabel: string
  isDreamPick: boolean
}

type MatchableJob = PublicJobPosting & {
  routine_level?: number
  change_level?: number
  attention_level?: number
  communication_level?: number
  difficulty?: number
  growth?: number
  route?: JobRoute | string
  description?: string
  growth_route?: string | null
  salary_year_1?: number | null
  salary_year_3?: number | null
  salary_year_5?: number | null
  required_step?: string | null
  fit_person?: string | null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function toLevel(value: unknown, fallback = 3) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(1, Math.min(5, n))
}

function levelToScore(level: unknown) {
  return toLevel(level) * 20
}

function textIncludes(text: string | null | undefined, keyword: string | undefined) {
  if (!text || !keyword || keyword === "未定") return false
  return text.includes(keyword)
}

function normalizeRoute(value: unknown): JobRoute {
  const v = String(value ?? "")

  if (v === "stable" || v.includes("安定")) return "stable"
  if (v === "career_up" || v.includes("収入") || v.includes("挑戦") || v.includes("成長") || v.includes("将来")) {
    return "career_up"
  }

  return "balance"
}

function getDreamJob(user: DiagnosisUser) {
  return user.dreamRecommendedJob || user.recommendedJob || "未定"
}

function getPersonalityJob(user: DiagnosisUser) {
  return user.personalityRecommendedJob || user.recommendedJob || "未定"
}

function calcPersonalityScore(job: MatchableJob, user: DiagnosisUser) {
  const routineTarget = levelToScore(job.routine_level)
  const changeTarget = levelToScore(job.change_level)
  const attentionTarget = levelToScore(job.attention_level)
  const communicationTarget = levelToScore(job.communication_level)

  const continuityScore = 100 - Math.abs(routineTarget - user.continuity)
  const changeScore = 100 - Math.abs(changeTarget - user.change)
  const attentionScore = 100 - Math.abs(attentionTarget - user.attention)
  const communicationScore = 100 - Math.abs(communicationTarget - user.communication)

  return clamp(
    continuityScore * 0.3 +
      changeScore * 0.25 +
      attentionScore * 0.25 +
      communicationScore * 0.2
  )
}

function calcDreamScore(job: MatchableJob, user: DiagnosisUser) {
  const dreamJob = getDreamJob(user)
  const personalityJob = getPersonalityJob(user)

  let score = 50

  if (textIncludes(job.hiring_category, dreamJob)) score += 28
  if (textIncludes(job.occupation_name, dreamJob)) score += 24
  if (textIncludes(job.job_title, dreamJob)) score += 20

  if (textIncludes(job.hiring_category, personalityJob)) score += 10
  if (textIncludes(job.job_title, personalityJob)) score += 8

  const growth = toLevel(job.growth)
  const route = normalizeRoute(job.route)

  if (growth >= 4) score += 10
  if (route === "career_up") score += 8

  return clamp(score)
}

function calcRegionScore(job: MatchableJob, user: DiagnosisUser) {
  const region = user.region || "全国どこでもOK"

  if (region === "全国どこでもOK" || region === "未定") return 100
  if (job.prefecture?.includes(region)) return 100
  if (job.city?.includes(region)) return 90
  if (region === "地方" && job.prefecture && !["東京", "大阪", "名古屋", "福岡"].some((x) => job.prefecture?.includes(x))) {
    return 85
  }

  return 65
}

function calcDifficultyScore(job: MatchableJob, user: DiagnosisUser) {
  const difficulty = toLevel(job.difficulty)
  const exp = user.experience || "未経験"

  if (exp === "未経験") {
    if (difficulty >= 5) return 45
    if (difficulty === 4) return 60
    if (difficulty === 3) return 80
    return 95
  }

  if (exp === "1年未満") {
    if (difficulty >= 5) return 60
    if (difficulty === 4) return 75
    return 90
  }

  if (exp === "1〜3年") {
    if (difficulty >= 5) return 78
    return 92
  }

  return 95
}

function calcTotalScore(job: MatchableJob, user: DiagnosisUser) {
  const personalityScore = calcPersonalityScore(job, user)
  const dreamScore = calcDreamScore(job, user)
  const regionScore = calcRegionScore(job, user)
  const difficultyScore = calcDifficultyScore(job, user)

  const growthBonus = toLevel(job.growth) >= 4 ? 4 : 0
  const inexperiencedBonus = job.accepts_inexperienced && user.experience === "未経験" ? 4 : 0

  const total =
    personalityScore * 0.38 +
    dreamScore * 0.32 +
    regionScore * 0.15 +
    difficultyScore * 0.15 +
    growthBonus +
    inexperiencedBonus

  return clamp(Math.round(total), 1, 99)
}

function getStrongPoint(job: MatchableJob) {
  const values = [
    { label: "コツコツ続ける力", value: toLevel(job.routine_level) },
    { label: "変化に対応する力", value: toLevel(job.change_level) },
    { label: "正確に進める力", value: toLevel(job.attention_level) },
    { label: "人と調整する力", value: toLevel(job.communication_level) },
  ]

  return values.sort((a, b) => b.value - a.value)[0]?.label ?? "強み"
}

function createReason(job: MatchableJob, user: DiagnosisUser, matchPercent: number) {
  const dreamJob = getDreamJob(user)
  const personalityJob = getPersonalityJob(user)
  const route = normalizeRoute(job.route)
  const strongPoint = getStrongPoint(job)
  const growth = toLevel(job.growth)
  const difficulty = toLevel(job.difficulty)

  const routeText =
    route === "stable"
      ? "まず生活基盤を安定させやすいルートです。"
      : route === "career_up"
        ? "将来的な収入アップを狙いやすいルートです。"
        : "働きやすさと成長のバランスを取りやすいルートです。"

  const dreamText =
    textIncludes(job.hiring_category, dreamJob) ||
    textIncludes(job.occupation_name, dreamJob) ||
    textIncludes(job.job_title, dreamJob)
      ? `夢を叶えるためのおすすめ業種「${dreamJob}」に近い案件です。`
      : `性格的に合いやすい「${personalityJob}」から、将来の目標に近づくための比較候補です。`

  const growthText =
    growth >= 4
      ? "成長余地が高く、経験や資格によって年収を伸ばしやすい点も評価しています。"
      : "大きなジャンプよりも、無理なく積み上げる働き方に向いています。"

  const difficultyText =
    difficulty >= 4 && user.experience === "未経験"
      ? "ただし難易度はやや高めなので、最初は学習・資格・現場経験のサポートが重要です。"
      : "現在の経験値から見ても、挑戦しやすい範囲にあります。"

  return `${dreamText}
${routeText}
この案件は特に「${strongPoint}」を活かしやすく、総合マッチ度は${matchPercent}%です。
${growthText}
${difficultyText}`
}

function getPositionLabel(job: MatchableJob, isDreamPick: boolean) {
  if (isDreamPick) return "夢に近づく本命候補"

  const route = normalizeRoute(job.route)
  if (route === "stable") return "今すぐ安定候補"
  if (route === "career_up") return "収入アップ候補"
  return "バランス候補"
}

function isDreamPickJob(job: MatchableJob, user: DiagnosisUser) {
  const dreamJob = getDreamJob(user)
  if (dreamJob === "未定") return false

  return (
    textIncludes(job.hiring_category, dreamJob) ||
    textIncludes(job.occupation_name, dreamJob) ||
    textIncludes(job.job_title, dreamJob)
  )
}

export function getRecommendedJobs(
  jobs: PublicJobPosting[],
  user: DiagnosisUser
): RecommendedJob[] {
  return jobs
    .map((rawJob) => {
      const job = rawJob as MatchableJob
      const route = normalizeRoute(job.route)
      const isDreamPick = isDreamPickJob(job, user)
      const matchPercent = calcTotalScore(job, user)

      return {
        ...rawJob,
        route,
        matchPercent,
        isDreamPick,
        positionLabel: getPositionLabel(job, isDreamPick),
        reason: createReason(job, user, matchPercent),
      } as RecommendedJob
    })
    .sort((a, b) => {
      if (a.isDreamPick !== b.isDreamPick) return a.isDreamPick ? -1 : 1
      return b.matchPercent - a.matchPercent
    })
}