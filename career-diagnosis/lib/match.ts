import type { PublicJobPosting } from "@/types/job"

export type DiagnosisUser = {
  continuity: number
  change: number
  attention: number
  communication: number
  recommendedJob?: string
  region?: string
  experience?: string
  age?: string
}

export type CareerRoute = "stable" | "career_up" | "balance"

export type RecommendedJob = PublicJobPosting & {
  matchScore: number
  matchPercent: number
  route: CareerRoute
  routeLabel: string
  reason: string
  positionLabel: string
}

function getRoute(job: PublicJobPosting): CareerRoute {
  if (
    job.hiring_category === "施工管理" ||
    job.hiring_category === "保守メンテ"
  ) {
    return "career_up"
  }

  if (job.hiring_category === "事務") {
    return "balance"
  }

  return "stable"
}

function getRouteLabel(route: CareerRoute) {
  if (route === "career_up") return "収入アップルート"
  if (route === "balance") return "バランス重視ルート"
  return "生活安定ルート"
}

function getReason(job: PublicJobPosting, route: CareerRoute, user: DiagnosisUser) {
  if (route === "career_up") {
    return "将来的な収入アップやキャリア形成につながりやすいルートです。今すぐ完璧に合うというより、目標に近づくための挑戦案件としておすすめです。"
  }

  if (route === "balance") {
    return "働きやすさや対人面のバランスを取りやすいルートです。経験条件が合えば、長く安定して働きやすい可能性があります。"
  }

  if (user.experience === "未経験" && job.accepts_inexperienced) {
    return "未経験から始めやすく、まず安定収入を作る入口として現実的なルートです。生活基盤を整えながら次の選択肢を広げられます。"
  }

  return "安定した働き方を作りやすく、生活基盤を整えやすいルートです。"
}

function getPositionLabel(job: PublicJobPosting, user: DiagnosisUser) {
  if (job.hiring_category === user.recommendedJob) {
    return "診断結果に近い案件"
  }

  if (user.experience === "未経験" && job.accepts_inexperienced) {
    return "今すぐ挑戦しやすい案件"
  }

  return "将来的に検討したい案件"
}

function calculateMatchScore(job: PublicJobPosting, user: DiagnosisUser) {
  let score = 0

  const continuityTarget = (job.fit_continuity_min ?? 0) * 20
  const changeTarget = (job.fit_change_adapt_min ?? 0) * 20
  const attentionTarget = (job.fit_attention_min ?? 0) * 20
  const communicationTarget = (job.fit_communication_min ?? 0) * 20

  score += Math.max(0, 100 - Math.abs(user.continuity - continuityTarget))
  score += Math.max(0, 100 - Math.abs(user.change - changeTarget))
  score += Math.max(0, 100 - Math.abs(user.attention - attentionTarget))
  score += Math.max(0, 100 - Math.abs(user.communication - communicationTarget))

  if (job.hiring_category === user.recommendedJob) {
    score += 80
  }

  if (user.experience === "未経験" && job.accepts_inexperienced) {
    score += 50
  }

  if (user.experience !== "未経験" && job.minimum_experience_years !== null) {
    score += 20
  }

  if (user.region === "東京" && job.prefecture === "東京都") {
    score += 40
  }

  if (user.region === "大阪" && job.prefecture === "大阪府") {
    score += 40
  }

  if (user.region === "全国どこでもOK") {
    score += 20
  }

  if (job.estimated_monthly_income_max && job.estimated_monthly_income_max >= 280000) {
    score += 20
  }

  return score
}

export function getRecommendedJobs(
  jobs: PublicJobPosting[],
  user: DiagnosisUser
): RecommendedJob[] {
  return jobs
    .map((job) => {
      const route = getRoute(job)
      const rawScore = calculateMatchScore(job, user)
      const matchPercent = Math.min(99, Math.max(45, Math.round(rawScore / 5)))

      return {
        ...job,
        matchScore: rawScore,
        matchPercent,
        route,
        routeLabel: getRouteLabel(route),
        reason: getReason(job, route, user),
        positionLabel: getPositionLabel(job, user),
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
}