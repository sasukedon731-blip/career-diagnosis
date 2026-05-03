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

const fallbackComment: AiComment = {
  empathy:
    'ここまでの回答を見ると、今すぐ仕事を決めたいだけでなく、将来の生活を安定させたい気持ちが強く出ています。',
  insight:
    '診断結果では、希望と現実の間にギャップがあります。今は求人名だけで選ぶより、収入・経験・地域・性格の相性を分けて考える段階です。',
  nextAction:
    'まずは希望職種に近づくために、3ヶ月以内に始められる入口職種と、1年後に収入を伸ばせるルートを比較しましょう。',
}

function safeText(value: unknown, max = 600) {
  return typeof value === 'string' ? value.slice(0, max) : ''
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
        reason: safeText(body.reason ?? body.user?.reason),
        strength: safeText(body.strength ?? body.user?.strength),
      },
      user: body.user ?? {},
      result: body.result ?? {},
      topJob: body.topJob ?? {},
      analysis: body.analysis ?? {},
      answers: body.answers ?? {},
    }

    if (!apiKey) {
      return NextResponse.json({
        comment: fallbackComment,
        source: 'fallback',
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
・抽象的な励ましだけで終わらない
・ユーザーの自由入力「reason」「strength」を必ず反映する
・数値がある場合は必ず使う
・年収差、達成率、性格スコア、地域、経験、希望職種を材料にする
・期間を入れる
・押し売りは禁止
・厳しい現実もやさしく伝える
・日本語で返す
・同じ言い回しを避ける

【出力方針】
empathy：
ユーザーの背景・希望・不安に寄り添う。
ただし「頑張っていますね」だけは禁止。

insight：
診断データから見える現状・問題・ギャップをコンサル目線で分析する。
数値があれば必ず入れる。

nextAction：
次に取るべき行動を具体化する。
「まずは求人を見ましょう」だけは禁止。
3ヶ月、半年、1年など期間を入れる。
            `.trim(),
          },
          {
            role: 'user',
            content:
              '以下の診断データをもとに、ユーザー向けのAIコメントを作成してください。\n' +
              '返却は JSON の empathy / insight / nextAction の3項目だけです。\n\n' +
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
                    'ユーザーの希望・理由・強みに寄り添うコメント。120文字以内。',
                },
                insight: {
                  type: 'string',
                  description:
                    '診断結果、数値、収入差、性格スコア、求人情報から見える分析。180文字以内。',
                },
                nextAction: {
                  type: 'string',
                  description:
                    '3ヶ月〜1年単位で次にやるべき具体行動。180文字以内。',
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
        source: 'fallback',
      })
    }

    const data = await response.json()
    const outputText =
      typeof data.output_text === 'string' ? data.output_text : ''

    if (!outputText) {
      return NextResponse.json({
        comment: fallbackComment,
        source: 'fallback',
      })
    }

    const parsed = toAiComment(JSON.parse(outputText))

    return NextResponse.json({
      comment: parsed ?? fallbackComment,
      source: parsed ? 'openai' : 'fallback',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json({
      comment: fallbackComment,
      source: 'fallback',
    })
  }
}