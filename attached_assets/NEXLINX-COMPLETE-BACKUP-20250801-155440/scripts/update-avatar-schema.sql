-- Add profilePhoto column to employee_records table
ALTER TABLE employee_records ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN employee_records.profile_photo IS 'Avatar/profile photo URL';