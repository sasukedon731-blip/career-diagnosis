export type PublicJobPosting = {
  id: string
  job_code: string | null
  job_title: string
  hiring_category: string
  occupation_group: string | null
  occupation_name: string | null
  employment_type: string
  dispatch_type: string | null

  public_company_name: string | null
  public_catchcopy: string | null
  job_description: string | null
  appeal_points: string | null

  prefecture: string | null
  city: string | null
  work_area_category: string | null
  nearest_station: string | null
  dormitory_available: boolean | null
  relocation_support: boolean | null

  work_style: string | null
  shift_details: string | null
  working_hours_text: string | null
  average_overtime_hours: number | null
  annual_holidays: number | null

  pay_unit: string | null
  salary_min: number | null
  salary_max: number | null
  salary_text: string | null
  estimated_monthly_income_min: number | null
  estimated_monthly_income_max: number | null
  transportation_allowance: boolean | null
  welfare_benefits: string | null

  experience_required: string | null
  minimum_experience_years: number | null
  japanese_level_required: string | null
  required_licenses: string | null
  foreign_nationality_friendly: boolean | null
  beginner_training_available: boolean | null
  visa_support_available: boolean | null
  personality_fit_notes: string | null

  accepts_inexperienced: boolean | null
  fit_continuity_min: number | null
  fit_change_adapt_min: number | null
  fit_attention_min: number | null
  fit_communication_min: number | null

  is_featured: boolean | null
  publish_start_at: string | null
  publish_end_at: string | null
  created_at: string
  updated_at: string
}