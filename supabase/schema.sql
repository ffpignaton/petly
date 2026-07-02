-- Animal Care — Schema v2
-- STEP 1: drop old tables
drop table if exists vet_visits, medications, weights, vaccines, pets cascade;

-- STEP 2: enable UUID
create extension if not exists "uuid-ossp";

-- ─── PETS ────────────────────────────────────────────────────────────────────
create table pets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  breed       text,
  birth_date  date,
  photo_url   text,
  sex         text check (sex in ('male', 'female')),
  notes       text,
  created_at  timestamptz default now()
);
alter table pets enable row level security;
create policy "Users manage own pets" on pets for all using (auth.uid() = user_id);

-- ─── VACCINES ────────────────────────────────────────────────────────────────
create table vaccines (
  id                 uuid primary key default uuid_generate_v4(),
  pet_id             uuid references pets(id) on delete cascade not null,
  name               text not null,
  applied_at         date not null,
  next_due_at        date,
  interval_months    int,
  alert_days_before  int not null default 30,
  vet_name           text,
  vet_clinic         text,
  notes              text,
  created_at         timestamptz default now()
);
alter table vaccines enable row level security;
create policy "Users manage own vaccines" on vaccines for all
  using (pet_id in (select id from pets where user_id = auth.uid()));

-- ─── WEIGHTS ─────────────────────────────────────────────────────────────────
create table weights (
  id           uuid primary key default uuid_generate_v4(),
  pet_id       uuid references pets(id) on delete cascade not null,
  weight_kg    numeric(5,2) not null,
  recorded_at  date not null,
  notes        text,
  created_at   timestamptz default now()
);
alter table weights enable row level security;
create policy "Users manage own weights" on weights for all
  using (pet_id in (select id from pets where user_id = auth.uid()));

-- ─── MEDICATIONS ─────────────────────────────────────────────────────────────
create table medications (
  id                 uuid primary key default uuid_generate_v4(),
  pet_id             uuid references pets(id) on delete cascade not null,
  name               text not null,
  med_type           text not null default 'course' check (med_type in ('daily','periodic','course')),
  dosage             text,
  daily_time         time,
  interval_days      int,
  start_date         date not null,
  next_due_at        date,
  end_date           date,
  alert_days_before  int not null default 7,
  notes              text,
  created_at         timestamptz default now()
);
alter table medications enable row level security;
create policy "Users manage own medications" on medications for all
  using (pet_id in (select id from pets where user_id = auth.uid()));

-- ─── VET VISITS ──────────────────────────────────────────────────────────────
create table vet_visits (
  id          uuid primary key default uuid_generate_v4(),
  pet_id      uuid references pets(id) on delete cascade not null,
  visited_at  date not null,
  vet_name    text,
  vet_clinic  text,
  reason      text,
  diagnosis   text,
  notes       text,
  created_at  timestamptz default now()
);
alter table vet_visits enable row level security;
create policy "Users manage own vet_visits" on vet_visits for all
  using (pet_id in (select id from pets where user_id = auth.uid()));

-- ─── STORAGE bucket: pet-photos ──────────────────────────────────────────────
-- 1. Go to Storage → New bucket → name: pet-photos → toggle Public ON → Save
-- 2. Then run these policies in SQL Editor:

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', false)
on conflict (id) do update set public = false;

-- Only the owner can read their pet photos (path: userId/petId.ext)
create policy "Owner reads own pet photos" on storage.objects
  for select using (
    bucket_id = 'pet-photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner uploads own pet photos" on storage.objects
  for insert with check (
    bucket_id = 'pet-photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner updates own pet photos" on storage.objects
  for update using (
    bucket_id = 'pet-photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner deletes own pet photos" on storage.objects
  for delete using (
    bucket_id = 'pet-photos' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── PUSH SUBSCRIPTIONS ──────────────────────────────────────────────────────
create table if not exists push_subscriptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  created_at   timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "Users manage own push subscriptions" on push_subscriptions for all
  using (auth.uid() = user_id);
