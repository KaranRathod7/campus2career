-- =========================================================================
-- Campus2Career Enterprise Schema & Seed Migration for Supabase / PostgreSQL
-- =========================================================================

-- Enable pgcrypto / uuid-ossp for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('learner', 'recruiter', 'admin')),
    is_verified BOOLEAN DEFAULT FALSE,
    stream VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Database-Persisted Rate Limiting Table (IP & Email keying)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    failed_attempts INT DEFAULT 1,
    locked_until TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ip_email UNIQUE(ip_address, email)
);

-- 3. Pending Email Verifications (6-digit PIN + 32-byte secure hex token)
CREATE TABLE IF NOT EXISTS pending_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    pin VARCHAR(10) NOT NULL,
    token VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. High-Skilled Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    stream VARCHAR(50) NOT NULL,          -- e.g., 'CSE', 'IT', 'ECE', 'ME', 'AIDS'
    domain VARCHAR(100) NOT NULL,         -- e.g., 'Full-Stack', 'Distributed Systems', 'CAD / Simulation', 'Embedded Firmware'
    experience_level VARCHAR(20) NOT NULL,-- e.g., 'Fresher (0-1 yr)', '1-2 yrs'
    skill_score INT NOT NULL,             -- Skill assessment score (90+)
    skills TEXT[] NOT NULL,
    capstone_proof TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recruiters / Market Signals Table
CREATE TABLE IF NOT EXISTS market_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_name VARCHAR(100) NOT NULL,
    company VARCHAR(100) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    domain VARCHAR(100) NOT NULL,
    demand_surge VARCHAR(50),
    ctc_range VARCHAR(50),
    mandatory_skills TEXT[] NOT NULL,
    fresher_deficit TEXT NOT NULL,
    actionable_directive TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Student Market Feed / News Table
CREATE TABLE IF NOT EXISTS market_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    stream VARCHAR(50),
    summary TEXT NOT NULL,
    in_demand_skills TEXT[] NOT NULL,
    source_company VARCHAR(100),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Diagnostic / MCQ Benchmark Evaluations Table
CREATE TABLE IF NOT EXISTS diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    stream VARCHAR(50) NOT NULL,
    module_title VARCHAR(150) NOT NULL,
    mode INT DEFAULT 10,
    score INT NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    answers JSONB,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Administrative Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Student Activity Pipeline (Study Timers, Lecture Timers, Exam Submissions)
