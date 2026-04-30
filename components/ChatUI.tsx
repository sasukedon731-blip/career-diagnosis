'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  type Answers,
  type JobProfile,
  type RegionCost,
  runDiagnosis,
  type PsychologyAnswers,
} from '@/lib/diagnosis'

type Message = {
  role: 'bot' | 'user'
  text: string
}

type ChoiceStep = {
  type: 'choice'
  key: keyof Answers
  question: string
  options: string[]
}

type TextStepKey = 'reason' | 'strength'

type TextStep = {
  type: 'text'
  key: TextStepKey
  question: string
  placeholder: string
}

type PsychStep = {
  type: 'psych'
  key: string
  question: string
  options: string[]
}

type Step = ChoiceStep | TextStep | PsychStep

const steps: Step[] = [
  {
    type: 'choice',
    key: 'purpose',
    question: '働く上で一番大事にしたいのはどれですか？',
    options: ['私生活重視', '収入重視', '安定重視', 'スキル重視', '未定'],
  },
  {
    type: 'text',
    key: 'reason',
    question: 'その選択をした理由を、よければ一言で教えてください。',
    placeholder: '例：家族との時間を大切にしたい',
  },
  {
    type: 'choice',
    key: 'life',
    question: '将来的な生活イメージを教えてください。',
    options: ['独身', '夫婦', '家族あり'],
  },
  {
    type: 'choice',
    key: 'money',
    question:
      'その生活を実現したときのイメージで、毎月どのくらい自由に使えるお金があると理想ですか？',
    options: ['5万円', '10万円', '20万円以上', '気にしない'],
  },
  {
    type: 'choice',
    key: 'years',
    question: 'その生活をいつまでに実現したいですか？',
    options: ['3年', '5年', '10年', '未定'],
  },
  {
    type: 'choice',
    key: 'region',
    question: '働く地域の希望を教えてください。',
    options: ['全国どこでもOK', '地方', '東京', '大阪', '名古屋', '福岡'],
  },
  {
    type: 'choice',
    key: 'job',
    question: 'やってみたい仕事はありますか？',
    options: ['製造', '保守メンテ', '施工管理', '事務', '未定'],
  },
  {
    type: 'choice',
    key: 'age',
    question: '差し支えなければ、現在の年齢に近いものを教えてください。',
    options: ['18〜24歳', '25〜29歳', '30〜34歳', '35〜39歳', '40歳以上'],
  },
  {
    type: 'choice',
    key: 'exp',
    question: 'これまでの仕事経験はどれに近いですか？',
    options: ['未経験', '1年未満', '1〜3年', '3年以上'],
  },
  {
    type: 'text',
    key: 'strength',
    question: '今までの経験の中で、自分に向いていると感じたことはありますか？',
    placeholder: '例：コツコツ続けること、トラブル対応 など',
  },
  {
    type: 'choice',
    key: 'level',
    question: '今までの仕事はどちらに近いですか？',
    options: ['指示通り', '自分で判断', '管理・指導'],
  },
  {
    type: 'choice',
    key: 'type',
    question: 'どちらの仕事の方が楽だと感じますか？',
    options: ['ルーチン', '変化対応'],
  },
  {
    type: 'psych',
    key: 'p1',
    question: '新しい作業を始めるとき、まずどうしますか？',
    options: ['説明書をしっかり読む', 'とりあえず触ってみる'],
  },
  {
    type: 'psych',
    key: 'p2',
    question: '同じ作業を繰り返す仕事についてどう感じますか？',
    options: ['苦ではない', '飽きやすい'],
  },
  {
    type: 'psych',
    key: 'p3',
    question: '機械の異音や違和感に気づいたときは？',
    options: ['すぐ確認する', 'あまり気にしない'],
  },
  {
    type: 'psych',
    key: 'p4',
    question: '急な予定変更があったときは？',
    options: ['対応できる', 'ストレスを感じる'],
  },
  {
    type: 'psych',
    key: 'p5',
    question: '細かいミスを見つけるのは？',
    options: ['得意', '苦手'],
  },
  {
    type: 'psych',
    key: 'p6',
    question: '人から相談されることは？',
    options: ['多い', '少ない'],
  },
  {
    type: 'psych',
    key: 'p7',
    question: 'トラブル対応は？',
    options: ['むしろやりがいを感じる', 'できれば避けたい'],
  },
  {
    type: 'psych',
    key: 'p8',
    question: 'コツコツ努力するタイプですか？',
    options: ['はい', 'どちらかというと違う'],
  },
  {
    type: 'psych',
    key: 'p9',
    question: '結果よりプロセスを重視しますか？',
    options: ['する', 'しない'],
  },
  {
    type: 'psych',
    key: 'p10',
    question: 'スキルを高めるための勉強は？',
    options: ['継続できる', '続かない'],
  },
]

