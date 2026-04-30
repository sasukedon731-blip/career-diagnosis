export type Purpose =
  | '私生活重視'
  | '収入重視'
  | '安定重視'
  | 'スキル重視'
  | '未定'

export type LifePlan = '独身' | '夫婦' | '家族あり'
export type FreeMoney = '5万円' | '10万円' | '20万円以上' | '気にしない'
export type TargetYears = '3年' | '5年' | '10年' | '未定'
export type Experience = '未経験' | '1年未満' | '1〜3年' | '3年以上'
export type WorkLevel = '指示通り' | '自分で判断' | '管理・指導'
export type WorkStyle = 'ルーチン' | '変化対応'
export type AgeRange = '18〜24歳' | '25〜29歳' | '30〜34歳' | '35〜39歳' | '40歳以上'
export type RegionChoice = '全国どこでもOK' | '地方' | '東京' | '大阪' | '名古屋' | '福岡'

export type JobProfile = {
  id: string
  job_name: string
  base_salary: number
  bonus: number
  raise_rate: number
  overtime_hours?: number
  routine_level?: number
  teamwork_level?: number
  stress_level?: number
}

export type RegionCost = {
  id: string
  prefecture: string
  single_cost: number
  couple_cost: number
  family_cost: number
}

export type Answers = {
  purpose: Purpose
  life: LifePlan
  money: FreeMoney
  years: TargetYears
  region: RegionChoice
  job: string
  age: AgeRange
  exp: Experience
  level: WorkLevel
  type: WorkStyle
}

export type PsychologyAnswers = Record<string, string>

export type PsychologyScore = {
  a: number
  b: number
  c: number
  d: number
}

export type DiagnosisResult = {
  requiredAnnualIncome: number
  estimatedAnnualIncome: number
  annualCost: number
  annualSaving: number
  achievementRate: number
  judgement: string
  recommendedJob: string
  personalityRecommendedJob: string
  dreamRecommendedJob: string
  personalityReason: string
  dreamReason: string
  recommendationGap: boolean
  recommendationMessage: string
  careerRouteType: 'same' | 'step_up' | 'challenge' | 'rebuild'
  message: string
  psychologyScore: PsychologyScore
  psychologyTypeSummary: string
  bottleneck: string
  actionPlan: string
  internalRegionForCalc: string
}

function normalizeScore(score: number) {
  return Math.max(20, Math.min(100, score))
}

function mapRegionToMaster(region: RegionChoice): string {
  switch (region) {
    case '全国どこでもOK':
    case '地方':
    case '名古屋':
      return '地方平均'
    case '東京':
      return '東京'
    case '大阪':
      return '大阪'
    case '福岡':
      return '福岡'
    default:
      return '地方平均'
  }
}

function getRequiredAnnualIncome(life: LifePlan, money: FreeMoney, regionCost: RegionCost) {
  const baseCost =
    life === '独身'
      ? regionCost.single_cost * 12
      : life === '夫婦'
      ? regionCost.couple_cost * 12
      : regionCost.family_cost * 12

  const freeMoneyPerMonth =
    money === '5万円' ? 50000 : money === '10万円' ? 100000 : money === '20万円以上' ? 200000 : 30000

  return baseCost + freeMoneyPerMonth * 12
}

function getExperienceMultiplier(exp: Experience) {
  switch (exp) {
    case '未経験': return 0.85
    case '1年未満': return 0.93
    case '1〜3年': return 1.0
    case '3年以上': return 1.1
    default: return 1.0
  }
}

function getLevelMultiplier(level: WorkLevel) {
  switch (level) {
    case '指示通り': return 0.95
    case '自分で判断': return 1.0
    case '管理・指導': return 1.1
    default: return 1.0
  }
}

function getYearsMultiplier(years: TargetYears) {
  switch (years) {
    case '3年': return 0.95
    case '5年': return 1.0
    case '10年': return 1.1
    case '未定': return 1.0
    default: return 1.0
  }
}

function getAgeMultiplier(age: AgeRange, exp: Experience, job: string) {
  if (job === '未定') return 1.0

  if (exp === '未経験') {
    switch (age) {
      case '18〜24歳': return 1.05
      case '25〜29歳': return 1.0
      case '30〜34歳': return 0.95
      case '35〜39歳': return 0.9
      case '40歳以上': return 0.82
      default: return 1.0
    }
  }

  switch (age) {
    case '18〜24歳': return 0.98
    case '25〜29歳': return 1.0
    case '30〜34歳': return 1.02
    case '35〜39歳': return 1.0
    case '40歳以上': return 0.95
    default: return 1.0
  }
}

