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
      return '地方平均'
    case '地方':
      return '地方平均'
    case '東京':
      return '東京'
    case '大阪':
      return '大阪'
    case '名古屋':
      return '地方平均'
    case '福岡':
      return '福岡'
    default:
      return '地方平均'
  }
}

function getRequiredAnnualIncome(
  life: LifePlan,
  money: FreeMoney,
  regionCost: RegionCost
) {
  const baseCost =
    life === '独身'
      ? regionCost.single_cost * 12
      : life === '夫婦'
      ? regionCost.couple_cost * 12
      : regionCost.family_cost * 12

  const freeMoneyPerMonth =
    money === '5万円' ? 50000 :
    money === '10万円' ? 100000 :
    money === '20万円以上' ? 200000 :
    30000

  return baseCost + freeMoneyPerMonth * 12
}

function getExperienceMultiplier(exp: Experience) {
  switch (exp) {
    case '未経験':
      return 0.85
    case '1年未満':
      return 0.93
    case '1〜3年':
      return 1.0
    case '3年以上':
      return 1.1
    default:
      return 1.0
  }
}

function getLevelMultiplier(level: WorkLevel) {
  switch (level) {
    case '指示通り':
      return 0.95
    case '自分で判断':
      return 1.0
    case '管理・指導':
      return 1.1
    default:
      return 1.0
  }
}

function getYearsMultiplier(years: TargetYears) {
  switch (years) {
    case '3年':
      return 0.95
    case '5年':
      return 1.0
    case '10年':
      return 1.1
    case '未定':
      return 1.0
    default:
      return 1.0
  }
}

function getAgeMultiplier(age: AgeRange, exp: Experience, job: string) {
  if (job === '未定') return 1.0

  if (exp === '未経験') {
    switch (age) {
      case '18〜24歳':
        return 1.05
      case '25〜29歳':
        return 1.0
      case '30〜34歳':
        return 0.95
      case '35〜39歳':
        return 0.9
      case '40歳以上':
        return 0.82
      default:
        return 1.0
    }
  }

  switch (age) {
    case '18〜24歳':
      return 0.98
    case '25〜29歳':
      return 1.0
    case '30〜34歳':
      return 1.02
    case '35〜39歳':
      return 1.0
    case '40歳以上':
      return 0.95
    default:
      return 1.0
  }
}

