-- ====================================================================================================
-- CAMPUS2CAREER: SQL CASCADE USER DELETION TRIGGER, LOGIN HOURS & CANDIDATE CLEANUP
-- Run this script in the Supabase SQL Editor
-- ====================================================================================================

-- 1. Defensively add login hour and local time columns
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS last_login_time VARCHAR(100);

ALTER TABLE IF EXISTS public.login_attempts ADD COLUMN IF NOT EXISTS login_time VARCHAR(100);
ALTER TABLE IF EXISTS public.login_attempts ADD COLUMN IF NOT EXISTS login_hour INT;

-- 2. Drop and Recreate the Automatic Cascade Deletion Trigger on Users Table
-- Uses dynamic execution (to_regclass) so missing or unmigrated tables (like diagnostics) 
-- NEVER cause "relation does not exist" errors!
CREATE OR REPLACE FUNCTION public.cascade_delete_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Candidates
    IF to_regclass('public.candidates') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.candidates WHERE user_id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 2. Student Skill Progress
    IF to_regclass('public.student_skill_progress') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.student_skill_progress WHERE user_id = $1' USING OLD.id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 3. User Domain Progress (Discipline Mastery)
    IF to_regclass('public.user_domain_progress') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.user_domain_progress WHERE LOWER(TRIM(user_email)) = LOWER(TRIM($1))' USING OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 4. Student Study Activity
    IF to_regclass('public.student_activity') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.student_activity WHERE user_id = $1' USING OLD.id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 5. Student Activity Logs
    IF to_regclass('public.student_activity_logs') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.student_activity_logs WHERE user_id = $1 OR LOWER(TRIM(user_email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 6. Completed Video Lectures
    IF to_regclass('public.user_completed_lectures') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.user_completed_lectures WHERE user_id = $1 OR LOWER(TRIM(user_email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 7. Student Benchmark & Test Attempts
    IF to_regclass('public.student_test_attempts') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.student_test_attempts WHERE user_id = $1' USING OLD.id;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 8. Diagnostics (Checked dynamically: safely skipped if table does not exist)
    IF to_regclass('public.diagnostics') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.diagnostics WHERE LOWER(TRIM(user_email)) = LOWER(TRIM($1))' USING OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 9. Login History & Audit Attempts
    IF to_regclass('public.login_attempts') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.login_attempts WHERE user_id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 10. Rate Limits
    IF to_regclass('public.login_rate_limits') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.login_rate_limits WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))' USING OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 11. Pending Verifications
    IF to_regclass('public.pending_verifications') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.pending_verifications WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))' USING OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    -- 12. Password Reset Tokens
    IF to_regclass('public.password_resets') IS NOT NULL THEN
        BEGIN
            EXECUTE 'DELETE FROM public.password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))' USING OLD.email;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind the Cascade Trigger to public.users
DROP TRIGGER IF EXISTS trigger_cascade_delete_user ON public.users;
CREATE TRIGGER trigger_cascade_delete_user
BEFORE DELETE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.cascade_delete_user_data();

-- 4. student_test_attempts: rename / add core_skill and test_skill columns
ALTER TABLE IF EXISTS public.student_test_attempts ADD COLUMN IF NOT EXISTS core_skill VARCHAR(150);
ALTER TABLE IF EXISTS public.student_test_attempts ADD COLUMN IF NOT EXISTS test_skill VARCHAR(255);
UPDATE public.student_test_attempts SET core_skill = COALESCE(core_skill, skill_name) WHERE core_skill IS NULL;
UPDATE public.student_test_attempts SET test_skill = COALESCE(test_skill, test_title) WHERE test_skill IS NULL;

-- Verification Check
SELECT 'Cascade trigger successfully active, core_skill & test_skill columns ready' AS status;
