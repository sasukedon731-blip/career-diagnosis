import { NextResponse } from 'next/server'

type AiComment = {
  empathy: string
  insight: string
  nextAction: string
}

type RequestBody = {
  reason?: string
  strength?: string
  answers?: Record<string, unknown>
  user?: Record<string, unknown>
  result?: Record<string, unknown>
  topJob?: Record<string, unknown>
  analysis?: Record<string, unknown>
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function num(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function makeFallbackComment(body: RequestBody): AiComment {
  const user = body.user ?? {}
  const result = body.result ?? {}
  const topJob = body.topJob ?? {}

  const reason = text(body.reason ?? user.reason, '将来をよくしたい')
  const strength = text(body.strength ?? user.strength, 'これまでの経験や強み')
  const dreamJob = text(user.dreamJob ?? result.dreamRecommendedJob, '希望の仕事')
  const region = text(user.region, '希望地域')
  const achievementRate = num(result.achievementRate ?? result.matchPercent, 0)
  const currentIncome = num(result.currentIncome, 0)
  const targetIncome = num(result.targetIncome, 0)
  const incomeGap = targetIncome - currentIncome
  const jobTitle = text(topJob.title, dreamJob)

  return {
    empathy: `「${reason}」という理由を見ると、ただ仕事を探しているだけではなく、生活や将来の安心感まで考えていることが伝わります。`,
    insight: `${region}で${dreamJob}を目指す場合、現在の想定年収${currentIncome.toLocaleString()}円に対して目標は${targetIncome.toLocaleString()}円です。差額は約${incomeGap.toLocaleString()}円、達成率は${achievementRate}%なので、今はルート設計が重要です。`,
    nextAction: `まず3ヶ月は「${strength}」を活かせる入口として${jobTitle}に近い仕事を比較し、半年以内に必要資格・経験・年収アップ条件を整理しましょう。`,
  }
}

function parseAiComment(value: unknown): AiComment | null {
  if (!value || typeof value !== 'object') return null
  const obj = value as Partial<AiComment>

  if (
    typeof obj.empathy !== 'string' ||
    typeof obj.insight !== 'string' ||
    typeof obj.nextAction !== 'string'
  ) {
    return null
  }

  return {
    empathy: obj.empathy,
    insight: obj.insight,
    nextAction: obj.nextAction,
  }
}

function getOutputText(data: any) {
  if (typeof data.output_text === 'string') return data.output_text

  const textParts: string[] = []

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === 'string') {
        textParts.push(content.text)
      }
    }
  }

  return textParts.join('\n')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const apiKey = process.env.OPENAI_API_KEY

    const fallbackComment = makeFallbackComment(body)

    const payloadForPrompt = {
      user: body.user ?? {},
      result: body.result ?? {},
      topJob: body.topJob ?? {},
      analysis: body.analysis ?? {},
      answers: body.answers ?? {},
      freeInput: {
        reason: body.reason ?? body.user?.reason ?? '',
        experienceQualificationStrength:
          body.strength ?? body.user?.strength ?? '',
      },
    }

    if (!apiKey) {
      return NextResponse.json({
        comment: fallbackComment,
        source: 'fallback_no_api_key',
      })
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: `
あなたはキャリア診断サービスのトップキャリアコンサルタントです。

目的は求人紹介ではありません。
ユーザーの夢・生活・収入目標に近づくための現実的なルートを提示してください。

【絶対ルール】
・毎回違う言い回しにする
・「ここまでの回答を見ると」で始めることは禁止
・「今すぐ仕事を決めたいだけでなく」は禁止
・抽象的な励ましだけで終わらない
・ユーザーの自由入力 reason と strength を必ず反映する
・strength には経験、資格、得意なことが混ざる前提で読む
・数値がある場合は必ず使う
・年収差、達成率、性格スコア、地域、経験、希望職種を材料にする
・期間を入れる
・押し売りは禁止
・厳しい現実もやさしく伝える
・日本語で返す

【返却ルール】
JSONのみ返す。
empathy / insight / nextAction の3項目だけ。
            `.trim(),
          },
          {
            role: 'user',
            content:
              '以下の診断データをもとに、ユーザー向けのAIコメントを作成してください。\n\n' +
              JSON.stringify(payloadForPrompt, null, 2),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'career_ai_comment',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              required: ['empathy', 'insight', 'nextAction'],
              properties: {
                empathy: {
                  type: 'string',
                  description:
                    'ユーザーの理由・希望・経験・資格・強みに寄り添うコメント。100〜160文字。',
                },
                insight: {
                  type: 'string',
                  description:
                    '診断結果、数値、収入差、性格スコア、求人情報から見える分析。140〜220文字。',
                },
                nextAction: {
                  type: 'string',
                  description:
                    '3ヶ月〜1年単位で次にやるべき具体行動。140〜220文字。',
                },
              },
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('OpenAI API error:', detail)

      return NextResponse.json({
        comment: fallbackComment,
        source: 'fallback_openai_error',
      })
    }

    const data = await response.json()
    const outputText = getOutputText(data)

    if (!outputText) {
      return NextResponse.json({
        comment: fallbackComment,
        source: 'fallback_empty_output',
      })
    }

    let parsed: AiComment | null = null

    try {
      parsed = parseAiComment(JSON.parse(outputText))
    } catch (error) {
      console.error('AI JSON parse error:', error, outputText)
    }

    return NextResponse.json({
      comment: parsed ?? fallbackComment,
      source: parsed ? 'openai' : 'fallback_parse_error',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({
      comment: {
        empathy:
          '入力内容から、今後の働き方を真剣に考えていることが伝わります。',
        insight:
          '診断結果の一部をうまく読み取れませんでしたが、希望職種・収入・強みを分けて整理することが重要です。',
        nextAction:
          'まずは3ヶ月以内に、希望職種に必要な経験・資格・収入条件を確認しましょう。',
      },
      source: 'fallback_server_error',
    })
  }
}