export function scorePsychology(answers: PsychologyAnswers): PsychologyScore {
  let a = 50
  let b = 50
  let c = 50
  let d = 50

  Object.entries(answers).forEach(([id, value]) => {
    switch (id) {
      case 'p1': value === '説明書をしっかり読む' ? (c += 8) : (b += 8); break
      case 'p2': value === '苦ではない' ? (a += 8) : (b += 5); break
      case 'p3': value === 'すぐ確認する' ? (c += 8) : (c -= 5); break
      case 'p4': value === '対応できる' ? (b += 8) : (a += 2); break
      case 'p5': value === '得意' ? (c += 8) : (c -= 5); break
      case 'p6': value === '多い' ? (d += 8) : (d -= 2); break
      case 'p7': value === 'むしろやりがいを感じる' ? (b += 8) : (a += 2); break
      case 'p8': value === 'はい' ? (a += 8) : (a -= 5); break
      case 'p9': value === 'する' ? (c += 5) : (b += 4); break
      case 'p10': value === '継続できる' ? (a += 8) : (a -= 5); break
      default: break
    }
  })

  return {
    a: normalizeScore(a),
    b: normalizeScore(b),
    c: normalizeScore(c),
    d: normalizeScore(d),
  }
}

function getPsychologyTypeSummary(score: PsychologyScore) {
  const strong: string[] = []
  if (score.a >= 65) strong.push('継続力')
  if (score.b >= 65) strong.push('変化対応力')
  if (score.c >= 65) strong.push('注意力')
  if (score.d >= 65) strong.push('調整力')
  return strong.length ? `${strong.join('・')}が強み` : 'バランス型'
}

function getJobFitRaw(jobName: string, score: PsychologyScore) {
  switch (jobName) {
    case '製造': return score.a * 0.6 + score.c * 0.8
    case '保守メンテ': return score.b * 0.8 + score.c * 0.6
    case '施工管理': return score.b * 0.7 + score.d * 0.8
    case '事務': return score.a * 0.5 + score.c * 0.8 + score.d * 0.4
    default: return (score.a + score.b + score.c + score.d) / 2
  }
}

function getJobFitBonus(jobName: string, score: PsychologyScore) {
  return Math.round((getJobFitRaw(jobName, score) - 50) / 6)
}

function getRecommendedJobByPsychology(score: PsychologyScore, jobs: JobProfile[]) {
  const available = jobs.length
    ? jobs.map((job) => ({ job: job.job_name, fit: getJobFitRaw(job.job_name, score) }))
    : [
        { job: '製造', fit: getJobFitRaw('製造', score) },
        { job: '保守メンテ', fit: getJobFitRaw('保守メンテ', score) },
        { job: '施工管理', fit: getJobFitRaw('施工管理', score) },
        { job: '事務', fit: getJobFitRaw('事務', score) },
      ]

  available.sort((x, y) => y.fit - x.fit)
  return available[0]?.job ?? '製造'
}

function estimateAnnualIncomeForJob(job: JobProfile, answers: Answers) {
  return Math.round(
    (job.base_salary + job.bonus) *
      getExperienceMultiplier(answers.exp) *
      getLevelMultiplier(answers.level) *
      getYearsMultiplier(answers.years) *
      getAgeMultiplier(answers.age, answers.exp, job.job_name)
  )
}

function getJudgement(achievementRate: number) {
  if (achievementRate >= 85) return '実現可能性が高い'
  if (achievementRate < 60) return '条件の見直しが必要'
  return '少し厳しい'
}

function getAchievementRate(
  estimatedAnnualIncome: number,
  requiredAnnualIncome: number,
  jobName: string,
  answers: Answers,
  psychologyScore: PsychologyScore
) {
  let rate = Math.round((estimatedAnnualIncome / requiredAnnualIncome) * 100)
  rate += getJobFitBonus(jobName, psychologyScore)

  if (answers.purpose === '私生活重視' && psychologyScore.a >= 65) rate += 2
  if (answers.purpose === '収入重視' && psychologyScore.b >= 65) rate += 2
  if (answers.region === '全国どこでもOK') rate += 3
  if (answers.region === '東京') rate -= 3

  return Math.max(20, Math.min(95, rate))
}