const initialMessages: Message[] = [
  {
    role: 'bot',
    text: 'こんにちは！あなたに合ったキャリアを診断します。いくつか質問に答えてください。',
  },
  {
    role: 'bot',
    text: steps[0].question,
  },
]

type FreeAnswers = {
  reason?: string
  strength?: string
}

type AiComment = {
  empathy: string
  insight: string
  nextAction: string
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Partial<Answers>>({})
  const [freeAnswers, setFreeAnswers] = useState<FreeAnswers>({})
  const [psychologyAnswers, setPsychologyAnswers] = useState<PsychologyAnswers>({})
  const [textInput, setTextInput] = useState('')
  const [jobs, setJobs] = useState<JobProfile[]>([])
  const [regions, setRegions] = useState<RegionCost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [aiComment, setAiComment] = useState<AiComment | null>(null)
  const [aiCommentLoading, setAiCommentLoading] = useState(false)
  const [aiCommentError, setAiCommentError] = useState('')

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const aiCommentRequestKeyRef = useRef('')

  useEffect(() => {
    const fetchMasterData = async () => {
      const [jobsRes, regionsRes] = await Promise.all([
        supabase.from('job_profiles').select('*').order('job_name'),
        supabase.from('region_costs').select('*').order('prefecture'),
      ])

      if (!jobsRes.error) setJobs((jobsRes.data ?? []) as JobProfile[])
      if (!regionsRes.error) setRegions((regionsRes.data ?? []) as RegionCost[])
      setLoading(false)
    }

    fetchMasterData()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, stepIndex, saveMessage, isTyping, aiComment, aiCommentLoading])

  const isComplete = stepIndex >= steps.length

  const result = useMemo(() => {
    if (!isComplete) return null
    return runDiagnosis(answers as Answers, jobs, regions, psychologyAnswers)
  }, [answers, jobs, regions, psychologyAnswers, isComplete])

  useEffect(() => {
    if (!result) return

    localStorage.setItem(
      'diagnosisResult',
      JSON.stringify({
        continuity: result.psychologyScore.a,
        change: result.psychologyScore.b,
        attention: result.psychologyScore.c,
        communication: result.psychologyScore.d,
        recommendedJob: result.dreamRecommendedJob,
        personalityRecommendedJob: result.personalityRecommendedJob,
        dreamRecommendedJob: result.dreamRecommendedJob,
        recommendationGap: result.recommendationGap,
        careerRouteType: result.careerRouteType,
        region: (answers as Answers).region,
        experience: (answers as Answers).exp,
        age: (answers as Answers).age,
      })
    )
  }, [result, answers])


  useEffect(() => {
    if (!result || !isComplete) return

    const completedAnswers = answers as Answers
    const requestKey = JSON.stringify({
      reason: freeAnswers.reason ?? '',
      strength: freeAnswers.strength ?? '',
      recommendedJob: result.dreamRecommendedJob,
      personalityRecommendedJob: result.personalityRecommendedJob,
      dreamRecommendedJob: result.dreamRecommendedJob,
      achievementRate: result.achievementRate,
      score: result.psychologyScore,
    })

    if (aiCommentRequestKeyRef.current === requestKey) return
    aiCommentRequestKeyRef.current = requestKey

    const fetchAiComment = async () => {
      setAiCommentLoading(true)
      setAiCommentError('')

      try {
        const res = await fetch('/api/ai-comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: freeAnswers.reason ?? '',
            strength: freeAnswers.strength ?? '',
            result: {
              recommendedJob: result.dreamRecommendedJob,
              personalityRecommendedJob: result.personalityRecommendedJob,
              dreamRecommendedJob: result.dreamRecommendedJob,
              recommendationGap: result.recommendationGap,
              recommendationMessage: result.recommendationMessage,
              personalityReason: result.personalityReason,
              dreamReason: result.dreamReason,
              judgement: result.judgement,
              achievementRate: result.achievementRate,
              psychologyTypeSummary: result.psychologyTypeSummary,
              bottleneck: result.bottleneck,
              actionPlan: result.actionPlan,
              psychologyScore: result.psychologyScore,
            },
            answers: completedAnswers,
          }),
        })

        if (!res.ok) throw new Error('AIコメントの取得に失敗しました')

        const data = await res.json()
        if (data?.comment) {
          setAiComment(data.comment as AiComment)
        }
      } catch (error) {
        console.error(error)
        setAiCommentError('AIコメントを取得できませんでした。診断結果はこのまま確認できます。')
      } finally {
        setAiCommentLoading(false)
      }
    }

    fetchAiComment()
  }, [result, isComplete, answers, freeAnswers])

  const goNextWithBotMessage = (nextBotText: string) => {
    setIsTyping(true)
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'bot', text: nextBotText }])
      setStepIndex((prev) => prev + 1)
      setIsTyping(false)
    }, 700)
  }

  const completeDiagnosis = () => {
    setIsTyping(true)
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'ありがとうございます。診断結果をまとめました。' },
      ])
      setStepIndex(steps.length)
      setIsTyping(false)
    }, 700)
  }

  const handleChoice = (option: string) => {
    if (isComplete || isTyping) return
    const currentStep = steps[stepIndex]
    if (currentStep.type !== 'choice' && currentStep.type !== 'psych') return

    setMessages((prev) => [...prev, { role: 'user', text: option }])
    setSaveMessage('')

    if (currentStep.type === 'choice') {
      setAnswers((prev) => ({
        ...prev,
        [currentStep.key]: option,
      }))
    }

    if (currentStep.type === 'psych') {
      setPsychologyAnswers((prev) => ({
        ...prev,
        [currentStep.key]: option,
      }))
    }

    if (stepIndex < steps.length - 1) {
      goNextWithBotMessage(steps[stepIndex + 1].question)
    } else {
      completeDiagnosis()
    }
  }

  const handleTextSubmit = () => {
    if (isComplete || isTyping) return
    const currentStep = steps[stepIndex]
    if (currentStep.type !== 'text') return

    const trimmed = textInput.trim()
    if (!trimmed) return

    setFreeAnswers((prev) => ({
      ...prev,
      [currentStep.key]: trimmed,
    }))
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setTextInput('')
    setSaveMessage('')

    if (stepIndex < steps.length - 1) {
      goNextWithBotMessage(steps[stepIndex + 1].question)
    } else {
      completeDiagnosis()
    }
  }

  const handleSave = async () => {
    if (!result || !isComplete) return

    const completedAnswers = answers as Answers
    setSaving(true)
    setSaveMessage('')

    try {
      const userRes = await supabase
        .from('users')
        .insert([
          {
            name: '診断ユーザー',
            age: null,
            region: completedAnswers.region,
            family_plan: completedAnswers.life,
          },
        ])
        .select()
        .single()

      if (userRes.error || !userRes.data) {
        setSaveMessage(`ユーザー保存失敗: ${userRes.error?.message ?? '不明なエラー'}`)
        setSaving(false)
        return
      }

      const diagnosisRes = await supabase.from('diagnosis_results').insert([
        {
          user_id: userRes.data.id,
          achievement_rate: result.achievementRate,
          economic_score: result.estimatedAnnualIncome,
          mental_score:
            (result.psychologyScore.a +
              result.psychologyScore.b +
              result.psychologyScore.c +
              result.psychologyScore.d) /
            4,
          reality_score: result.annualSaving,
          recommended_job: result.dreamRecommendedJob,
        },
      ])

      if (diagnosisRes.error) {
        setSaveMessage(`診断保存失敗: ${diagnosisRes.error.message}`)
        setSaving(false)
        return
      }

      setSaveMessage('診断結果を保存しました。')
    } catch (error) {
      console.error(error)
      setSaveMessage('保存中にエラーが発生しました。')
    }

    setSaving(false)
  }

  const handleRestart = () => {
    setMessages(initialMessages)
    setStepIndex(0)
    setAnswers({})
    setFreeAnswers({})
    setPsychologyAnswers({})
    setTextInput('')
    setSaveMessage('')
    setSaving(false)
    setIsTyping(false)
    setAiComment(null)
    setAiCommentLoading(false)
    setAiCommentError('')
    aiCommentRequestKeyRef.current = ''
  }

  const goToRecommendedJobs = () => {
    window.location.href = '/jobs'
  }

  const currentStep = !isComplete ? steps[stepIndex] : null

  if (loading) {
    return <main style={{ padding: 24 }}>読み込み中...</main>
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#e5ddd5',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          minHeight: '100vh',
          background: '#efeae2',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 0 24px rgba(0,0,0,0.08)',
        }}
      >
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#06c755',
            color: '#fff',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>キャリア診断AI</div>
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
            AIチャット診断
          </div>
        </header>

        <div
          style={{
            flex: 1,
            padding: '16px 12px 130px',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => {
              const isBot = msg.role === 'bot'
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: isBot ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      background: isBot ? '#fff' : '#06c755',
                      color: isBot ? '#111827' : '#fff',
                      padding: '10px 13px',
                      borderRadius: 18,
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      fontSize: 15,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              )
            })}
          </div>

          {isComplete && result && (
            <section
              style={{
                marginTop: 18,
                background: '#fff',
                borderRadius: 18,
                padding: 18,
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
                診断結果
              </h2>

              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {result.message}
              </p>

              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 16,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  lineHeight: 1.8,
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 8 }}>
                  AIコンサルコメント
                </div>

                {aiCommentLoading && (
                  <p style={{ color: '#166534' }}>あなたの回答をもとにコメントを作成中です...</p>
                )}

                {!aiCommentLoading && aiComment && (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <p><strong>共感：</strong>{aiComment.empathy}</p>
                    <p><strong>見立て：</strong>{aiComment.insight}</p>
                    <p><strong>次の一手：</strong>{aiComment.nextAction}</p>
                  </div>
                )}

                {!aiCommentLoading && aiCommentError && (
                  <p style={{ color: '#b45309' }}>{aiCommentError}</p>
                )}
              </div>

              <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
                <p>必要年収目安: {result.requiredAnnualIncome.toLocaleString()}円</p>
                <p>想定年収: {result.estimatedAnnualIncome.toLocaleString()}円</p>
                <p>想定年間生活費: {result.annualCost.toLocaleString()}円</p>
                <p>想定年間貯蓄額: {result.annualSaving.toLocaleString()}円</p>
                <p>達成率目安: {result.achievementRate}%</p>
                <p>判定: {result.judgement}</p>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: '#f8fafc',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{ fontSize: 14, color: '#475569', fontWeight: 800 }}>
                    性格診断的に合いやすい仕事
                  </div>

                  <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900, color: '#111827' }}>
                    {result.personalityRecommendedJob}
                  </div>

                  <p style={{ marginTop: 8, lineHeight: 1.7, color: '#374151' }}>
                    {result.personalityReason}
                  </p>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: '#ecfdf3',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  <div style={{ fontSize: 14, color: '#166534', fontWeight: 800 }}>
                    夢を叶えるためにおすすめの仕事
                  </div>

                  <div style={{ marginTop: 8, fontSize: 26, fontWeight: 900, color: '#111827' }}>
                    {result.dreamRecommendedJob}
                  </div>

                  <p style={{ marginTop: 8, lineHeight: 1.7, color: '#14532d' }}>
                    {result.dreamReason}
                  </p>

                  {result.recommendationGap && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 12,
                        borderRadius: 12,
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        color: '#9a3412',
                        lineHeight: 1.7,
                        fontWeight: 700,
                      }}
                    >
                      性格的に合う仕事と、夢に近づく仕事が少し違います。希望を否定せず、まず合う仕事で土台を作り、収入が伸びるルートへ進む考え方がおすすめです。
                    </div>
                  )}

                  <button
                    onClick={goToRecommendedJobs}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      padding: '14px',
                      borderRadius: 14,
                      border: 'none',
                      background: '#06c755',
                      color: '#fff',
                      fontWeight: 800,
                      fontSize: 16,
                      cursor: 'pointer',
                    }}
                  >
                    このルートのおすすめ求人を見る
                  </button>
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 12,
                  background: '#f7f7f8',
                  lineHeight: 1.7,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>コンサル視点の整理</div>
                <div>ボトルネック: {result.bottleneck}</div>
                <div style={{ marginTop: 6 }}>打ち手: {result.actionPlan}</div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 12,
                  background: '#f7f7f8',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>心理10問の分析</div>
                <div>継続力: {result.psychologyScore.a}</div>
                <div>変化対応力: {result.psychologyScore.b}</div>
                <div>注意力・緻密さ: {result.psychologyScore.c}</div>
                <div>対人調整力: {result.psychologyScore.d}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  傾向: {result.psychologyTypeSummary}
                </div>
              </div>

              {freeAnswers.reason || freeAnswers.strength ? (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 12,
                    background: '#f7f7f8',
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>AIが拾った本音</div>
                  {freeAnswers.reason && <div>目的の理由: {freeAnswers.reason}</div>}
                  {freeAnswers.strength && <div>自覚している強み: {freeAnswers.strength}</div>}
                </div>
              ) : null}

              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: '#111827',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {saving ? '保存中...' : '診断結果を保存'}
                </button>

                <button
                  onClick={handleRestart}
                  style={{
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#111827',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  もう一度診断する
                </button>
              </div>

              {saveMessage && <p style={{ marginTop: 12 }}>{saveMessage}</p>}
            </section>
          )}

          <div ref={bottomRef} />
        </div>

        {!isComplete && currentStep && (
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              background: '#f0f2f5',
              borderTop: '1px solid #d1d5db',
              padding: 12,
            }}
          >
            {(currentStep.type === 'choice' || currentStep.type === 'psych') && (
              <div style={{ display: 'grid', gap: 8 }}>
                {currentStep.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleChoice(opt)}
                    disabled={isTyping}
                    style={{
                      width: '100%',
                      padding: '13px 14px',
                      borderRadius: 14,
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      textAlign: 'left',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {currentStep.type === 'text' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={currentStep.placeholder}
                  rows={3}
                  style={{
                    width: '100%',
                    resize: 'none',
                    borderRadius: 14,
                    border: '1px solid #d1d5db',
                    padding: 12,
                    fontSize: 15,
                  }}
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  style={{
                    width: '100%',
                    padding: '13px 14px',
                    borderRadius: 14,
                    border: 'none',
                    background: '#06c755',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  送信する
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}