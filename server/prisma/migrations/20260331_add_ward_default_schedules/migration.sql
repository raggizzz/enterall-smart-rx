-- Add defaultSchedules column to Ward table
ALTER TABLE "Ward" ADD COLUMN IF NOT EXISTS "defaultSchedules" TEXT[] NOT NULL DEFAULT '{}';