function getPersonalityReason(jobName: string, score: PsychologyScore) {
  if (jobName === '製造') return '継続力や注意力を活かしやすく、コツコツ積み上げる働き方に合いやすい傾向があります。'
  if (jobName === '保守メンテ') return '変化対応力と注意力を活かしやすく、現場の違和感に気づく力が武器になりやすいです。'
  if (jobName === '施工管理') return '変化対応力や対人調整力を活かしやすく、人や現場を動かす役割に向きやすい傾向があります。'
  if (jobName === '事務') return '注意力や調整力を活かしやすく、正確さとサポート力が評価されやすい働き方です。'
  return `${getPsychologyTypeSummary(score)}のため、${jobName}に適性が出ています。`
}

function getDreamRecommendation(
  jobs: JobProfile[],
  answers: Answers,
  requiredAnnualIncome: number,
  psychologyScore: PsychologyScore,
  personalityRecommendedJob: string
) {
  const candidates = jobs.map((job) => {
    const income = estimateAnnualIncomeForJob(job, answers)
    const achievementRate = getAchievementRate(income, requiredAnnualIncome, job.job_name, answers, psychologyScore)
    const fit = getJobFitRaw(job.job_name, psychologyScore)
    const isUserHope = job.job_name === answers.job
    const isPersonalityFit = job.job_name === personalityRecommendedJob

    let score = achievementRate * 1.25 + fit * 0.35
    if (isUserHope) score += 4
    if (isPersonalityFit) score += 6

    if (achievementRate < 75) score -= 18
    if (achievementRate >= 85) score += 12
    if (achievementRate >= 90) score += 8

    return { job, income, achievementRate, fit, score }
  })

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0] ?? null
}

function buildBottleneck(achievementRate: number, requiredAnnualIncome: number, estimatedAnnualIncome: number, answers: Answers) {
  const gap = requiredAnnualIncome - estimatedAnnualIncome

  if (achievementRate >= 85) return '大きなボトルネックはありません。現在の条件でも十分に狙える水準です。'
  if (gap > 1000000) return '主なボトルネックは、希望する生活水準に対して想定年収がまだ不足している点です。'
  if (gap > 0) return '主なボトルネックは、希望する生活に対して収入が少し届いていない点です。'
  if (answers.exp === '未経験') return '主なボトルネックは、未経験からの立ち上がりに時間がかかる点です。'
  if (answers.age === '35〜39歳' || answers.age === '40歳以上') return '主なボトルネックは、年齢と経験の組み合わせ上、キャリアチェンジの難易度が上がる点です。'
  if (answers.region === '東京') return '主なボトルネックは、生活コストの高い地域を希望している点です。'

  return '主なボトルネックは、期限・地域・職種条件を同時に満たす難易度がやや高い点です。'
}

function buildActionPlan(achievementRate: number, personalityJob: string, dreamJob: string, answers: Answers) {
  if (personalityJob !== dreamJob) {
    return `性格的には${personalityJob}が合いやすい一方で、夢に近づくには${dreamJob}も候補に入れるのがおすすめです。まずは入りやすい仕事で経験を作り、収入が伸びる役割へ移るルートが現実的です。`
  }

  if (achievementRate >= 85) return `今の方向性で進みつつ、${dreamJob}で経験の積み上げと資格取得を並行すると、さらに安定して目標に近づけます。`
  if (achievementRate >= 60) return `まずは${dreamJob}で経験を積みながら、地域条件か役割レベルを少し広げると現実性が高まります。`
  if (answers.region !== '全国どこでもOK') return `打ち手としては、地域条件を少し広げることと、${dreamJob}の方向に寄せることが有効です。`

  return `打ち手としては、${dreamJob}に寄せて経験を積み、目標年数を現実的に再設定するのが最短ルートです。`
}

function getCareerRouteType(personalityJob: string, dreamJob: string, achievementRate: number): DiagnosisResult['careerRouteType'] {
  if (personalityJob === dreamJob && achievementRate >= 85) return 'same'
  if (personalityJob === dreamJob) return 'step_up'
  if (achievementRate >= 70) return 'challenge'
  return 'rebuild'
}

function buildDreamReason(dreamJob: string, personalityJob: string, achievementRate: number, annualSaving: number) {
  if (dreamJob === personalityJob && achievementRate >= 85) {
    return `性格面でも生活目標面でも${dreamJob}が近いです。この方向で経験とスキルを積むと、夢に近づきやすい状態です。`
  }

  if (dreamJob === personalityJob) {
    return `性格面では${dreamJob}が合っています。ただし達成率はまだ伸ばせるため、資格・経験・勤務地の選択で収入を上げる必要があります。`
  }

  if (annualSaving < 0) {
    return `${personalityJob}は性格的に合いやすいですが、今の条件では生活収支が赤字になりやすいです。夢を叶えるには、収入が伸びやすい${dreamJob}も検討する価値があります。`
  }

  if (achievementRate < 85) {
    return `${personalityJob}は適性面で合いやすい一方、夢の実現にはもう一段収入を伸ばす必要があります。${dreamJob}はそのための挑戦ルートです。`
  }

  return `夢の実現から逆算すると、${dreamJob}が最も近いルートです。性格的に合う仕事と合わせて比較すると、より納得感のある選択ができます。`
}

