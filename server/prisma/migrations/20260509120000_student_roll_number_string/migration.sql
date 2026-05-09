ALTER TABLE "student_info"
ALTER COLUMN "roll_number" TYPE VARCHAR(30)
USING "roll_number"::text;
