import type { PublicJobPosting } from "@/types/job"
import { supabase } from "@/lib/supabase"

export async function getPublicJobPostings(): Promise<PublicJobPosting[]> {
  const { data, error } = await supabase
    .from("public_job_postings_view")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("求人取得エラー:", error)
    throw new Error("求人データの取得に失敗しました")
  }

  return (data ?? []) as PublicJobPosting[]
}