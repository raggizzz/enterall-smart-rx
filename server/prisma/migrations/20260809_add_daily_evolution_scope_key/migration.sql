-- Prevent duplicate daily records for the same patient in the same hospital.
-- Run after checking existing duplicates in DailyEvolution.
CREATE UNIQUE INDEX "DailyEvolution_hospitalId_patientId_date_key"
ON "DailyEvolution"("hospitalId", "patientId", "date");