export function scorePsychology(answers: PsychologyAnswers): PsychologyScore {
  let a = 50
  let b = 50
  let c = 50
  let d = 50

  Object.entries(answers).forEach(([id, value]) => {
    switch (id) {
      case 'p1':
        if (value === '説明書をしっかり読む') c += 8
        else b += 8
        break
      case 'p2':
        if (value === '苦ではない') a += 8
        else b += 5
        break
      case 'p3':
        if (value === 'すぐ確認する') c += 8
        else c -= 5
        break
      case 'p4':
        if (value === '対応できる') b += 8
        else a += 2
        break
      case 'p5':
        if (value === '得意') c += 8
        else c -= 5
        break
      case 'p6':
        if (value === '多い') d += 8
        else d -= 2
        break
      case 'p7':
        if (value === 'むしろやりがいを感じる') b += 8
        else a += 2
        break
      case 'p8':
        if (value === 'はい') a += 8
        else a -= 5
        break
      case 'p9':
        if (value === 'する') c += 5
        else b += 4
        break
      case 'p10':
        if (value === '継続できる') a += 8
        else a -= 5
        break
      default:
        break
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

function getJobFitBonus(jobName: string, score: PsychologyScore) {
  switch (jobName) {
    case '製造':
      return Math.round((score.a * 0.6 + score.c * 0.8 - 50) / 6)
    case '保守メンテ':
      return Math.round((score.b * 0.8 + score.c * 0.6 - 50) / 6)
    case '施工管理':
      return Math.round((score.b * 0.7 + score.d * 0.8 - 50) / 6)
    case '事務':
      return Math.round((score.a * 0.5 + score.c * 0.8 + score.d * 0.4 - 50) / 6)
    default:
      return 0
  }
}

function getRecommendedJobByPsychology(score: PsychologyScore) {
  const candidates = [
    { job: '製造', fit: score.a * 0.6 + score.c * 0.8 },
    { job: '保守メンテ', fit: score.b * 0.8 + score.c * 0.6 },
    { job: '施工管理', fit: score.b * 0.7 + score.d * 0.8 },
    { job: '事務', fit: score.a * 0.5 + score.c * 0.8 + score.d * 0.4 },
  ]
  candidates.sort((x, y) => y.fit - x.fit)
  return candidates[0]?.job ?? '製造'
}

function buildBottleneck(
  achievementRate: number,
  requiredAnnualIncome: number,
  estimatedAnnualIncome: number,
  answers: Answers
) {
  const gap = requiredAnnualIncome - estimatedAnnualIncome

  if (achievementRate >= 85) {
    return '大きなボトルネックはありません。現在の条件でも十分に狙える水準です。'
  }

  if (gap > 1000000) {
    return '主なボトルネックは、希望する生活水準に対して想定年収がまだ不足している点です。'
  }

  if (answers.exp === '未経験') {
    return '主なボトルネックは、未経験からの立ち上がりに時間がかかる点です。'
  }

  if (answers.age === '35〜39歳' || answers.age === '40歳以上') {
    return '主なボトルネックは、年齢と経験の組み合わせ上、キャリアチェンジの難易度が上がる点です。'
  }

  if (answers.region === '東京') {
    return '主なボトルネックは、生活コストの高い地域を希望している点です。'
  }

  return '主なボトルネックは、期限・地域・職種条件を同時に満たす難易度がやや高い点です。'
}

function buildActionPlan(
  achievementRate: number,
  recommendedJob: string,
  answers: Answers
) {
  if (achievementRate >= 85) {
    return '今の方向性で進みつつ、経験の積み上げと資格取得を並行すると、さらに安定して目標に近づけます。'
  }

  if (achievementRate >= 60) {
    return 'まずは現在の希望職種で経験を積みながら、地域条件か役割レベルを少し広げると現実性が高まります。'
  }

  if (answers.region !== '全国どこでもOK') {
    return `打ち手としては、地域条件を少し広げることと、${recommendedJob}の方向に寄せることが有効です。`
  }

  return `打ち手としては、${recommendedJob}に寄せて経験を積み、目標年数を現実的に再設定するのが最短ルートです。`
}

export function runDiagnosis(
  answers: Answers,
  jobs: JobProfile[],
  regions: RegionCost[],
  psychologyAnswers: PsychologyAnswers = {}
) {
  const internalRegionForCalc = mapRegionToMaster(answers.region)
  const selectedJob = jobs.find((j) => j.job_name === answers.job)
  const selectedRegion = regions.find((r) => r.prefecture === internalRegionForCalc)
  if (!selectedRegion) return null

  const fallbackJob = jobs[0]
  const job = selectedJob || fallbackJob
  if (!job) return null

  const requiredAnnualIncome = getRequiredAnnualIncome(
    answers.life,
    answers.money,
    selectedRegion
  )

  const estimatedAnnualIncomeBase = job.base_salary + job.bonus
  const psychologyScore = scorePsychology(psychologyAnswers)
  const psychologyBonus = getJobFitBonus(job.job_name, psychologyScore)

  const estimatedAnnualIncome = Math.round(
    estimatedAnnualIncomeBase *
      getExperienceMultiplier(answers.exp) *
      getLevelMultiplier(answers.level) *
      getYearsMultiplier(answers.years) *
      getAgeMultiplier(answers.age, answers.exp, answers.job)
  )

  const annualCost =
    answers.life === '独身'
      ? selectedRegion.single_cost * 12
      : answers.life === '夫婦'
      ? selectedRegion.couple_cost * 12
      : selectedRegion.family_cost * 12

  const annualSaving = estimatedAnnualIncome - annualCost

  let achievementRate = Math.round((estimatedAnnualIncome / requiredAnnualIncome) * 100)
  achievementRate += psychologyBonus

  if (answers.purpose === '私生活重視' && psychologyScore.a >= 65) achievementRate += 2
  if (answers.purpose === '収入重視' && psychologyScore.b >= 65) achievementRate += 2
  if (answers.region === '全国どこでもOK') achievementRate += 3
  if (answers.region === '東京') achievementRate -= 3

  achievementRate = Math.max(20, Math.min(95, achievementRate))

  let judgement = '少し厳しい'
  if (achievementRate >= 85) judgement = '実現可能性が高い'
  if (achievementRate < 60) judgement = '条件の見直しが必要'

  const recommendedJob =
    achievementRate >= 60 ? job.job_name : getRecommendedJobByPsychology(psychologyScore)

  const psychologyTypeSummary = getPsychologyTypeSummary(psychologyScore)
  const bottleneck = buildBottleneck(
    achievementRate,
    requiredAnnualIncome,
    estimatedAnnualIncome,
    answers
  )
  const actionPlan = buildActionPlan(achievementRate, recommendedJob, answers)

  const message =
    `総合判断として、現在の条件での達成可能性は ${achievementRate}% です。\n\n` +
    `現状評価：${judgement}。\n` +
    `心理傾向：${psychologyTypeSummary}。\n\n` +
    `ボトルネック：${bottleneck}\n\n` +
    `提案：${actionPlan}`

  return {
    requiredAnnualIncome,
    estimatedAnnualIncome,
    annualCost,
    annualSaving,
    achievementRate,
    judgement,
    recommendedJob,
    message,
    psychologyScore,
    psychologyTypeSummary,
    bottleneck,
    actionPlan,
    internalRegionForCalc,
  }
}