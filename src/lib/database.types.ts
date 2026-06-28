export interface Pet {
  id: string
  user_id: string
  name: string
  breed: string | null
  birth_date: string | null
  photo_url: string | null
  sex: 'male' | 'female' | null
  notes: string | null
  created_at: string
}

export interface Vaccine {
  id: string
  pet_id: string
  name: string
  applied_at: string
  next_due_at: string | null
  interval_months: number | null
  alert_days_before: number
  vet_name: string | null
  vet_clinic: string | null
  notes: string | null
  created_at: string
}

export interface Weight {
  id: string
  pet_id: string
  weight_kg: number
  recorded_at: string
  notes: string | null
  created_at: string
}

export type MedicationType = 'daily' | 'periodic' | 'course'

export interface Medication {
  id: string
  pet_id: string
  name: string
  med_type: MedicationType
  dosage: string | null
  daily_time: string | null
  interval_days: number | null
  start_date: string
  next_due_at: string | null
  end_date: string | null
  alert_days_before: number
  notes: string | null
  created_at: string
}

export interface VetVisit {
  id: string
  pet_id: string
  visited_at: string
  vet_name: string | null
  vet_clinic: string | null
  reason: string | null
  diagnosis: string | null
  notes: string | null
  created_at: string
}