export function runDiagnosis(
  answers: Answers,
  jobs: JobProfile[],
  regions: RegionCost[],
  psychologyAnswers: PsychologyAnswers = {}
): DiagnosisResult | null {
  const internalRegionForCalc = mapRegionToMaster(answers.region)
  const selectedRegion = regions.find((r) => r.prefecture === internalRegionForCalc)
  if (!selectedRegion) return null

  const availableJobs = jobs.length ? jobs : []
  const selectedJob = availableJobs.find((j) => j.job_name === answers.job) ?? availableJobs[0]
  if (!selectedJob) return null

  const requiredAnnualIncome = getRequiredAnnualIncome(answers.life, answers.money, selectedRegion)
  const annualCost =
    answers.life === '独身'
      ? selectedRegion.single_cost * 12
      : answers.life === '夫婦'
      ? selectedRegion.couple_cost * 12
      : selectedRegion.family_cost * 12

  const psychologyScore = scorePsychology(psychologyAnswers)
  const personalityRecommendedJob = getRecommendedJobByPsychology(psychologyScore, availableJobs)
  const dreamCandidate = getDreamRecommendation(
    availableJobs,
    answers,
    requiredAnnualIncome,
    psychologyScore,
    personalityRecommendedJob
  )

  const dreamJob = dreamCandidate?.job ?? selectedJob
  const dreamRecommendedJob = dreamJob.job_name
  const estimatedAnnualIncome = dreamCandidate?.income ?? estimateAnnualIncomeForJob(dreamJob, answers)
  const annualSaving = estimatedAnnualIncome - annualCost
  const achievementRate = dreamCandidate?.achievementRate ?? getAchievementRate(estimatedAnnualIncome, requiredAnnualIncome, dreamRecommendedJob, answers, psychologyScore)
  const judgement = getJudgement(achievementRate)

  const recommendationGap = personalityRecommendedJob !== dreamRecommendedJob
  const psychologyTypeSummary = getPsychologyTypeSummary(psychologyScore)
  const personalityReason = getPersonalityReason(personalityRecommendedJob, psychologyScore)
  const dreamReason = buildDreamReason(dreamRecommendedJob, personalityRecommendedJob, achievementRate, annualSaving)
  const careerRouteType = getCareerRouteType(personalityRecommendedJob, dreamRecommendedJob, achievementRate)

  const bottleneck = buildBottleneck(achievementRate, requiredAnnualIncome, estimatedAnnualIncome, answers)
  const actionPlan = buildActionPlan(achievementRate, personalityRecommendedJob, dreamRecommendedJob, answers)

  const recommendationMessage = recommendationGap
    ? `性格診断では${personalityRecommendedJob}が合いやすいですが、夢や生活目標から逆算すると${dreamRecommendedJob}も有力です。希望を否定するのではなく、「合う仕事」と「夢に近づく仕事」を分けて考えるのがおすすめです。`
    : `性格診断と夢の実現ルートの両方で、${dreamRecommendedJob}が近い結果です。あとは経験・資格・勤務地の選び方で達成率を高めていきましょう。`

  const message =
    `総合判断として、夢に近づくルートでの達成可能性は ${achievementRate}% です。\n\n` +
    `現状評価：${judgement}。\n` +
    `心理傾向：${psychologyTypeSummary}。\n\n` +
    `性格診断的には：${personalityRecommendedJob}\n` +
    `夢を叶えるためには：${dreamRecommendedJob}\n\n` +
    `ボトルネック：${bottleneck}\n\n` +
    `提案：${actionPlan}`

  return {
    requiredAnnualIncome,
    estimatedAnnualIncome,
    annualCost,
    annualSaving,
    achievementRate,
    judgement,
    recommendedJob: dreamRecommendedJob,
    personalityRecommendedJob,
    dreamRecommendedJob,
    personalityReason,
    dreamReason,
    recommendationGap,
    recommendationMessage,
    careerRouteType,
    message,
    psychologyScore,
    psychologyTypeSummary,
    bottleneck,
    actionPlan,
    internalRegionForCalc,
  }
}
