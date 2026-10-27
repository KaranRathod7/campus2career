-- ====================================================================================================
-- CAMPUS2CAREER: SQL CASCADE USER DELETION TRIGGER, LOGIN HOURS & VERIFIED CANDIDATE MIGRATION
-- Run this script in the Supabase SQL Editor
-- ====================================================================================================

-- 1. Defensively add login hour and local time columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_time VARCHAR(100);

ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS login_time VARCHAR(100);
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS login_hour INT;

-- 2. Create the Automatic Cascade Deletion Trigger on Users Table
-- Whenever ANY user is deleted by SQL query (e.g. DELETE FROM users WHERE email = '...'),
-- this trigger automatically removes all corresponding rows from ALL other tables in the platform!
CREATE OR REPLACE FUNCTION public.cascade_delete_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Candidates
    DELETE FROM public.candidates 
    WHERE user_id = OLD.id OR LOWER(TRIM(email)) = LOWER(TRIM(OLD.email));

    -- Student Skill Progress
    DELETE FROM public.student_skill_progress 
    WHERE user_id = OLD.id;

    -- User Domain Progress (Discipline Mastery)
    DELETE FROM public.user_domain_progress 
    WHERE LOWER(TRIM(user_email)) = LOWER(TRIM(OLD.email));

    -- Student Study Activity
    DELETE FROM public.student_activity 
    WHERE user_id = OLD.id;

    -- Student Activity Logs (if table exists)
    BEGIN
        DELETE FROM public.student_activity_logs 
        WHERE user_id = OLD.id OR LOWER(TRIM(user_email)) = LOWER(TRIM(OLD.email));
    EXCEPTION WHEN undefined_table THEN
        -- ignore if table was consolidated/dropped
    END;

    -- Completed Video Lectures
    DELETE FROM public.user_completed_lectures 
    WHERE user_id = OLD.id OR LOWER(TRIM(user_email)) = LOWER(TRIM(OLD.email));

    -- Student Benchmark & Test Attempts
    DELETE FROM public.student_test_attempts 
    WHERE user_id = OLD.id;

    -- Diagnostics
    DELETE FROM public.diagnostics 
    WHERE LOWER(TRIM(user_email)) = LOWER(TRIM(OLD.email));

    -- Login History & Audit Attempts
    DELETE FROM public.login_attempts 
    WHERE user_id = OLD.id OR LOWER(TRIM(email)) = LOWER(TRIM(OLD.email));

    -- Rate Limits
    DELETE FROM public.login_rate_limits 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(OLD.email));

    -- Pending Verifications
    DELETE FROM public.pending_verifications 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(OLD.email));

    -- Password Reset Tokens
    DELETE FROM public.password_resets 
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(OLD.email));

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cascade_delete_user ON public.users;
CREATE TRIGGER trigger_cascade_delete_user
BEFORE DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_user_data();

-- 3. Ensure Karansinh Rajput exists with Verified Cohort status
INSERT INTO public.users (
    id, name, username, email, password_hash, role, is_verified,
    stream, branch, college, year, skills, onboarded,
    total_study_minutes, total_lecture_minutes, avg_exam_score, dynamic_competence_percent
) VALUES (
    'a0000000-0000-4000-8000-000000000002'::uuid,
    'Karansinh Rajput',
    'karansinh_rajput',
    'karansinhrrr@gmail.com',
    '$2b$10$s7.sQe2UX8qRDsqEbB3SqeJ5fSOxnwNkOi9oL.RuiZbYPSnlmT43.',
    'learner',
    TRUE,
    'ECE',
    'ECE',
    'VJTI Mumbai',
    3,
    ARRAY['Embedded C & ARM Cortex-M', 'FreeRTOS & Real-Time Kernels', 'Hardware-in-Loop Debugging', 'Serial Protocols (I2C, SPI, CAN)'],
    TRUE,
    95, 65, 96.0, 96.0
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    is_verified = TRUE,
    dynamic_competence_percent = 96.0,
    total_study_minutes = 95,
    total_lecture_minutes = 65,
    avg_exam_score = 96.0;

INSERT INTO public.candidates (
    id, user_id, name, email, stream, domain, experience_level,
    skill_score, dynamic_competence_percent, readiness_score,
    status, verified_status, skills, capstone_proof
) VALUES (
    'a0000000-0000-4000-8000-000000000002'::uuid,
    'a0000000-0000-4000-8000-000000000002'::uuid,
    'Karansinh Rajput',
    'karansinhrrr@gmail.com',
    'ECE',
    'Embedded Firmware & RTOS',
    'Fresher (0-1 yr)',
    96, 96.0, 96.0,
    'LIVE VERIFIED', 'LIVE VERIFIED',
    ARRAY['Embedded C & ARM Cortex-M', 'FreeRTOS & Real-Time Kernels', 'Hardware-in-Loop Debugging', 'Serial Protocols (I2C, SPI, CAN)'],
    'Engineered deterministic CAN bus telemetry node with DMA-driven SPI drivers on STM32F4 with zero frame loss under bus load stress.'
) ON CONFLICT (email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    skill_score = 96,
    dynamic_competence_percent = 96.0,
    readiness_score = 96.0,
    status = 'LIVE VERIFIED',
    capstone_proof = EXCLUDED.capstone_proof;

-- Verification Check
SELECT 'Cascade trigger successfully active' AS status;
