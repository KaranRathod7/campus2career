-- ====================================================================================================
-- CAMPUS2CAREER: DATABASE SCHEMA ENHANCEMENT & READINESS SCORE CONTINUOUS SYNC SCRIPT
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 1. DEFENSIVE COLUMN CREATION ACROSS CORE TABLES
-- ----------------------------------------------------------------------------------------------------

-- Users Table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch VARCHAR(50);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS college VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS year INT DEFAULT 3;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS btech_year INT DEFAULT 3;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_role VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_domain VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS domain_progress JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_study_minutes INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS total_lecture_minutes INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avg_exam_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dynamic_competence_percent NUMERIC(5,2) DEFAULT 35.0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;

-- Candidates Table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS readiness_score NUMERIC(5,2) DEFAULT 35.0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS dynamic_competence_percent NUMERIC(5,2) DEFAULT 35.0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS skill_score INT DEFAULT 35;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS verified_status VARCHAR(100) DEFAULT 'UNVERIFIED BASELINE';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'UNVERIFIED BASELINE';
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS capstone_proof TEXT;
ALTER TABLE public.candidates ALTER COLUMN skills SET DEFAULT '{}'::text[];
ALTER TABLE public.candidates ALTER COLUMN skills DROP NOT NULL;

-- Student Skill Progress Table
CREATE TABLE IF NOT EXISTS public.student_skill_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    skill_id VARCHAR(100),
    skill_name VARCHAR(150) NOT NULL,
    category VARCHAR(100) DEFAULT 'Core Skill',
    base_percentage INT DEFAULT 35,
    diagnostic_score INT DEFAULT 0,
    lecture_score INT DEFAULT 0,
    marathon_score INT DEFAULT 0,
    total_score INT DEFAULT 35,
    latest_exam_score NUMERIC(5,2) DEFAULT 0,
    status VARCHAR(100) DEFAULT 'UNVERIFIED BASELINE',
    verified BOOLEAN DEFAULT FALSE,
    lectures_completed INT DEFAULT 0,
    current_milestone TEXT,
    next_milestone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_skill UNIQUE(user_id, skill_name)
);

ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS skill_id VARCHAR(100);
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Core Skill';
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS base_percentage INT DEFAULT 35;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS diagnostic_score INT DEFAULT 0;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS lecture_score INT DEFAULT 0;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS marathon_score INT DEFAULT 0;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS total_score INT DEFAULT 35;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS latest_exam_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'UNVERIFIED BASELINE';
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS lectures_completed INT DEFAULT 0;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS current_milestone TEXT;
ALTER TABLE public.student_skill_progress ADD COLUMN IF NOT EXISTS next_milestone TEXT;

-- User Domain Progress Table (Domain Track Mastery)
CREATE TABLE IF NOT EXISTS public.user_domain_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    mastery_percent NUMERIC(5,2) DEFAULT 0,
    skill_scores JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_domain UNIQUE(user_email, domain)
);

-- ----------------------------------------------------------------------------------------------------
-- 2. AUTOMATIC READINESS & EVALUATION SYNC TRIGGER
-- Recalculates user competence & candidate readiness whenever skill evaluations change
-- ----------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_student_readiness_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_avg_score NUMERIC(5,2);
BEGIN
    v_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF v_user_id IS NOT NULL THEN
        SELECT ROUND(AVG(total_score), 1)
        INTO v_avg_score
        FROM public.student_skill_progress
        WHERE user_id = v_user_id;

        IF v_avg_score IS NOT NULL THEN
            UPDATE public.users
            SET dynamic_competence_percent = v_avg_score
            WHERE id = v_user_id;

            UPDATE public.candidates
            SET readiness_score = v_avg_score,
                dynamic_competence_percent = v_avg_score,
                skill_score = ROUND(v_avg_score)::int,
                status = CASE WHEN v_avg_score >= 80 THEN 'LIVE VERIFIED' ELSE 'UNVERIFIED BASELINE' END,
                verified_status = CASE WHEN v_avg_score >= 80 THEN 'LIVE VERIFIED' ELSE 'UNVERIFIED BASELINE' END
            WHERE user_id = v_user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_student_readiness ON public.student_skill_progress;
CREATE TRIGGER trigger_sync_student_readiness
AFTER INSERT OR UPDATE OR DELETE ON public.student_skill_progress
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_readiness_metrics();

-- ----------------------------------------------------------------------------------------------------
-- 3. ONE-TIME SYNCHRONIZATION OF EXISTING STUDENTS
-- Computes the true live readiness score for all existing users from student_skill_progress
-- ----------------------------------------------------------------------------------------------------
UPDATE public.users u
SET dynamic_competence_percent = COALESCE(sub.avg_score, u.dynamic_competence_percent)
FROM (
    SELECT user_id, ROUND(AVG(total_score), 1) AS avg_score
    FROM public.student_skill_progress
    GROUP BY user_id
) sub
WHERE u.id = sub.user_id;

UPDATE public.candidates c
SET readiness_score = COALESCE(sub.avg_score, c.readiness_score),
    dynamic_competence_percent = COALESCE(sub.avg_score, c.dynamic_competence_percent),
    skill_score = COALESCE(ROUND(sub.avg_score)::int, c.skill_score),
    status = CASE WHEN COALESCE(sub.avg_score, c.readiness_score) >= 80 THEN 'LIVE VERIFIED' ELSE 'UNVERIFIED BASELINE' END,
    verified_status = CASE WHEN COALESCE(sub.avg_score, c.readiness_score) >= 80 THEN 'LIVE VERIFIED' ELSE 'UNVERIFIED BASELINE' END
FROM (
    SELECT user_id, ROUND(AVG(total_score), 1) AS avg_score
    FROM public.student_skill_progress
    GROUP BY user_id
) sub
WHERE c.user_id = sub.user_id;

-- Link any unlinked candidates to users by matching email
UPDATE public.candidates c
SET user_id = u.id
FROM public.users u
WHERE c.user_id IS NULL AND LOWER(c.email) = LOWER(u.email);

-- Output status verification
SELECT COUNT(*) AS total_users, ROUND(AVG(dynamic_competence_percent), 1) AS avg_user_readiness FROM public.users;
SELECT COUNT(*) AS total_candidates, ROUND(AVG(readiness_score), 1) AS avg_candidate_readiness FROM public.candidates;