CREATE TABLE IF NOT EXISTS student_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('study_timer', 'lecture_timer', 'exam')),
    duration_minutes NUMERIC(8,2) DEFAULT 0,
    score NUMERIC(5,2),
    module_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Competence tracking columns on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_study_minutes INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_lecture_minutes INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_exam_score NUMERIC(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dynamic_competence_percent NUMERIC(5,2) DEFAULT 25.0;

-- Database Trigger: Automatically compute competence metrics on log insertion
CREATE OR REPLACE FUNCTION update_user_competence_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_study_mins NUMERIC(8,2);
    v_lecture_mins NUMERIC(8,2);
    v_avg_score NUMERIC(5,2);
    v_study_bonus NUMERIC(5,2);
    v_lecture_bonus NUMERIC(5,2);
    v_exam_bonus NUMERIC(5,2);
    v_competence NUMERIC(5,2);
BEGIN
    -- 1. Aggregate total study minutes
    SELECT COALESCE(SUM(duration_minutes), 0)
    INTO v_study_mins
    FROM student_activity_logs
    WHERE (user_id = NEW.user_id OR LOWER(user_email) = LOWER(NEW.user_email))
      AND activity_type = 'study_timer';

    -- 2. Aggregate total lecture minutes
    SELECT COALESCE(SUM(duration_minutes), 0)
    INTO v_lecture_mins
    FROM student_activity_logs
    WHERE (user_id = NEW.user_id OR LOWER(user_email) = LOWER(NEW.user_email))
      AND activity_type = 'lecture_timer';

    -- 3. Aggregate average exam score
    SELECT COALESCE(AVG(score), 0)
    INTO v_avg_score
    FROM student_activity_logs
    WHERE (user_id = NEW.user_id OR LOWER(user_email) = LOWER(NEW.user_email))
      AND activity_type = 'exam';

    -- 4. Dynamic composite competence formulation
    v_study_bonus := LEAST(25.0, (v_study_mins / 240.0) * 25.0);
    v_lecture_bonus := LEAST(20.0, (v_lecture_mins / 180.0) * 20.0);
    v_exam_bonus := (v_avg_score * 0.30);
    v_competence := LEAST(100.0, GREATEST(20.0, ROUND(25.0 + v_study_bonus + v_lecture_bonus + v_exam_bonus, 1)));

    -- 5. Update users table with newly calculated competence metrics
    UPDATE users
    SET total_study_minutes = ROUND(v_study_mins),
        total_lecture_minutes = ROUND(v_lecture_mins),
        avg_exam_score = ROUND(v_avg_score, 1),
        dynamic_competence_percent = v_competence
    WHERE id = NEW.user_id OR LOWER(email) = LOWER(NEW.user_email);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_competence ON student_activity_logs;
CREATE TRIGGER trigger_update_user_competence
AFTER INSERT ON student_activity_logs
FOR EACH ROW
EXECUTE FUNCTION update_user_competence_metrics();

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Seed 1: Sovereign Admin User (Password: Campus2Career#Admin2026!)
INSERT INTO users (name, email, password_hash, role, is_verified, stream)
VALUES (
    'Platform Administrator',
    'admin@campus2career.org',
    '$2b$10$x0AgxdV8b/d7IS1zrd9wnO8NEI.jSOrzt9RPjRswqzvNioAbkL9Da',
    'admin',
    TRUE,
    'ALL'
)
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash, role = 'admin', is_verified = TRUE;

-- Seed 2: 7 Dummy High-Skilled Candidates (Score >= 90)
INSERT INTO candidates (name, email, stream, domain, experience_level, skill_score, skills, capstone_proof)
VALUES 
(
    'Aman Patel',
    'aman.patel@engineering.edu',
    'IT',
    'Full-Stack & Microservices',
    'Fresher (0-1 yr)',
    94,
    ARRAY['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
    'Microservice-based Event Streaming Engine with Kafka and PostgreSQL outbox pattern. Benchmarked at 12,000 req/sec.'
),
(
    'Priya Sharma',
    'priya.sharma@systems.edu',
    'CSE',
    'Distributed Systems',
    'Fresher (0-1 yr)',
    96,
    ARRAY['Go', 'Raft Consensus', 'Redis Redlock', 'PostgreSQL'],
    'Fault-tolerant key-value store implementing Raft consensus in Go with linearizable reads and cluster heartbeat failover.'
),
(
    'Rohan Verma',
    'rohan.verma@embedded.edu',
    'ECE',
    'Embedded Firmware & RTOS',
    'Fresher (0-1 yr)',
    92,
    ARRAY['ARM Cortex-M', 'FreeRTOS', 'Bare-metal STM32', 'C/C++'],
    'Bare-metal STM32 register driver with DMA and FreeRTOS task notification queues with logic analyzer decodes.'
),
(
    'Neha Kulkarni',
    'neha.kulkarni@design.edu',
    'ME',
    'CAD / Product Design',
    '1-2 yrs',
    91,
    ARRAY['SolidWorks', 'ANSYS Mechanical', 'GD&T', 'DFM'],
    'Structural FEA optimization and thermal fatigue analysis for EV Battery Thermal Enclosures in SolidWorks and ANSYS.'
),
(
    'Devang Mehta',
    'devang.mehta@ai.edu',
    'AIDS',
    'GenAI & RAG Systems',
    'Fresher (0-1 yr)',
    95,
    ARRAY['Python', 'PyTorch', 'FastAPI', 'pgvector'],
    'Hybrid dense-sparse retrieval RAG system with sub-50ms latency using pgvector and FlashAttention kernels.'
),
(
    'Sneha Joshi',
    'sneha.joshi@cloud.edu',
    'CSE',
    'Cloud Infrastructure',
    '1-2 yrs',
    93,
    ARRAY['Kubernetes', 'Terraform', 'AWS', 'Linux Kernel Profiling'],
    'Multi-region Kubernetes ingress mesh with automated eBPF observability and zero-downtime rolling canary deployments.'
),
(
    'Aniket Shah',
    'aniket.shah@data.edu',
    'IT',
    'Database Engineering',
    'Fresher (0-1 yr)',
    92,
    ARRAY['PostgreSQL Internal Buffers', 'B-Tree Tuning', 'WAL Replication'],
    'Custom WAL parsing streaming replicator with B-Tree index fragmentation benchmark suite and buffer cache optimization.'
)
ON CONFLICT (email) DO UPDATE 
SET skill_score = EXCLUDED.skill_score, skills = EXCLUDED.skills, capstone_proof = EXCLUDED.capstone_proof;

-- Seed 3: 4-5 Recruiters & Market Signals
INSERT INTO market_signals (recruiter_name, company, stream, domain, demand_surge, ctc_range, mandatory_skills, fresher_deficit, actionable_directive)
VALUES
(
    'Dr. Vikram Kulkarni',
    'Qualcomm',
    'ECE',
    'Embedded Firmware & RTOS',
    '+84% Urgent Hiring Surge',
    '₹14 - ₹24 LPA',
    ARRAY['ARM Cortex-M', 'FreeRTOS', 'Bare-metal STM32', 'C/C++'],
    'Candidates lack bare-metal register debugging skills, rely on heavy HAL abstractions, and cannot diagnose DMA race conditions.',
    'Build register-level UART/SPI drivers from reference datasheets. Demonstrate FreeRTOS task scheduling with logic analyzer evidence.'
),
(
    'Ananya Deshmukh',
    'Razorpay',
    'CSE',
    'Distributed Systems',
    '+76% Urgent Hiring Surge',
    '₹18 - ₹28 LPA',
    ARRAY['Go', 'Raft Consensus', 'Redis Redlock', 'PostgreSQL'],
    'Candidates write naive CRUD APIs that fail under network partitions with duplicate double-spend race conditions.',
    'Master distributed lock algorithms, idempotent API design, and strict serializable transaction isolation in PostgreSQL.'
),
(
    'Karthik Ramanathan',
    'NVIDIA Partner',
    'AIDS',
    'GenAI & RAG Systems',
    '+92% Critical Demand',
    '₹16 - ₹30 LPA',
    ARRAY['Python', 'PyTorch', 'FastAPI', 'pgvector'],
    'Candidates only know toy API wrapper scripts and fail to optimize embedding cosine index latency or chunk re-ranking.',
    'Implement vector database indexing with HNSW in pgvector, fine-tune embedding bi-encoders, and profile sub-50ms token generation.'
),
(
    'Meera Sen',
    'Atlassian',
    'IT',
    'Full-Stack & Microservices',
    '+68% Hiring Surge',
    '₹15 - ₹26 LPA',
    ARRAY['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
    'Inability to handle async message queue worker backpressure and memory leaks in containerized Node runtimes.',
    'Implement transactional outbox patterns with PostgreSQL and message queues, with strict TypeScript interfaces across services.'
);

-- Seed 4: 2-3 Market Insights/News for the Student Dashboard
INSERT INTO market_news (title, stream, summary, in_demand_skills, source_company)
VALUES
(
    'Surge in Core Embedded Systems Hiring: Focus on RTOS and DMA over basic Arduino loops.',
    'ECE',
    'Leading semiconductor and automotive firms including Qualcomm report a 4x hiring surge for freshers capable of bare-metal register programming, FreeRTOS concurrency, and logic analyzer debugging.',
    ARRAY['ARM Cortex-M', 'FreeRTOS', 'Bare-metal STM32', 'C/C++'],
    'Qualcomm'
),
(
    'Enterprise Backend Pivot: 70%+ recruiters flagging deficit in raw SQL indexing and concurrency race handling.',
    'CSE',
    'Fintech and cloud platforms report rejection of candidates who cannot explain B-Tree index internals, transaction isolation levels, and atomic lock management under high concurrent workloads.',
    ARRAY['PostgreSQL', 'Go', 'Distributed Transactions', 'Redis Redlock'],
    'Razorpay'
),
(
    'AI Systems Demand: Engineering teams shifting hiring from wrapper APIs to vector indexing (HNSW) and model latency optimization.',
    'AIDS',
    'Top engineering teams are actively filtering for candidates who can optimize embedding retrieval, benchmark pgvector HNSW indexing, and deploy low-latency inference pipelines.',
    ARRAY['pgvector', 'PyTorch', 'FastAPI', 'HNSW Indexing'],
    'NVIDIA Partner'
);
