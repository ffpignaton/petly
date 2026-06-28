import { supabase } from './supabase'
import type { Pet, Vaccine, Weight, Medication, VetVisit } from './database.types'

type PetInsert = Omit<Pet, 'id' | 'created_at'>
type VaccineInsert = Omit<Vaccine, 'id' | 'created_at'>
type WeightInsert = Omit<Weight, 'id' | 'created_at'>
type MedicationInsert = Omit<Medication, 'id' | 'created_at'>
type VetVisitInsert = Omit<VetVisit, 'id' | 'created_at'>

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}
export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}
export async function signOut() {
  return supabase.auth.signOut()
}

// ── Pet Photo ─────────────────────────────────────────────────────────────────
export async function uploadPetPhoto(userId: string, petId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/${petId}.${ext}`
  const { error } = await supabase.storage.from('pet-photos').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) {
    console.error('Photo upload error:', error.message)
    return null
  }
  // Bucket is private — store only the path, generate signed URL on demand
  return path
}

export async function getPetPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('pet-photos')
    .createSignedUrl(path, 60 * 60) // 1 hour expiry
  if (error) return null
  return data.signedUrl
}

// ── Pets ──────────────────────────────────────────────────────────────────────
export async function getPets(userId: string) {
  return supabase.from('pets').select('*').eq('user_id', userId).order('name') as unknown as Promise<{ data: Pet[] | null; error: unknown }>
}
export async function createPet(pet: PetInsert) {
  return supabase.from('pets').insert(pet as never).select().single() as unknown as Promise<{ data: Pet | null; error: unknown }>
}
export async function updatePet(id: string, updates: Partial<PetInsert>) {
  return supabase.from('pets').update(updates as never).eq('id', id).select().single() as unknown as Promise<{ data: Pet | null; error: unknown }>
}
export async function deletePet(id: string) {
  return supabase.from('pets').delete().eq('id', id)
}

// ── Vaccines ──────────────────────────────────────────────────────────────────
export async function getVaccines(petId: string) {
  return supabase.from('vaccines').select('*').eq('pet_id', petId).order('applied_at', { ascending: false }) as unknown as Promise<{ data: Vaccine[] | null; error: unknown }>
}
export async function createVaccine(vaccine: VaccineInsert) {
  return supabase.from('vaccines').insert(vaccine as never).select().single() as unknown as Promise<{ data: Vaccine | null; error: unknown }>
}
export async function updateVaccine(id: string, updates: Partial<VaccineInsert>) {
  return supabase.from('vaccines').update(updates as never).eq('id', id).select().single() as unknown as Promise<{ data: Vaccine | null; error: unknown }>
}
export async function deleteVaccine(id: string) {
  return supabase.from('vaccines').delete().eq('id', id)
}

// ── Weights ───────────────────────────────────────────────────────────────────
export async function getWeights(petId: string) {
  return supabase.from('weights').select('*').eq('pet_id', petId).order('recorded_at', { ascending: false }) as unknown as Promise<{ data: Weight[] | null; error: unknown }>
}
export async function createWeight(weight: WeightInsert) {
  return supabase.from('weights').insert(weight as never).select().single() as unknown as Promise<{ data: Weight | null; error: unknown }>
}
export async function deleteWeight(id: string) {
  return supabase.from('weights').delete().eq('id', id)
}

// ── Medications ───────────────────────────────────────────────────────────────
export async function getMedications(petId: string) {
  return supabase.from('medications').select('*').eq('pet_id', petId).order('start_date', { ascending: false }) as unknown as Promise<{ data: Medication[] | null; error: unknown }>
}
export async function createMedication(medication: MedicationInsert) {
  return supabase.from('medications').insert(medication as never).select().single() as unknown as Promise<{ data: Medication | null; error: unknown }>
}
export async function updateMedication(id: string, updates: Partial<MedicationInsert>) {
  return supabase.from('medications').update(updates as never).eq('id', id).select().single() as unknown as Promise<{ data: Medication | null; error: unknown }>
}
export async function deleteMedication(id: string) {
  return supabase.from('medications').delete().eq('id', id)
}

// ── Vet Visits ────────────────────────────────────────────────────────────────
export async function getVetVisits(petId: string) {
  return supabase.from('vet_visits').select('*').eq('pet_id', petId).order('visited_at', { ascending: false }) as unknown as Promise<{ data: VetVisit[] | null; error: unknown }>
}
export async function createVetVisit(visit: VetVisitInsert) {
  return supabase.from('vet_visits').insert(visit as never).select().single() as unknown as Promise<{ data: VetVisit | null; error: unknown }>
}
export async function updateVetVisit(id: string, updates: Partial<VetVisitInsert>) {
  return supabase.from('vet_visits').update(updates as never).eq('id', id).select().single() as unknown as Promise<{ data: VetVisit | null; error: unknown }>
}
export async function deleteVetVisit(id: string) {
  return supabase.from('vet_visits').delete().eq('id', id)
}
