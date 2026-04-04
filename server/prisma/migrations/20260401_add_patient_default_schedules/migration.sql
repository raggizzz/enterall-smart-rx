-- Add defaultSchedules column to Patient table
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "defaultSchedules" TEXT[] NOT NULL DEFAULT '{}';
