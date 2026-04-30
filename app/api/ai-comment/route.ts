import { NextResponse } from 'next/server'

type AiComment = {
  empathy: string
  insight: string
  nextAction: string
}

type RequestBody = {
  reason?: string
  strength?: string
  result?: {
    recommendedJob?: string
    judgement?: string
    achievementRate?: number
    psychologyTypeSummary?: string
    bottleneck?: string
    actionPlan?: string
    psychologyScore?: {
      a?: number
      b?: number
      c?: number
      d?: number
    }
  }
  answers?: {
    purpose?: string
    life?: string
    money?: string
    years?: string
    region?: string
    job?: string
    age?: string
    exp?: string
    level?: string
    type?: string
  }
}

const fallbackComment: AiComment = {
  empathy:
    'ここまでの回答を見ると、ただ仕事を探しているというより、自分の生活や将来をちゃんと整えたい気持ちが強いように見えます。',
  insight:
    '今は「すぐに合う求人」だけで判断するより、生活を安定させる入口と、将来の収入やスキルにつながる道を分けて考えるのが良さそうです。',
  nextAction:
    'まずは未経験でも始めやすい選択肢を確認しながら、同時に半年〜1年後に伸ばせるスキルや職種を一緒に見ていきましょう。',
}

function safeText(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 500) : ''
}

function toAiComment(value: unknown): AiComment | null {
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const apiKey = process.env.OPENAI_API_KEY

    const payloadForPrompt = {
      freeInput: {
        reason: safeText(body.reason),
        strength: safeText(body.strength),
      },
      diagnosis: body.result ?? {},
      answers: body.answers ?? {},
    }

    if (!apiKey) {
      return NextResponse.json({ comment: fallbackComment, source: 'fallback' })
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
            content:
              'あなたはキャリア診断サービスのコンサルタントです。求人を押し売りせず、ユーザーの夢や生活に近づく道筋をやさしく整理してください。断定しすぎず、前向きで現実的に書いてください。日本語で返してください。',
          },
          {
            role: 'user',
            content:
              '以下の診断データから、ユーザー向けコメントを作成してください。\n' +
              '返却は empathy / insight / nextAction の3項目だけです。\n' +
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
                  description: 'ユーザーの自由入力や状況に寄り添う一文。80文字以内。',
                },
                insight: {
                  type: 'string',
                  description: '診断結果から見える本質的な気づき。120文字以内。',
                },
                nextAction: {
                  type: 'string',
                  description: '次に取るべき現実的な行動。120文字以内。',
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
      return NextResponse.json({ comment: fallbackComment, source: 'fallback' })
    }

    const data = await response.json()
    const outputText = typeof data.output_text === 'string' ? data.output_text : ''

    if (!outputText) {
      return NextResponse.json({ comment: fallbackComment, source: 'fallback' })
    }

    const parsed = toAiComment(JSON.parse(outputText))
    return NextResponse.json({ comment: parsed ?? fallbackComment, source: parsed ? 'openai' : 'fallback' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ comment: fallbackComment, source: 'fallback' })
  }
}
