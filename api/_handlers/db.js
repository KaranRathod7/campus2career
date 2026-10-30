// Database integration module for Campus2Career (PostgreSQL / Supabase)
// Supports connection via process.env.POSTGRES_URL or local fallback store
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let pool = null;
let lastDbError = null;
let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      return supabaseClient;
    } catch (e) {
      console.warn('[DB Supabase Client Init Warning]', e.message);
    }
  }
  return null;
}

function getConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_POSTGRES_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    ''
  ).trim();
}

function initPool() {
  if (pool) return pool;

  const connectionString = getConnectionString();

  if (connectionString) {
    try {
      const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
      let parse;
      try {
        parse = require('pg-connection-string').parse;
      } catch (e) {}

      // Strip sslmode from URL so pg-connection-string or node-pg does not override custom SSL config
      const cleanUri = connectionString.replace(/([?&])sslmode=[^&]+(&|$)/i, '$1').replace(/[?&]$/, '');

      let poolConfig = {
        max: 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      };

      if (parse) {
        try {
          const parsed = parse(cleanUri);
          delete parsed.sslmode;
          poolConfig = {
            ...poolConfig,
            ...parsed,
            ssl: isLocal ? false : { rejectUnauthorized: false }
          };
        } catch (parseErr) {
          poolConfig.connectionString = cleanUri;
          poolConfig.ssl = isLocal ? false : { rejectUnauthorized: false };
        }
      } else {
        poolConfig.connectionString = cleanUri;
        poolConfig.ssl = isLocal ? false : { rejectUnauthorized: false };
      }

      pool = new Pool(poolConfig);

      pool.on('error', (err) => {
        console.error('[Campus2Career DB Pool Error]:', err.message);
        lastDbError = err.message;
      });

      console.log('[Campus2Career DB] PostgreSQL / Supabase pool configured with SSL support.');
      return pool;
    } catch (err) {
      console.error('[Campus2Career DB] Pool init failed:', err.message);
      lastDbError = err.message;
      pool = null;
      return null;
    }
  } else if (process.env.PGHOST) {
    try {
      pool = new Pool({
        host: process.env.PGHOST,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: (process.env.PGHOST === 'localhost' || process.env.PGHOST === '127.0.0.1') ? false : { rejectUnauthorized: false },
        max: 5,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 30000
      });
      console.log('[Campus2Career DB] PostgreSQL / Supabase pool configured via PGHOST.');
      return pool;
    } catch (err) {
      console.error('[Campus2Career DB] PGHOST Pool init failed:', err.message);
      lastDbError = err.message;
      pool = null;
      return null;
    }
  }

  return null;
}

initPool();

// In-memory / file-backed fallback store for seamless offline/local development
const ROOT_DIR = fs.existsSync(path.join(__dirname, '..', '..', 'local_pg_store.json'))
  ? path.join(__dirname, '..', '..')
  : (fs.existsSync(path.join(__dirname, '..', 'local_pg_store.json'))
      ? path.join(__dirname, '..')
      : process.cwd());
const LOCAL_DB_FILE = path.join(ROOT_DIR, 'candidates_db.json');
const LOCAL_STORE_FILE = path.join(ROOT_DIR, 'local_pg_store.json');

// Canonical Default Skills for Auto-Seeding Across Engineering Streams
const DEFAULT_SKILLS_BY_STREAM = {
  it: [
    { id: 'java', name: 'Java & Multithreading', category: 'Backend Language', current_milestone: 'Collections, Streams, Multithreading & OOP', next_milestone: 'JVM Memory Tuning & Low-latency locks' },
    { id: 'spring', name: 'Spring Boot & Microservices', category: 'Architecture', current_milestone: 'REST APIs, JPA Entities & Dependency Injection', next_milestone: 'Distributed Sagas & Circuit Breakers' },
    { id: 'postgres', name: 'PostgreSQL & SQL Tuning', category: 'Databases', current_milestone: 'Complex SQL, Transactions & Foreign Keys', next_milestone: 'B-Tree Index Tuning with EXPLAIN ANALYZE' },
    { id: 'docker', name: 'Docker & Containers', category: 'Cloud Infra', current_milestone: 'Multi-stage builds & Distroless images', next_milestone: 'Kubernetes Pod Deployment & Helm' },
    { id: 'debug', name: 'Production Debugging', category: 'Problem Solving', current_milestone: 'Stack trace diagnosis & unit test mocks', next_milestone: 'Heap dump analysis & connection leak profiling' }
  ],
  cse: [
    { id: 'cse_distributed', name: 'Distributed Systems & Raft', category: 'Core Systems', current_milestone: 'Raft consensus & quorum replication', next_milestone: 'Byzantine fault tolerance & gossip protocols' },
    { id: 'cse_os', name: 'Low-Level OS & Kernel Threads', category: 'Operating Systems', current_milestone: 'Virtual memory pages & context switching', next_milestone: 'Lock-free data structures & memory barriers' },
    { id: 'cse_db', name: 'High-Throughput Databases', category: 'Data Architecture', current_milestone: 'B-Tree & LSM-Tree indexing', next_milestone: 'Distributed 2PC & write-ahead logging' },
    { id: 'cse_k8s', name: 'Docker & Kubernetes Clusters', category: 'Cloud Infrastructure', current_milestone: 'Containers & pod lifecycle', next_milestone: 'Service meshes & ingress controllers' },
    { id: 'cse_debug', name: 'Production Debugging & APM', category: 'Reliability Engineering', current_milestone: 'Thread dump diagnosis & eBPF', next_milestone: 'Distributed tracing with OpenTelemetry' }
  ],
  ece: [
    { id: 'ece_firmware', name: 'Embedded C & ARM Cortex-M', category: 'Firmware', current_milestone: 'Memory-mapped registers & bare-metal C', next_milestone: 'Nested vector interrupt controller & DMA' },
    { id: 'ece_rtos', name: 'FreeRTOS & Real-Time Kernels', category: 'Real-Time Systems', current_milestone: 'Priority preemption & mutexes', next_milestone: 'Priority inversion & thread starvation' },
    { id: 'ece_pcb', name: 'KiCad & High-Speed PCB Layout', category: 'Hardware Design', current_milestone: 'Schematic capture & 4-layer stackup', next_milestone: 'Controlled impedance & high-speed differential pairs' },
    { id: 'ece_protocols', name: 'Serial Protocols (I2C, SPI, CAN)', category: 'Communication', current_milestone: 'Bit timing & bus arbitration', next_milestone: 'CAN-FD frames & CRC error injection' },
    { id: 'ece_debug', name: 'Hardware-in-Loop Debugging', category: 'Hardware Debugging', current_milestone: 'Digital oscilloscopes & logic analyzers', next_milestone: 'Signal ringing & cross-talk elimination' }
  ],
  aids: [
    { id: 'aids_rag', name: 'Generative AI & Vector DBs', category: 'Applied GenAI', current_milestone: 'Vector embeddings & cosine similarity', next_milestone: 'HNSW indexing & hybrid chunk re-ranking' },
    { id: 'aids_python', name: 'Python Concurrency & AsyncIO', category: 'Language Runtime', current_milestone: 'Event loops & coroutines', next_milestone: 'Multiprocessing & C-extensions' },
    { id: 'aids_finetune', name: 'LLM Fine-Tuning & Quantization', category: 'Model Optimization', current_milestone: 'LoRA adapters & prompt templates', next_milestone: '4-bit GGUF quantization & flash-attention' },
    { id: 'aids_serving', name: 'Production Model Serving', category: 'MLOps', current_milestone: 'FastAPI async inference endpoints', next_milestone: 'vLLM dynamic batching & tensor parallelism' },
    { id: 'aids_debug', name: 'GPU Memory & Latency Profiling', category: 'Reliability Engineering', current_milestone: 'CUDA OOM diagnosis & PyTorch profiler', next_milestone: 'Kernel fusion & latency optimization' }
  ],
  mechanical: [
    { id: 'mech_cad', name: 'SolidWorks & Parametric CAD', category: 'Design Engineering', current_milestone: 'Part modeling & GD&T tolerancing', next_milestone: 'Complex surfacing & sheet metal design' },
    { id: 'mech_fea', name: 'FEA Stress Analysis (ANSYS)', category: 'Simulation', current_milestone: 'Static structural mesh convergence', next_milestone: 'Non-linear plasticity & fatigue lifecycle' },
    { id: 'mech_cfd', name: 'CFD Fluid & Thermal Flow', category: 'Simulation', current_milestone: 'Boundary layer meshing & Navier-Stokes', next_milestone: 'Turbulence modeling (k-epsilon) & conjugate heat' },
    { id: 'mech_mfg', name: 'CNC Machining & DFM Guidelines', category: 'Manufacturing', current_milestone: 'G-Code generation & toolpath optimization', next_milestone: '5-Axis machining & automated CMM inspection' },
    { id: 'mech_debug', name: 'Failure Analysis & Reliability', category: 'Quality Engineering', current_milestone: 'Root-cause fractography & stress risers', next_milestone: 'Vibration FFT analysis & modal testing' }
  ]
};

// Stream Aliases for Robust Discipline Resolution
DEFAULT_SKILLS_BY_STREAM.me = DEFAULT_SKILLS_BY_STREAM.mechanical;
DEFAULT_SKILLS_BY_STREAM.mech = DEFAULT_SKILLS_BY_STREAM.mechanical;
DEFAULT_SKILLS_BY_STREAM.ai = DEFAULT_SKILLS_BY_STREAM.aids;
DEFAULT_SKILLS_BY_STREAM.cs = DEFAULT_SKILLS_BY_STREAM.cse;
DEFAULT_SKILLS_BY_STREAM.ee = DEFAULT_SKILLS_BY_STREAM.ece;

function resolveStreamKey(stream) {
  if (!stream) return 'it';
  const s = String(stream).trim().toLowerCase();
  if (s === 'me' || s === 'mech' || s.includes('mechanical') || s.includes('cad') || s.includes('fea')) return 'mechanical';
  if (s === 'cse' || s === 'cs' || s.includes('comp') || s.includes('distributed')) return 'cse';
  if (s === 'ece' || s === 'ee' || s.includes('elect') || s.includes('embedded') || s.includes('hardware')) return 'ece';
  if (s === 'aids' || s === 'ai' || s === 'ds' || s.includes('data science') || s.includes('genai') || s.includes('intelligence')) return 'aids';
  if (s === 'it' || s.includes('information') || s.includes('java')) return 'it';
  return s;
}

let inMemoryStore = null;

function normalizeStoreCollections(store) {
  if (!store) return store;
  if (!store.login_rate_limits) store.login_rate_limits = {};
  if (store.login_attempts && !Array.isArray(store.login_attempts)) {
    store.login_rate_limits = { ...store.login_rate_limits, ...store.login_attempts };
    store.login_attempts = [];
  }
  if (!Array.isArray(store.login_attempts)) store.login_attempts = [];
  if (!store.password_resets) store.password_resets = [];
  if (!store.student_test_attempts) store.student_test_attempts = [];
  if (!store.student_skill_progress) store.student_skill_progress = [];
  if (!store.user_completed_lectures) store.user_completed_lectures = [];
  return store;
}

function getLocalStore() {
  if (inMemoryStore) {
    return normalizeStoreCollections(inMemoryStore);
  }
  const tmpPath = path.join('/tmp', 'local_pg_store.json');
  if (fs.existsSync(tmpPath)) {
    try {
      inMemoryStore = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
      return normalizeStoreCollections(inMemoryStore);
    } catch (e) {}
  }
  if (fs.existsSync(LOCAL_STORE_FILE)) {
    try {
      inMemoryStore = JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));
      delete inMemoryStore.student_activity_logs;
      return normalizeStoreCollections(inMemoryStore);
    } catch (e) {}
  }
  inMemoryStore = {
    users: [
      {
        id: 'admin-uuid-1',
        name: 'Platform Administrator',
        email: 'admin@campus2career.org',
        password_hash: '$2b$10$x0AgxdV8b/d7IS1zrd9wnO8NEI.jSOrzt9RPjRswqzvNioAbkL9Da',
        role: 'admin',
        is_verified: true,
        stream: 'ALL'
      }
    ],
    login_rate_limits: {},
    login_attempts: [],
    password_resets: [],
    pending_verifications: [],
    candidates: [
      {
        id: 'cand-1',
        name: 'Aman Patel',
        email: 'aman.patel@engineering.edu',
        stream: 'IT',
        domain: 'Full-Stack & Microservices',
        experience_level: 'Fresher (0-1 yr)',
        skill_score: 94,
        skills: ['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
        capstone_proof: 'Microservice-based Event Streaming Engine with Kafka and PostgreSQL outbox pattern. Benchmarked at 12,000 req/sec.'
      },
      {
        id: 'cand-2',
        name: 'Priya Sharma',
        email: 'priya.sharma@systems.edu',
        stream: 'CSE',
        domain: 'Distributed Systems',
        experience_level: 'Fresher (0-1 yr)',
        skill_score: 96,
        skills: ['Go', 'Raft Consensus', 'Redis Redlock', 'PostgreSQL'],
        capstone_proof: 'Fault-tolerant key-value store implementing Raft consensus in Go with linearizable reads and cluster heartbeat failover.'
      },
      {
        id: 'cand-3',
        name: 'Rohan Verma',
        email: 'rohan.verma@embedded.edu',
        stream: 'ECE',
        domain: 'Embedded Firmware & RTOS',
        experience_level: 'Fresher (0-1 yr)',
        skill_score: 92,
        skills: ['ARM Cortex-M', 'FreeRTOS', 'Bare-metal STM32', 'C/C++'],
        capstone_proof: 'Bare-metal STM32 register driver with DMA and FreeRTOS task notification queues with logic analyzer decodes.'
      },
      {
        id: 'cand-4',
        name: 'Neha Kulkarni',
        email: 'neha.kulkarni@design.edu',
        stream: 'ME',
        domain: 'CAD / Product Design',
        experience_level: '1-2 yrs',
        skill_score: 91,
        skills: ['SolidWorks', 'ANSYS Mechanical', 'GD&T', 'DFM'],
        capstone_proof: 'Structural FEA optimization and thermal fatigue analysis for EV Battery Thermal Enclosures in SolidWorks and ANSYS.'
      },
      {
        id: 'cand-5',
        name: 'Devang Mehta',
        email: 'devang.mehta@ai.edu',
        stream: 'AIDS',
        domain: 'GenAI & RAG Systems',
        experience_level: 'Fresher (0-1 yr)',
        skill_score: 95,
        skills: ['Python', 'PyTorch', 'FastAPI', 'pgvector'],
        capstone_proof: 'Hybrid dense-sparse retrieval RAG system with sub-50ms latency using pgvector and FlashAttention kernels.'
      },
      {
        id: 'cand-6',
        name: 'Sneha Joshi',
        email: 'sneha.joshi@cloud.edu',
        stream: 'CSE',
        domain: 'Cloud Infrastructure',
        experience_level: '1-2 yrs',
        skill_score: 93,
        skills: ['Kubernetes', 'Terraform', 'AWS', 'Linux Kernel Profiling'],
        capstone_proof: 'Multi-region Kubernetes ingress mesh with automated eBPF observability and zero-downtime rolling canary deployments.'
      },
      {
        id: 'cand-7',
        name: 'Aniket Shah',
        email: 'aniket.shah@data.edu',
        stream: 'IT',
        domain: 'Database Engineering',
        experience_level: 'Fresher (0-1 yr)',
        skill_score: 92,
        skills: ['PostgreSQL Internal Buffers', 'B-Tree Tuning', 'WAL Replication'],
        capstone_proof: 'Custom WAL parsing streaming replicator with B-Tree index fragmentation benchmark suite and buffer cache optimization.'
      }
    ],
    market_signals: [
      {
        id: 'sig-1',
        recruiter_name: 'Dr. Vikram Kulkarni',
        company: 'Qualcomm',
        stream: 'ECE',
        domain: 'Embedded Firmware & RTOS',
        demand_surge: '+84% Urgent Hiring Surge',
        ctc_range: '₹14 - ₹24 LPA',
        mandatory_skills: ['ARM Cortex-M', 'FreeRTOS', 'Bare-metal STM32', 'C/C++'],
        fresher_deficit: 'Candidates lack bare-metal register debugging skills, rely on heavy HAL abstractions, and cannot diagnose DMA race conditions.',
        actionable_directive: 'Build register-level UART/SPI drivers from reference datasheets. Demonstrate FreeRTOS task scheduling with logic analyzer evidence.'
      },
      {
        id: 'sig-2',
        recruiter_name: 'Ananya Deshmukh',
        company: 'Razorpay',
        stream: 'CSE',
        domain: 'Distributed Systems',
        demand_surge: '+76% Urgent Hiring Surge',
        ctc_range: '₹18 - ₹28 LPA',
        mandatory_skills: ['Go', 'Raft Consensus', 'Redis Redlock', 'PostgreSQL'],
        fresher_deficit: 'Candidates write naive CRUD APIs that fail under network partitions with duplicate double-spend race conditions.',
        actionable_directive: 'Master distributed lock algorithms, idempotent API design, and strict serializable transaction isolation in PostgreSQL.'
      },
      {
        id: 'sig-3',
        recruiter_name: 'Karthik Ramanathan',
        company: 'NVIDIA Partner',
        stream: 'AIDS',
        domain: 'GenAI & RAG Systems',
        demand_surge: '+92% Critical Demand',
        ctc_range: '₹16 - ₹30 LPA',
        mandatory_skills: ['Python', 'PyTorch', 'FastAPI', 'pgvector'],
        fresher_deficit: 'Candidates only know toy API wrapper scripts and fail to optimize embedding cosine index latency or chunk re-ranking.',
        actionable_directive: 'Implement vector database indexing with HNSW in pgvector, fine-tune embedding bi-encoders, and profile sub-50ms token generation.'
      },
      {
        id: 'sig-4',
        recruiter_name: 'Meera Sen',
        company: 'Atlassian',
        stream: 'IT',
        domain: 'Full-Stack & Microservices',
        demand_surge: '+68% Hiring Surge',
        ctc_range: '₹15 - ₹26 LPA',
        mandatory_skills: ['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
        fresher_deficit: 'Inability to handle async message queue worker backpressure and memory leaks in containerized Node runtimes.',
        actionable_directive: 'Implement transactional outbox patterns with PostgreSQL and message queues, with strict TypeScript interfaces across services.'
      }
    ],
    market_news: [
      {
        id: 'news-1',
        title: 'Surge in Core Embedded Systems Hiring: Focus on RTOS and DMA over basic Arduino loops.',
        stream: 'ECE',
        summary: 'Leading semiconductor and automotive firms including Qualcomm report a 4x hiring surge for freshers capable of bare-metal register programming, FreeRTOS concurrency, and logic analyzer debugging.',
        in_demand_skills: ['ARM Cortex-M', 'FreeRTOS', 'Bare-metal STM32', 'C/C++'],
        source_company: 'Qualcomm',
        published_at: new Date().toISOString()
      },
      {
        id: 'news-2',
        title: 'Enterprise Backend Pivot: 70%+ recruiters flagging deficit in raw SQL indexing and concurrency race handling.',
        stream: 'CSE',
        summary: 'Fintech and cloud platforms report rejection of candidates who cannot explain B-Tree index internals, transaction isolation levels, and atomic lock management under high concurrent workloads.',
        in_demand_skills: ['PostgreSQL', 'Go', 'Distributed Transactions', 'Redis Redlock'],
        source_company: 'Razorpay',
        published_at: new Date().toISOString()
      },
      {
        id: 'news-3',
        title: 'AI Systems Demand: Engineering teams shifting hiring from wrapper APIs to vector indexing (HNSW) and model latency optimization.',
        stream: 'AIDS',
        summary: 'Top engineering teams are actively filtering for candidates who can optimize embedding retrieval, benchmark pgvector HNSW indexing, and deploy low-latency inference pipelines.',
        in_demand_skills: ['pgvector', 'PyTorch', 'FastAPI', 'HNSW Indexing'],
        source_company: 'NVIDIA Partner',
        published_at: new Date().toISOString()
      }
    ]
  };
}

function saveLocalStore(store) {
  inMemoryStore = store;
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    return;
  } catch (e) {}
  try {
    fs.writeFileSync(path.join('/tmp', 'local_pg_store.json'), JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Campus2Career DB] Local store write failed:', e.message);
  }
}

// Ensure schema is auto-migrated if connected to PostgreSQL
let schemaInitialized = false;
let schemaPromise = null;

async function ensureSchema() {
  const p = initPool();
  if (!p) return;
  if (schemaInitialized) return;
  if (schemaPromise) return await schemaPromise;

  schemaPromise = (async () => {
    try {
      // 1. Extension (safe ignore if restricted/already installed)
      try {
        await p.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
      } catch (e) {}

      // 2. Users Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          username VARCHAR(100),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'learner',
          is_verified BOOLEAN DEFAULT FALSE,
          stream VARCHAR(100) DEFAULT 'IT',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 3. User Table Column Migrations (in case table existed with fewer columns)
      const userCols = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS college VARCHAR(255);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS year INT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS target_role VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[];",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_study_minutes INT DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_lecture_minutes INT DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_exam_score NUMERIC(5,2) DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS dynamic_competence_percent NUMERIC(5,2) DEFAULT 25.0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_time VARCHAR(100);",
        "ALTER TABLE users DROP COLUMN IF EXISTS password;"
      ];
      for (const colSql of userCols) {
        try { await p.query(colSql); } catch (e) {}
      }

      // 4. Pending Verifications Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS pending_verifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          pin VARCHAR(20) NOT NULL,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await p.query('CREATE INDEX IF NOT EXISTS idx_pending_verifications_email ON pending_verifications (LOWER(TRIM(email)));');
      } catch (e) {}

      // 5. Login Rate Limits & Audit Log Tables
      await p.query(`
        CREATE TABLE IF NOT EXISTS login_rate_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ip_address VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          failed_attempts INT DEFAULT 1,
          locked_until TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_rate_limit_ip_email UNIQUE(ip_address, email)
        );
      `);

      await p.query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          email VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
          ip_address VARCHAR(100),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Migration for login_attempts if previously created with old rate-limiting schema
      const loginAttemptMigrations = [
        "ALTER TABLE login_attempts DROP CONSTRAINT IF EXISTS unique_ip_email;",
        "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS user_id UUID;",
        "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'SUCCESS';",
        "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS user_agent TEXT;",
        "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;",
        "ALTER TABLE login_attempts ALTER COLUMN failed_attempts DROP NOT NULL;",
        "CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts (LOWER(TRIM(email)));",
        "CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts (created_at DESC);",
        "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS login_time VARCHAR(100);",
        "ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS login_hour INT;",
        "CREATE INDEX IF NOT EXISTS idx_login_rate_limits_ip_email ON login_rate_limits (ip_address, LOWER(TRIM(email)));"
      ];
      for (const lam of loginAttemptMigrations) {
        try { await p.query(lam); } catch (e) {}
      }

      // Password Resets Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          token VARCHAR(100) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await p.query('CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (LOWER(TRIM(email)));');
        await p.query('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets (token);');
        await p.query('ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0;');
      } catch (e) {}

      // 6. Candidates Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          stream VARCHAR(50),
          domain VARCHAR(255),
          experience_level VARCHAR(100),
          skill_score NUMERIC(5,2) DEFAULT 90,
          dynamic_competence_percent NUMERIC(5,2) DEFAULT 90,
          readiness_score NUMERIC(5,2) DEFAULT 35,
          skills TEXT[],
          capstone_proof TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      const candCols = [
        "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id UUID;",
        "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS readiness_score NUMERIC(5,2) DEFAULT 35;",
        "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS capstone_proof TEXT;",
        "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS bio TEXT;"
      ];
      for (const cCol of candCols) {
        try { await p.query(cCol); } catch (e) {}
      }

      // 7. Student Study Activity Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS student_activity (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          stream VARCHAR(100) DEFAULT 'IT',
          topic VARCHAR(255) NOT NULL,
          activity_type VARCHAR(50) NOT NULL,
          score NUMERIC(5,2),
          time_spent_minutes INT DEFAULT 0,
          competence_rating NUMERIC(5,2) DEFAULT 35,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_activity_user_id ON student_activity (user_id);');
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_activity_created ON student_activity (created_at DESC);');
      } catch (e) {}

      // 8. Student Skill Progress Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS student_skill_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          skill_id VARCHAR(100),
          skill_name VARCHAR(255) NOT NULL,
          category VARCHAR(100) DEFAULT 'Core Skill',
          base_percentage INT DEFAULT 35,
          total_score INT DEFAULT 35,
          status VARCHAR(50) DEFAULT 'UNVERIFIED BASELINE',
          lectures_completed INT DEFAULT 0,
          current_milestone TEXT,
          next_milestone TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT uq_user_skill UNIQUE(user_id, skill_name)
        );
      `);
      try {
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_skill_user ON student_skill_progress (user_id);');
      } catch (e) {}

      const skillCols = [
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS skill_id VARCHAR(100);",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Core Skill';",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS base_percentage INT DEFAULT 35;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS total_score INT DEFAULT 35;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'UNVERIFIED BASELINE';",
        "ALTER TABLE student_skill_progress ALTER COLUMN status TYPE VARCHAR(100);",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS diagnostic_score INT DEFAULT 0;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS lecture_score INT DEFAULT 0;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS marathon_score INT DEFAULT 0;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS latest_exam_score NUMERIC(5,2) DEFAULT 0;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS lectures_completed INT DEFAULT 0;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS current_milestone TEXT;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS next_milestone TEXT;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"
      ];
      for (const sCol of skillCols) {
        try { await p.query(sCol); } catch (e) {}
      }

      // 9. User Completed Lectures Table (Anti-Fraud & Watch Time Verification)
      try {
        await p.query(`
          CREATE TABLE IF NOT EXISTS user_completed_lectures (
            id SERIAL PRIMARY KEY,
            user_id UUID,
            user_email VARCHAR(255),
            skill_name VARCHAR(255) NOT NULL,
            lecture_id VARCHAR(150) NOT NULL,
            duration_seconds INT NOT NULL,
            time_watched_seconds INT NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_user_skill_lecture UNIQUE(user_id, skill_name, lecture_id)
          );
        `);
        await p.query('CREATE INDEX IF NOT EXISTS idx_completed_lectures_user ON user_completed_lectures (user_id, skill_name);');
      } catch (e) {}

      // 9. User Completed Lectures Table (Anti-Fraud & Watch Time Verification)
      try {
        await p.query(`
          CREATE TABLE IF NOT EXISTS user_completed_lectures (
            id SERIAL PRIMARY KEY,
            user_id UUID,
            user_email VARCHAR(255),
            skill_name VARCHAR(255) NOT NULL,
            lecture_id VARCHAR(150) NOT NULL,
            duration_seconds INT NOT NULL,
            time_watched_seconds INT NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_user_skill_lecture UNIQUE(user_id, skill_name, lecture_id)
          );
        `);
        await p.query('CREATE INDEX IF NOT EXISTS idx_completed_lectures_user ON user_completed_lectures (user_id, skill_name);');
      } catch (e) {}

      // 10. Clean Up & Consolidate: Drop empty/deprecated student_activity_logs
      try {
        await p.query("DROP TABLE IF EXISTS student_activity_logs CASCADE;");
      } catch (e) {}

      // 11. Student Test Attempts Table (History Log for Line Charts & Performance)
      try {
        await p.query(`
          CREATE TABLE IF NOT EXISTS student_test_attempts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            skill_name VARCHAR(150) NOT NULL,
            test_title VARCHAR(255),
            score NUMERIC(5,2) NOT NULL,
            score_percentage NUMERIC(5,2),
            total_questions INT DEFAULT 0,
            correct_answers INT DEFAULT 0,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_test_attempts_user_skill ON student_test_attempts (user_id, skill_name);');
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_test_attempts_created_at ON student_test_attempts (created_at ASC);');

        // Extra column verification
        const attemptCols = [
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS core_skill VARCHAR(150);",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS test_skill VARCHAR(255);",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS skill_name VARCHAR(150);",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS test_title VARCHAR(255);",
          "UPDATE student_test_attempts SET core_skill = COALESCE(core_skill, skill_name) WHERE core_skill IS NULL;",
          "UPDATE student_test_attempts SET test_skill = COALESCE(test_skill, test_title) WHERE test_skill IS NULL;",
          "UPDATE student_test_attempts SET skill_name = COALESCE(skill_name, core_skill) WHERE skill_name IS NULL;",
          "UPDATE student_test_attempts SET test_title = COALESCE(test_title, test_skill) WHERE test_title IS NULL;",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS score_percentage NUMERIC(5,2);",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;",
          "ALTER TABLE student_test_attempts ADD COLUMN IF NOT EXISTS correct_answers INT DEFAULT 0;",
          "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;",
          "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS diagnostic_score INT DEFAULT 0;",
          "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS lecture_score INT DEFAULT 0;",
          "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS marathon_score INT DEFAULT 0;",
          "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS latest_exam_score NUMERIC(5,2) DEFAULT 0;",
          "ALTER TABLE student_skill_progress ALTER COLUMN status TYPE VARCHAR(100);",
          "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMP WITH TIME ZONE;"
        ];
        for (const ac of attemptCols) {
          try { await p.query(ac); } catch (e) {}
        }
      } catch (e) {}

      // 12. PostgreSQL Trigger: Auto-populate student_skill_progress summary on test attempt insert
      try {
        await p.query(`
          CREATE OR REPLACE FUNCTION trg_update_student_skill_progress()
          RETURNS TRIGGER AS $
          DECLARE
            v_base_percentage NUMERIC(5,2) := 35;
            v_diag_score INT := 0;
            v_lec_score INT := 0;
            v_mar_score INT := 0;
            v_gain INT := 0;
            v_new_diag INT := 0;
            v_raw_total NUMERIC(5,2) := 35;
            v_new_total NUMERIC(5,2) := 35;
            v_new_status VARCHAR(100) := 'UNVERIFIED BASELINE';
          BEGIN
            SELECT 
              COALESCE(base_percentage, 35),
              COALESCE(diagnostic_score, 0),
              COALESCE(lecture_score, 0),
              COALESCE(marathon_score, 0)
            INTO 
              v_base_percentage,
              v_diag_score,
              v_lec_score,
              v_mar_score
            FROM student_skill_progress
            WHERE (user_id = NEW.user_id OR user_id::text = NEW.user_id::text) AND LOWER(skill_name) = LOWER(NEW.skill_name)
            LIMIT 1;

            IF v_base_percentage IS NULL THEN
              v_base_percentage := 35;
            END IF;

            -- Incremental progression: Each 10-MCQ benchmark awards up to +5% (scaled by score/100) toward 34% ceiling
            v_gain := LEAST(5, GREATEST(0, ROUND((NEW.score / 100.0) * 5)));
            v_new_diag := LEAST(34, v_diag_score + v_gain);
            v_raw_total := v_base_percentage + v_lec_score + v_mar_score + v_new_diag;

            -- 80% Total Mastery Gate: Total score cannot exceed 80% unless latest benchmark score was 100%
            IF v_raw_total > 80 AND NEW.score < 100 THEN
              v_new_total := 80;
              v_new_status := '80% CAP (Score 100% on Benchmark to Unlock Master Level)';
            ELSIF NEW.score >= 80 OR v_raw_total >= 80 THEN
              v_new_total := LEAST(100, GREATEST(20, v_raw_total));
              v_new_status := 'LIVE VERIFIED';
            ELSE
              v_new_total := LEAST(100, GREATEST(20, v_raw_total));
              v_new_status := 'UNVERIFIED BASELINE';
            END IF;

            INSERT INTO student_skill_progress (
              user_id,
              skill_name,
              category,
              base_percentage,
              diagnostic_score,
              lecture_score,
              marathon_score,
              total_score,
              latest_exam_score,
              status,
              verified,
              last_tested_at,
              updated_at
            ) VALUES (
              NEW.user_id,
              NEW.skill_name,
              'Core Skill',
              v_base_percentage,
              v_new_diag,
              v_lec_score,
              v_mar_score,
              v_new_total,
              NEW.score,
              v_new_status,
              (NEW.score >= 80),
              NEW.created_at,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, skill_name) DO UPDATE SET
              diagnostic_score = EXCLUDED.diagnostic_score,
              total_score = EXCLUDED.total_score,
              latest_exam_score = EXCLUDED.latest_exam_score,
              status = EXCLUDED.status,
              verified = EXCLUDED.verified,
              last_tested_at = EXCLUDED.last_tested_at,
              updated_at = CURRENT_TIMESTAMP;

            RETURN NEW;
          END;
          $ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trg_after_test_attempt_insert ON student_test_attempts;
          CREATE TRIGGER trg_after_test_attempt_insert
          AFTER INSERT ON student_test_attempts
          FOR EACH ROW
          EXECUTE FUNCTION trg_update_student_skill_progress();
        `);
      } catch (e) {}

      // 13. Enable Row Level Security (RLS) on student_test_attempts and student_skill_progress
      try {
        await p.query(`
          ALTER TABLE student_test_attempts ENABLE ROW LEVEL SECURITY;
          ALTER TABLE student_skill_progress ENABLE ROW LEVEL SECURITY;

          DO \$\$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_test_attempts' AND policyname = 'student_test_attempts_select_own') THEN
              CREATE POLICY student_test_attempts_select_own ON student_test_attempts FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_skill_progress' AND policyname = 'student_skill_progress_select_own') THEN
              CREATE POLICY student_skill_progress_select_own ON student_skill_progress FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_test_attempts' AND policyname = 'student_test_attempts_insert_own') THEN
              CREATE POLICY student_test_attempts_insert_own ON student_test_attempts FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_skill_progress' AND policyname = 'student_skill_progress_all_own') THEN
              CREATE POLICY student_skill_progress_all_own ON student_skill_progress FOR ALL USING (auth.uid() = user_id OR auth.uid() IS NULL);
            END IF;
          END
          \$\$;
        `);
      } catch (e) {}

      // 7. Seed Admin if not present
      try {
        await p.query(`
          INSERT INTO users (name, email, password_hash, role, is_verified, stream)
          VALUES (
            'Platform Administrator',
            'admin@campus2career.org',
            '$2b$10$x0AgxdV8b/d7IS1zrd9wnO8NEI.jSOrzt9RPjRswqzvNioAbkL9Da',
            'admin',
            TRUE,
            'ALL'
          )
          ON CONFLICT (email) DO NOTHING;
        `);
      } catch (e) {}

      // 8. Automatic Cascade Deletion Trigger on users table
      try {
        await p.query(`
          CREATE OR REPLACE FUNCTION public.cascade_delete_user_data()
          RETURNS TRIGGER AS \$\$
          BEGIN
              IF to_regclass('public.candidates') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.candidates WHERE user_id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.student_skill_progress') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.student_skill_progress WHERE user_id = $1' USING OLD.id; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.user_domain_progress') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.user_domain_progress WHERE LOWER(TRIM(user_email)) = LOWER(TRIM($1))' USING OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.student_activity') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.student_activity WHERE user_id = $1' USING OLD.id; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.student_activity_logs') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.student_activity_logs WHERE user_id = $1 OR LOWER(TRIM(user_email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.user_completed_lectures') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.user_completed_lectures WHERE user_id = $1 OR LOWER(TRIM(user_email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.student_test_attempts') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.student_test_attempts WHERE user_id = $1' USING OLD.id; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.diagnostics') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.diagnostics WHERE LOWER(TRIM(user_email)) = LOWER(TRIM($1))' USING OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.login_attempts') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.login_attempts WHERE user_id = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($2))' USING OLD.id, OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.login_rate_limits') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.login_rate_limits WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))' USING OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.pending_verifications') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.pending_verifications WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))' USING OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              IF to_regclass('public.password_resets') IS NOT NULL THEN
                  BEGIN EXECUTE 'DELETE FROM public.password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))' USING OLD.email; EXCEPTION WHEN OTHERS THEN NULL; END;
              END IF;
              RETURN OLD;
          END;
          \$\$ LANGUAGE plpgsql;

          DROP TRIGGER IF EXISTS trigger_cascade_delete_user ON public.users;
          CREATE TRIGGER trigger_cascade_delete_user
          BEFORE DELETE ON public.users
          FOR EACH ROW
          EXECUTE FUNCTION public.cascade_delete_user_data();
        `);
      } catch (trgErr) {
        console.warn('[Campus2Career DB] Trigger creation notice:', trgErr.message);
      }

      schemaInitialized = true;
      console.log('[Campus2Career DB] Inline DDL schema verification successfully completed.');
    } catch (err) {
      console.error('[Campus2Career DB] Schema initialization error:', err.message, err.detail || '');
      schemaPromise = null;
      throw err;
    }
  })();

  return await schemaPromise;
}

async function query(text, params = []) {
  const p = initPool();
  if (p) {
    await ensureSchema();
    return await p.query(text, params);
  }
  return null;
}

// Helper DB API methods
const db = {
  // Query execution
  query,

  // Users
  async getUserByEmail(email) {
    const normalized = (email || '').trim().toLowerCase();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').ilike('email', normalized).maybeSingle();
        if (data && !error) return data;
      } catch (supaErr) {
        console.warn('[Campus2Career DB] Supabase getUserByEmail error:', supaErr.message);
      }
    }
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          'SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
          [normalized]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.error('[Campus2Career DB] Cloud getUserByEmail error:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }
    const store = getLocalStore();
    return (store.users || []).find(u => u.email.toLowerCase() === normalized) || null;
  },

  async getUserByUsername(username) {
    if (!username) return null;
    const normalized = username.trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          'SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM($1)) LIMIT 1',
          [normalized]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getUserByUsername notice:', err.message);
      }
    }
    const store = getLocalStore();
    return (store.users || []).find(u => u.username && u.username.toLowerCase() === normalized) || null;
  },

  async getUserById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          'SELECT * FROM users WHERE id::text = $1 LIMIT 1',
          [cleanId]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getUserById notice:', err.message);
      }
    }
    const store = getLocalStore();
    return (store.users || []).find(u => u.id === id || String(u.id) === cleanId) || null;
  },

  async resolveUserUuid(idOrEmail) {
    if (!idOrEmail) return null;
    const str = String(idOrEmail).trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
      return str;
    }
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR id::text = $1 OR LOWER(TRIM(username)) = LOWER(TRIM($1)) LIMIT 1',
          [str]
        );
        if (res.rows.length > 0) return res.rows[0].id;
      } catch (e) {}
    }
    const store = getLocalStore();
    const u = (store.users || []).find(x => x.email.toLowerCase() === str.toLowerCase() || x.id === str || (x.username && x.username.toLowerCase() === str.toLowerCase()));
    return u ? u.id : null;
  },

  async createUser({ name, username, email, password_hash, role, stream, is_verified = false }) {
    const normalized = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanUsername = (username || '').trim().toLowerCase() || normalized.split('@')[0];
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `INSERT INTO users (name, username, email, password_hash, role, stream, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [cleanName, cleanUsername, normalized, password_hash, role || 'learner', stream || 'IT', is_verified]
        );
        if (!res.rows || !res.rows[0]) {
          throw new Error('Database INSERT INTO users returned no row.');
        }
        return res.rows[0];
      } catch (err) {
        console.error('[DB Insert Error]:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }
    const store = getLocalStore();
    const newUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      username: cleanUsername,
      email: normalized,
      password_hash,
      role: role || 'learner',
      stream: stream || 'IT',
      is_verified,
      created_at: new Date().toISOString()
    };
    store.users.push(newUser);
    saveLocalStore(store);
    return newUser;
  },

  async upsertUser({ name, username, email, password_hash, role, stream, is_verified = false }) {
    const normalized = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanUsername = (username || '').trim().toLowerCase() || normalized.split('@')[0];
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `INSERT INTO users (name, username, email, password_hash, role, stream, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (email) DO UPDATE 
           SET name = EXCLUDED.name,
               username = EXCLUDED.username,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role,
               stream = EXCLUDED.stream,
               is_verified = EXCLUDED.is_verified
           RETURNING *`,
          [cleanName, cleanUsername, normalized, password_hash, role || 'learner', stream || 'IT', is_verified]
        );
        if (!res.rows || !res.rows[0]) {
          throw new Error('Database UPSERT INTO users returned no row.');
        }
        return res.rows[0];
      } catch (err) {
        console.error('[DB Upsert Error]:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }
    const store = getLocalStore();
    let u = store.users.find(usr => usr.email.toLowerCase() === normalized);
    if (u) {
      u.name = cleanName;
      u.username = cleanUsername;
      u.password_hash = password_hash;
      u.role = role || 'learner';
      u.stream = stream || 'IT';
      u.is_verified = is_verified;
    } else {
      u = {
        id: `usr-${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        email: normalized,
        password_hash,
        role: role || 'learner',
        stream: stream || 'IT',
        is_verified,
        created_at: new Date().toISOString()
      };
      store.users.push(u);
    }
    saveLocalStore(store);
    return u;
  },

  async markUserVerified(email) {
    const normalized = (email || '').trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          'UPDATE users SET is_verified = TRUE WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) RETURNING *',
          [normalized]
        );
        return res.rows[0] || true;
      } catch (err) {
        console.error('[Campus2Career DB] Cloud markUserVerified error:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }
    const store = getLocalStore();
    const u = store.users.find(usr => usr.email.toLowerCase() === normalized);
    if (u) {
      u.is_verified = true;
      saveLocalStore(store);
    }
    return true;
  },

  async updateUserProfile({ email, stream, branch, skills, college, year, active_domain, domain_progress }) {
    const normalized = (email || '').trim().toLowerCase();
    const cleanStream = (stream || branch || 'IT').toUpperCase();
    const cleanBranch = (branch || stream || 'it').toLowerCase();
    const cleanSkills = Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : null);

    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        try {
          await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(50);');
          await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS college VARCHAR(255);');
          await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS year INT;');
          await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[];');
          await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active_domain VARCHAR(100);');
          await p.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_progress JSONB;');
          await p.query(`
            CREATE TABLE IF NOT EXISTS user_domain_progress (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_email VARCHAR(255) NOT NULL,
              stream VARCHAR(50) NOT NULL,
              domain VARCHAR(100) NOT NULL,
              mastery_percent NUMERIC(5,2) DEFAULT 0,
              skill_scores JSONB,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT unique_user_domain UNIQUE(user_email, domain)
            );
          `);
        } catch (colErr) {}

        const res = await p.query(
          `UPDATE users 
           SET stream = $1,
               branch = COALESCE($2, branch),
               college = COALESCE($3, college),
               year = COALESCE($4, year),
               skills = COALESCE($5, skills),
               active_domain = COALESCE($6, active_domain),
               onboarded = TRUE
           WHERE LOWER(email) = $7
           RETURNING *`,
          [cleanStream, cleanBranch, college || null, year ? parseInt(year, 10) : null, cleanSkills, active_domain || null, normalized]
        );
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud updateUserProfile notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    const store = getLocalStore();
    const u = (store.users || []).find(usr => usr.email.toLowerCase() === normalized);
    if (u) {
      u.stream = cleanStream;
      u.branch = cleanBranch;
      if (college) u.college = college;
      if (year) u.year = parseInt(year, 10);
      if (cleanSkills) u.skills = cleanSkills;
      if (active_domain) u.active_domain = active_domain;
      if (domain_progress) u.domain_progress = domain_progress;
      saveLocalStore(store);
      return u;
    }
    return null;
  },

  async saveDomainProgress({ email, stream, domain, mastery_percent, skill_scores }) {
    const normalized = (email || '').trim().toLowerCase();
    const cleanStream = (stream || 'ECE').toUpperCase();
    const cleanDomain = (domain || '').trim();
    const mastery = Math.round(Number(mastery_percent) || 0);

    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        await p.query(`
          CREATE TABLE IF NOT EXISTS user_domain_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_email VARCHAR(255) NOT NULL,
            stream VARCHAR(50) NOT NULL,
            domain VARCHAR(100) NOT NULL,
            mastery_percent NUMERIC(5,2) DEFAULT 0,
            skill_scores JSONB,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_user_domain UNIQUE(user_email, domain)
          );
        `);
        const res = await p.query(
          `INSERT INTO user_domain_progress (user_email, stream, domain, mastery_percent, skill_scores, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (user_email, domain)
           DO UPDATE SET mastery_percent = EXCLUDED.mastery_percent,
                         skill_scores = EXCLUDED.skill_scores,
                         stream = EXCLUDED.stream,
                         updated_at = NOW()
           RETURNING *;`,
          [normalized, cleanStream, cleanDomain, mastery, JSON.stringify(skill_scores || {})]
        );
        if (res.rows[0]) return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud saveDomainProgress notice (falling back to local):', err.message);
      }
    }

    const store = getLocalStore();
    if (!store.user_domain_progress) store.user_domain_progress = [];
    let entry = store.user_domain_progress.find(p => p.user_email.toLowerCase() === normalized && p.domain === cleanDomain);
    if (!entry) {
      entry = {
        id: `udp-${Date.now()}`,
        user_email: normalized,
        stream: cleanStream,
        domain: cleanDomain,
        mastery_percent: mastery,
        skill_scores: skill_scores || {},
        updated_at: new Date().toISOString()
      };
      store.user_domain_progress.push(entry);
    } else {
      entry.mastery_percent = mastery;
      entry.skill_scores = skill_scores || {};
      entry.stream = cleanStream;
      entry.updated_at = new Date().toISOString();
    }
    saveLocalStore(store);
    return entry;
  },

  async getDomainProgress(email) {
    const normalized = (email || '').trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query('SELECT * FROM user_domain_progress WHERE LOWER(user_email) = $1', [normalized]);
        if (res.rows) return res.rows;
      } catch (err) {}
    }
    const store = getLocalStore();
    return (store.user_domain_progress || []).filter(p => (p.user_email || '').toLowerCase() === normalized);
  },

  async getAllUsers() {
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query('SELECT id, name, email, role, stream, is_verified, created_at FROM users ORDER BY created_at DESC');
        return res.rows;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getAllUsers notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    return (store.users || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      stream: u.stream || 'IT',
      is_verified: Boolean(u.is_verified),
      created_at: u.created_at || new Date().toISOString()
    }));
  },

  async deleteUser(idOrEmail) {
    const val = (idOrEmail || '').trim().toLowerCase();
    const p = initPool();
    let deletedId = null;
    let deletedEmail = null;

    if (p) {
      try {
        await ensureSchema();
        // First look up user's id and email to cascade delete cleanly
        const uRes = await p.query(
          'SELECT id, email FROM users WHERE id::text = $1 OR LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1',
          [val]
        );
        if (uRes.rows.length > 0) {
          deletedId = uRes.rows[0].id;
          deletedEmail = uRes.rows[0].email.toLowerCase().trim();

          const safeQuery = async (queryText, params) => {
            try {
              await p.query(queryText, params);
            } catch (qErr) {
              if (qErr.code !== '42P01') {
                console.warn('[DB deleteUser notice]:', qErr.message);
              }
            }
          };

          await safeQuery('DELETE FROM student_skill_progress WHERE user_id = $1', [deletedId]);
          await safeQuery('DELETE FROM student_test_attempts WHERE user_id = $1', [deletedId]);
          await safeQuery('DELETE FROM user_completed_lectures WHERE user_id = $1 OR LOWER(TRIM(user_email)) = $2', [deletedId, deletedEmail]);
          await safeQuery('DELETE FROM student_activity WHERE user_id = $1', [deletedId]);
          await safeQuery('DELETE FROM student_activity_logs WHERE user_id = $1 OR LOWER(TRIM(user_email)) = $2', [deletedId, deletedEmail]);
          await safeQuery('DELETE FROM candidates WHERE user_id = $1 OR LOWER(TRIM(email)) = $2', [deletedId, deletedEmail]);
          await safeQuery('DELETE FROM password_resets WHERE LOWER(TRIM(email)) = $1', [deletedEmail]);
          await safeQuery('DELETE FROM pending_verifications WHERE LOWER(TRIM(email)) = $1', [deletedEmail]);
          await safeQuery('DELETE FROM login_attempts WHERE user_id = $1 OR LOWER(TRIM(email)) = $2', [deletedId, deletedEmail]);
          await safeQuery('DELETE FROM login_rate_limits WHERE LOWER(TRIM(email)) = $1', [deletedEmail]);
          await safeQuery('DELETE FROM user_domain_progress WHERE LOWER(TRIM(user_email)) = $1', [deletedEmail]);
          await safeQuery('DELETE FROM diagnostics WHERE LOWER(TRIM(user_email)) = $1', [deletedEmail]);
          await p.query('DELETE FROM users WHERE id = $1', [deletedId]);
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud deleteUser notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    // Purge from Supabase if configured
    const sb = this.getSupabaseClient();
    if (sb && (deletedId || deletedEmail)) {
      try {
        if (deletedId) {
          await sb.from('student_skill_progress').delete().eq('user_id', deletedId);
          await sb.from('student_test_attempts').delete().eq('user_id', deletedId);
          await sb.from('login_attempts').delete().eq('user_id', deletedId);
        }
        if (deletedEmail) {
          await sb.from('candidates').delete().ilike('email', deletedEmail);
          await sb.from('login_attempts').delete().ilike('email', deletedEmail);
        }
      } catch (e) {}
    }

    // Local fallback store purge
    const store = getLocalStore();
    const userToDel = (store.users || []).find(u => u.id === idOrEmail || u.email.toLowerCase() === val);
    const uId = (userToDel && userToDel.id) || deletedId || idOrEmail;
    const uEmail = (userToDel && userToDel.email ? userToDel.email.toLowerCase() : null) || deletedEmail || val;

    store.users = (store.users || []).filter(u => u.id !== uId && u.email.toLowerCase() !== uEmail);
    if (store.student_skill_progress) {
      store.student_skill_progress = store.student_skill_progress.filter(s => s.user_id !== uId && (s.user_email ? s.user_email.toLowerCase() !== uEmail : true));
    }
    if (store.student_test_attempts) {
      store.student_test_attempts = store.student_test_attempts.filter(a => a.user_id !== uId);
    }
    if (store.user_completed_lectures) {
      store.user_completed_lectures = store.user_completed_lectures.filter(l => l.user_id !== uId && (l.user_email ? l.user_email.toLowerCase() !== uEmail : true));
    }
    if (store.student_activity) {
      store.student_activity = store.student_activity.filter(a => a.user_id !== uId && (a.user_email ? a.user_email.toLowerCase() !== uEmail : true));
    }
    if (store.candidates) {
      store.candidates = store.candidates.filter(c => c.user_id !== uId && (c.email ? c.email.toLowerCase() !== uEmail : true));
    }
    if (store.password_resets) {
      store.password_resets = store.password_resets.filter(pr => pr.email.toLowerCase() !== uEmail);
    }
    if (store.pending_verifications) {
      store.pending_verifications = store.pending_verifications.filter(pv => pv.email.toLowerCase() !== uEmail);
    }
    if (store.login_attempts) {
      store.login_attempts = store.login_attempts.filter(l => l.user_id !== uId && (l.email ? l.email.toLowerCase() !== uEmail : true));
    }
    if (store.login_rate_limits) {
      Object.keys(store.login_rate_limits).forEach(k => {
        if (k.toLowerCase().includes(uEmail)) delete store.login_rate_limits[k];
      });
    }
    if (store.user_domain_progress) {
      if (typeof store.user_domain_progress === 'object' && !Array.isArray(store.user_domain_progress)) {
        Object.keys(store.user_domain_progress).forEach(k => {
          const val = store.user_domain_progress[k];
          if ((val && val.user_email && val.user_email.toLowerCase() === uEmail) || k.toLowerCase().includes(uEmail)) {
            delete store.user_domain_progress[k];
          }
        });
      } else if (Array.isArray(store.user_domain_progress)) {
        store.user_domain_progress = store.user_domain_progress.filter(dp => (dp.user_email ? dp.user_email.toLowerCase() !== uEmail : true));
      }
    }
    if (store.diagnostics && Array.isArray(store.diagnostics)) {
      store.diagnostics = store.diagnostics.filter(d => (d.user_email ? d.user_email.toLowerCase() !== uEmail : true));
    }
    saveLocalStore(store);
    return Boolean(userToDel || deletedId);
  },

  // Rate Limiting (Brute-Force Protection via login_rate_limits)
  async checkRateLimit(ip, email) {
    const ipAddr = ip || '127.0.0.1';
    const emailAddr = (email || '').trim().toLowerCase();
    const now = new Date();
    const p = initPool();

    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT failed_attempts, locked_until 
           FROM login_rate_limits 
           WHERE ip_address = $1 AND LOWER(TRIM(email)) = LOWER(TRIM($2))`,
          [ipAddr, emailAddr]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          if (row.failed_attempts >= 5 && row.locked_until && new Date(row.locked_until) > now) {
            const remainingSecs = Math.ceil((new Date(row.locked_until).getTime() - now.getTime()) / 1000);
            return { isLocked: true, remainingSecs, attempts: row.failed_attempts };
          }
        }
        return { isLocked: false, remainingSecs: 0, attempts: res.rows[0] ? res.rows[0].failed_attempts : 0 };
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud checkRateLimit notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    const store = getLocalStore();
    const key = `${ipAddr}_${emailAddr}`;
    const entry = (store.login_rate_limits && store.login_rate_limits[key]) || (store.login_attempts && !Array.isArray(store.login_attempts) && store.login_attempts[key]);
    if (entry && entry.failed_attempts >= 5 && entry.locked_until && new Date(entry.locked_until) > now) {
      const remainingSecs = Math.ceil((new Date(entry.locked_until).getTime() - now.getTime()) / 1000);
      return { isLocked: true, remainingSecs, attempts: entry.failed_attempts };
    }
    return { isLocked: false, remainingSecs: 0, attempts: entry ? entry.failed_attempts : 0 };
  },

  async recordFailedAttempt(ip, email) {
    const ipAddr = ip || '127.0.0.1';
    const emailAddr = (email || '').trim().toLowerCase();
    const now = new Date();
    const p = initPool();

    if (p) {
      try {
        await ensureSchema();
        const cur = await p.query(
          `SELECT failed_attempts FROM login_rate_limits WHERE ip_address = $1 AND LOWER(TRIM(email)) = LOWER(TRIM($2))`,
          [ipAddr, emailAddr]
        );
        let attempts = 1;
        if (cur.rows.length > 0) {
          attempts = cur.rows[0].failed_attempts + 1;
        }

        // Exponential backoff:
        // 5th attempt = 5 minutes lockout
        // 6th+ attempt = 15 minutes lockout
        let lockedUntil = null;
        if (attempts === 5) {
          lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
        } else if (attempts >= 6) {
          lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
        }

        await p.query(
          `INSERT INTO login_rate_limits (ip_address, email, failed_attempts, locked_until, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (ip_address, email) 
           DO UPDATE SET failed_attempts = $3, locked_until = $4, updated_at = NOW()`,
          [ipAddr, emailAddr, attempts, lockedUntil]
        );

        return {
          attempts,
          isLocked: attempts >= 5,
          remainingSecs: lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) : 0
        };
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordFailedAttempt notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    const store = getLocalStore();
    if (!store.login_rate_limits) store.login_rate_limits = {};
    const key = `${ipAddr}_${emailAddr}`;
    const entry = store.login_rate_limits[key] || { failed_attempts: 0 };
    entry.failed_attempts += 1;
    let lockedUntil = null;
    if (entry.failed_attempts === 5) {
      lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
    } else if (entry.failed_attempts >= 6) {
      lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    }
    entry.locked_until = lockedUntil ? lockedUntil.toISOString() : null;
    entry.updated_at = now.toISOString();
    store.login_rate_limits[key] = entry;
    saveLocalStore(store);

    return {
      attempts: entry.failed_attempts,
      isLocked: entry.failed_attempts >= 5,
      remainingSecs: lockedUntil ? Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000) : 0
    };
  },

  async clearRateLimit(ip, email) {
    const ipAddr = ip || '127.0.0.1';
    const emailAddr = (email || '').trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        await p.query('DELETE FROM login_rate_limits WHERE ip_address = $1 AND LOWER(TRIM(email)) = LOWER(TRIM($2))', [ipAddr, emailAddr]);
        return;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud clearRateLimit notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    if (store.login_rate_limits) {
      const key = `${ipAddr}_${emailAddr}`;
      delete store.login_rate_limits[key];
      saveLocalStore(store);
    }
  },

  // Audit Log: Record Every Login Attempt (SUCCESS and FAILED)
  async recordLoginAttempt({ user_id, email, status, ip_address, user_agent, clientTime, clientTimezone }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanStatus = (status || 'SUCCESS').toUpperCase();
    const cleanIp = ip_address || '127.0.0.1';
    const cleanAgent = user_agent || 'Unknown';
    let validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;

    const now = new Date();
    const tz = clientTimezone || 'Asia/Kolkata';
    let formattedTime = '';
    let localHour = now.getHours();
    try {
      formattedTime = new Intl.DateTimeFormat('en-IN', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now) + ` (${tz})`;
      const hourPart = new Intl.DateTimeFormat('en-IN', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false
      }).format(now);
      localHour = parseInt(hourPart, 10);
    } catch (e) {
      formattedTime = now.toLocaleString() + ' (Asia/Kolkata)';
      localHour = now.getHours();
    }

    // Supabase SDK attempt if available
    const sb = this.getSupabaseClient();
    if (sb) {
      try {
        const { data, error } = await sb
          .from('login_attempts')
          .insert([
            {
              user_id: validUuid,
              email: cleanEmail,
              status: cleanStatus,
              ip_address: cleanIp,
              user_agent: cleanAgent,
              login_time: formattedTime,
              login_hour: localHour
            }
          ])
          .select()
          .single();
        if (!error && data) return data;
      } catch (e) {
        console.warn('[Campus2Career Supabase login_attempts notice]:', e.message);
      }
    }

    // Direct PostgreSQL Pool
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        if (!validUuid && cleanStatus === 'SUCCESS') {
          const u = await p.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [cleanEmail]);
          if (u.rows.length > 0) validUuid = u.rows[0].id;
        }
        const res = await p.query(
          `INSERT INTO login_attempts (user_id, email, status, ip_address, user_agent, login_time, login_hour, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING *`,
          [validUuid, cleanEmail, cleanStatus, cleanIp, cleanAgent, formattedTime, localHour]
        );

        if (cleanStatus === 'SUCCESS') {
          await p.query(
            `UPDATE users SET last_login_at = NOW(), last_login_time = $1, updated_at = NOW() WHERE id = $2 OR LOWER(TRIM(email)) = $3`,
            [formattedTime, validUuid, cleanEmail]
          ).catch(() => {});
        }

        return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordLoginAttempt notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    // Local / In-Memory Fallback
    const store = getLocalStore();
    if (!Array.isArray(store.login_attempts)) store.login_attempts = [];
    const entry = {
      id: `login-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      user_id: validUuid || null,
      email: cleanEmail,
      status: cleanStatus,
      ip_address: cleanIp,
      user_agent: cleanAgent,
      login_time: formattedTime,
      login_hour: localHour,
      created_at: new Date().toISOString()
    };
    store.login_attempts.push(entry);
    if (cleanStatus === 'SUCCESS') {
      const u = (store.users || []).find(usr => (validUuid && usr.id === validUuid) || (usr.email && usr.email.toLowerCase() === cleanEmail));
      if (u) {
        u.last_login_at = new Date().toISOString();
        u.last_login_time = formattedTime;
      }
    }
    saveLocalStore(store);
    return entry;
  },

  // Password Reset OTP Management
  async checkPasswordResetCooldown(email, cooldownSeconds = 60) {
    const normalized = (email || '').trim().toLowerCase();
    const cutoff = new Date(Date.now() - cooldownSeconds * 1000).toISOString();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase
          .from('password_resets')
          .select('created_at')
          .ilike('email', normalized)
          .gt('created_at', cutoff)
          .limit(1)
          .maybeSingle();
        if (data) return true;
      } catch (e) {}
    }

    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT created_at FROM password_resets 
           WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
             AND created_at > ($2)::timestamptz 
           LIMIT 1`,
          [normalized, cutoff]
        );
        if (res.rows && res.rows.length > 0) return true;
      } catch (e) {}
    }

    const store = getLocalStore();
    if (store.password_resets && Array.isArray(store.password_resets)) {
      const recent = store.password_resets.find(pr => 
        pr.email && pr.email.toLowerCase() === normalized &&
        new Date(pr.created_at).getTime() > (Date.now() - cooldownSeconds * 1000)
      );
      if (recent) return true;
    }

    return false;
  },

  async purgePasswordResets(email) {
    const normalized = (email || '').trim().toLowerCase();

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('password_resets').delete().ilike('email', normalized);
      } catch (e) {}
    }

    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        await p.query('DELETE FROM password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [normalized]);
      } catch (e) {}
    }

    const store = getLocalStore();
    if (store.password_resets) {
      store.password_resets = store.password_resets.filter(pr => !(pr.email && pr.email.toLowerCase() === normalized));
      saveLocalStore(store);
    }
  },

  async createPasswordReset(email, token, expiresAt) {
    const normalized = (email || '').trim().toLowerCase();
    const expiryDate = expiresAt || new Date(Date.now() + 5 * 60 * 1000); // 5 mins strict
    const expiryIso = expiryDate.toISOString ? expiryDate.toISOString() : new Date(expiryDate).toISOString();
    const nowIso = new Date().toISOString();
    const cleanToken = String(token || '').trim();

    // 1. Supabase Client Integration
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Purge old codes for this email
        await supabase
          .from('password_resets')
          .delete()
          .ilike('email', normalized);

        const { data, error } = await supabase
          .from('password_resets')
          .insert([{
            email: normalized,
            token: cleanToken,
            expires_at: expiryIso
          }])
          .select()
          .maybeSingle();

        if (!error && data) return data;
      } catch (err) {
        console.warn('[Supabase createPasswordReset Warning]', err.message);
      }
    }

    // 2. Direct PostgreSQL Pool
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        // Delete previous tokens for this email
        await p.query('DELETE FROM password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [normalized]);
        const res = await p.query(
          `INSERT INTO password_resets (email, token, expires_at, created_at)
           VALUES ($1, $2, ($3)::timestamptz, ($4)::timestamptz)
           RETURNING *`,
          [normalized, cleanToken, expiryIso, nowIso]
        );
        return res.rows[0];
      } catch (err) {
        console.error('[Campus2Career DB] Cloud createPasswordReset error:', err.message);
        lastDbError = err.message;
      }
    }

    // 3. Local JSON Fallback Store
    const store = getLocalStore();
    if (!store.password_resets) store.password_resets = [];
    store.password_resets = store.password_resets.filter(pr => !(pr.email && pr.email.toLowerCase() === normalized));
    const entry = {
      id: `pr-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      email: normalized,
      token: cleanToken,
      expires_at: expiryIso,
      created_at: nowIso
    };
    store.password_resets.push(entry);
    saveLocalStore(store);
    return entry;
  },

  async verifyAndUsePasswordReset(email, token, newPasswordHash) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCode = String(token || '').trim();
    const nowIso = new Date().toISOString();
    const nowTime = Date.now();

    console.log(`[RESET VERIFY ATTEMPT] Verifying code for email: "${cleanEmail}", token: "${cleanCode}"`);

    // 1. Supabase Client Check (if configured)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: record, error: fetchErr } = await supabase
          .from('password_resets')
          .select('*')
          .ilike('email', cleanEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (record && !fetchErr) {
          if (new Date(record.expires_at).getTime() < nowTime) {
            console.warn(`[RESET EXPIRED] Code expired for: ${cleanEmail}`);
            await supabase.from('password_resets').delete().eq('id', record.id);
            return { success: false, error: 'Verification code has expired (validity is 5 minutes). Please request a new code.' };
          }

          const currentAttempts = Number(record.attempts) || 0;
          if (currentAttempts >= 5) {
            await supabase.from('password_resets').delete().eq('id', record.id);
            return {
              success: false,
              status: 403,
              error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
              attemptsRemaining: 0
            };
          }

          if (String(record.token).trim() !== cleanCode) {
            const newAttempts = currentAttempts + 1;
            if (newAttempts >= 5) {
              await supabase.from('password_resets').delete().eq('id', record.id);
              return {
                success: false,
                status: 403,
                error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
                attemptsRemaining: 0
              };
            }
            await supabase.from('password_resets').update({ attempts: newAttempts }).eq('id', record.id);
            const remaining = 5 - newAttempts;
            return {
              success: false,
              status: 400,
              error: `Invalid verification code. ${remaining} attempt(s) remaining before security lockout.`,
              attemptsRemaining: remaining
            };
          }

          // Fetch user to get current token_version
          const { data: existingUser } = await supabase
            .from('users')
            .select('id, email, token_version')
            .ilike('email', cleanEmail)
            .maybeSingle();

          const nextTokenVersion = ((existingUser && existingUser.token_version !== undefined && existingUser.token_version !== null)
            ? Number(existingUser.token_version)
            : 1) + 1;

          // Update user password_hash safely (strictly NO updated_at)
          let res1 = await supabase
            .from('users')
            .update({
              password_hash: newPasswordHash,
              token_version: nextTokenVersion
            })
            .ilike('email', cleanEmail)
            .select('id, email, name, role, stream, branch, skills, college, year, token_version');

          if (res1.error && res1.error.message && res1.error.message.includes('token_version')) {
            res1 = await supabase
              .from('users')
              .update({
                password_hash: newPasswordHash
              })
              .ilike('email', cleanEmail)
              .select('id, email, name, role, stream, branch, skills, college, year');
          }

          // Delete OTP from database immediately upon successful reset
          await supabase.from('password_resets').delete().ilike('email', cleanEmail);

          if (res1.data && res1.data.length > 0) {
            console.log(`[RESET SUCCESS] Verified and updated password in Supabase for: ${cleanEmail}`);
            return { success: true, message: 'Password reset successful!', user: res1.data[0] };
          }
        }
      } catch (err) {
        console.warn('[Supabase verifyAndUsePasswordReset Warning]', err.message);
      }
    }

    // 2. Direct PostgreSQL Pool Check
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT * FROM password_resets 
           WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
           ORDER BY created_at DESC LIMIT 1`,
          [cleanEmail]
        );

        if (res.rows && res.rows.length > 0) {
          const record = res.rows[0];
          if (new Date(record.expires_at).getTime() < nowTime) {
            console.warn(`[RESET EXPIRED] Code expired for: ${cleanEmail}`);
            await p.query('DELETE FROM password_resets WHERE id = $1', [record.id]);
            return { success: false, error: 'Verification code has expired (validity is 5 minutes). Please request a new code.' };
          }

          const currentAttempts = Number(record.attempts) || 0;
          if (currentAttempts >= 5) {
            await p.query('DELETE FROM password_resets WHERE id = $1', [record.id]);
            return {
              success: false,
              status: 403,
              error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
              attemptsRemaining: 0
            };
          }

          if (String(record.token).trim() !== cleanCode) {
            const newAttempts = currentAttempts + 1;
            if (newAttempts >= 5) {
              await p.query('DELETE FROM password_resets WHERE id = $1', [record.id]);
              return {
                success: false,
                status: 403,
                error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
                attemptsRemaining: 0
              };
            }
            await p.query('UPDATE password_resets SET attempts = $1 WHERE id = $2', [newAttempts, record.id]);
            const remaining = 5 - newAttempts;
            return {
              success: false,
              status: 400,
              error: `Invalid verification code. ${remaining} attempt(s) remaining before security lockout.`,
              attemptsRemaining: remaining
            };
          }

          let updateRes;
          try {
            updateRes = await p.query(
              'UPDATE users SET password_hash = $1, token_version = COALESCE(token_version, 1) + 1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) RETURNING id, email, name, role, stream, branch, skills, college, year, token_version',
              [newPasswordHash, cleanEmail]
            );
          } catch (tokErr) {
            updateRes = await p.query(
              'UPDATE users SET password_hash = $1 WHERE LOWER(TRIM(email)) = LOWER(TRIM($2)) RETURNING id, email, name, role, stream, branch, skills, college, year',
              [newPasswordHash, cleanEmail]
            );
          }

          // Delete OTP from database immediately upon successful reset
          await p.query('DELETE FROM password_resets WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [cleanEmail]);

          if (updateRes.rows && updateRes.rows.length > 0) {
            console.log(`[RESET SUCCESS] Verified and updated password in Postgres for: ${cleanEmail}`);
            return { success: true, message: 'Password reset successful!', user: updateRes.rows[0] };
          }
          return { success: false, error: 'User account not found.' };
        }
      } catch (err) {
        console.error('[Campus2Career DB] Cloud verifyAndUsePasswordReset error:', err.message);
        lastDbError = err.message;
      }
    }

    // 3. Local JSON Store Check
    const store = getLocalStore();
    if (!store.password_resets) store.password_resets = [];
    const entryIndex = store.password_resets.slice().reverse().findIndex(pr => 
      pr.email && pr.email.toLowerCase() === cleanEmail
    );

    if (entryIndex === -1) {
      console.warn(`[RESET FAIL] Active reset record not found for: ${cleanEmail}`);
      return { success: false, error: 'Code not found. Please request a new code.' };
    }

    const realIndex = store.password_resets.length - 1 - entryIndex;
    const entry = store.password_resets[realIndex];

    if (new Date(entry.expires_at).getTime() < nowTime) {
      console.warn(`[RESET EXPIRED] Local code expired for: ${cleanEmail}`);
      store.password_resets.splice(realIndex, 1);
      saveLocalStore(store);
      return { success: false, error: 'Verification code has expired (validity is 5 minutes). Please request a new code.' };
    }

    const currentAttempts = Number(entry.attempts) || 0;
    if (currentAttempts >= 5) {
      store.password_resets.splice(realIndex, 1);
      saveLocalStore(store);
      return {
        success: false,
        status: 403,
        error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
        attemptsRemaining: 0
      };
    }

    if (String(entry.token).trim() !== cleanCode) {
      const newAttempts = currentAttempts + 1;
      if (newAttempts >= 5) {
        store.password_resets.splice(realIndex, 1);
        saveLocalStore(store);
        return {
          success: false,
          status: 403,
          error: 'Too many invalid attempts. Verification code has been invalidated for security. Please request a new code.',
          attemptsRemaining: 0
        };
      }
      entry.attempts = newAttempts;
      saveLocalStore(store);
      const remaining = 5 - newAttempts;
      return {
        success: false,
        status: 400,
        error: `Invalid verification code. ${remaining} attempt(s) remaining before security lockout.`,
        attemptsRemaining: remaining
      };
    }

    // Delete immediately on success
    store.password_resets.splice(realIndex, 1);

    // Update user in store & increment token_version
    const user = (store.users || []).find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      saveLocalStore(store);
      return { success: false, error: 'User account not found.' };
    }

    user.password_hash = newPasswordHash;
    user.token_version = (user.token_version ? Number(user.token_version) : 1) + 1;
    user.updated_at = nowIso;
    saveLocalStore(store);

    console.log(`[RESET SUCCESS] Verified and updated password in local store for: ${cleanEmail}`);
    return { success: true, message: 'Password reset successful!', user: { id: user.id, email: user.email, name: user.name, token_version: user.token_version } };
  },

  async getPasswordReset(email) {
    const normalized = (email || '').trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT * FROM password_resets 
           WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
           ORDER BY created_at DESC LIMIT 1`,
          [normalized]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.error('[Campus2Career DB] Cloud getPasswordReset error:', err.message);
      }
    }
    const store = getLocalStore();
    const entry = (store.password_resets || []).find(pr => pr.email && pr.email.toLowerCase() === normalized);
    return entry || null;
  },

  // Pending Verifications
  async createPendingVerification(email, pin, token) {
    const normalized = (email || '').trim().toLowerCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const p = initPool();

    if (p) {
      try {
        await ensureSchema();
        // Remove any previous pending verification for this email
        await p.query('DELETE FROM pending_verifications WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [normalized]);
        const res = await p.query(
          `INSERT INTO pending_verifications (email, pin, token, expires_at)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [normalized, pin, token, expiresAt]
        );
        return res.rows[0] || { email: normalized, pin, token, expires_at: expiresAt };
      } catch (err) {
        console.error('[DB Insert Error - pending_verifications]:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }

    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }

    const store = getLocalStore();
    store.pending_verifications = (store.pending_verifications || []).filter(v => v.email.toLowerCase() !== normalized);
    const rec = {
      id: `pv-${Date.now()}`,
      email: normalized,
      pin,
      token,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
    store.pending_verifications.push(rec);
    saveLocalStore(store);
    return rec;
  },

  async getPendingVerification(email, tokenOrPin) {
    const normalized = (email || '').trim().toLowerCase();
    const cleanTokenOrPin = (tokenOrPin || '').toString().trim();
    const now = new Date();
    const p = initPool();

    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT * FROM pending_verifications 
           WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) 
             AND (TRIM(token) = $2 OR TRIM(pin) = $2 OR pin::text = $2) 
             AND expires_at > (NOW() - INTERVAL '2 minutes')
           ORDER BY created_at DESC LIMIT 1`,
          [normalized, cleanTokenOrPin]
        );
        return res.rows[0] || null;
      } catch (err) {
        console.error('[DB Lookup Error - pending_verifications]:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }

    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }

    const store = getLocalStore();
    return (store.pending_verifications || []).find(v => 
      v.email.toLowerCase() === normalized &&
      (v.token === cleanTokenOrPin || v.pin === cleanTokenOrPin) &&
      new Date(v.expires_at) > now
    ) || null;
  },

  async deletePendingVerification(email) {
    const normalized = (email || '').trim().toLowerCase();
    const p = initPool();

    if (p) {
      try {
        await ensureSchema();
        await p.query('DELETE FROM pending_verifications WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))', [normalized]);
        return;
      } catch (err) {
        console.error('[DB Delete Error - pending_verifications]:', err.message, err.detail || '');
        lastDbError = err.message;
        throw err;
      }
    }

    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      throw new Error('Database pool not connected: Missing POSTGRES_URL or DATABASE_URL environment variable on server.');
    }

    const store = getLocalStore();
    store.pending_verifications = (store.pending_verifications || []).filter(v => v.email.toLowerCase() !== normalized);
    saveLocalStore(store);
  },

  // Candidates Directory with Dynamic Competence & Verified Cohort Calculation
  async getCandidates({ stream, domain, experience } = {}) {
    const enrichCandidate = (c) => {
      const score = Number(c.skill_score || c.score || c.dynamic_competence_percent || 90);
      const studyMins = Number(c.total_study_minutes !== undefined ? c.total_study_minutes : 95);
      const lectureMins = Number(c.total_lecture_minutes !== undefined ? c.total_lecture_minutes : 65);
      const totalMins = studyMins + lectureMins;
      const examScore = Number(c.verified_exam_score !== undefined ? c.verified_exam_score : (c.avg_exam_score !== undefined ? c.avg_exam_score : score));

      const pct = Math.min(100, Math.max(0, Math.round(Number(c.dynamic_competence_percent !== undefined ? c.dynamic_competence_percent : score) * 10) / 10));

      let level = 1;
      let levelLabel = "Level 1: Unverified Baseline";
      if (pct >= 90) {
        level = 5;
        levelLabel = "Level 5: Elite Systems Master";
      } else if (pct >= 75) {
        level = 4;
        levelLabel = "Level 4: Advanced Recruiter Tier";
      } else if (pct >= 55) {
        level = 3;
        levelLabel = "Level 3: Proficient Practitioner";
      } else if (pct >= 30) {
        level = 2;
        levelLabel = "Level 2: Developing Competence";
      }

      // Verified talent pool eligibility: requires Level >= 4, verified test >= 80%, minimum 60 min tracked study time
      const isVerifiedTalent = (c.is_verified_talent !== undefined)
        ? Boolean(c.is_verified_talent)
        : (level >= 4 && examScore >= 80 && totalMins >= 60);

      return {
        ...c,
        skill_score: pct,
        dynamic_competence_percent: pct,
        dynamic_competence_level: level,
        dynamic_competence_label: levelLabel,
        total_study_minutes: studyMins,
        total_lecture_minutes: lectureMins,
        verified_exam_score: examScore,
        is_verified_talent: isVerifiedTalent
      };
    };

    if (pool) {
      try {
        await ensureSchema();
        let queryStr = 'SELECT * FROM candidates WHERE skill_score >= 75';
        const params = [];
        let idx = 1;

        if (stream && stream !== 'all') {
          queryStr += ` AND UPPER(stream) = $${idx++}`;
          params.push(stream.toUpperCase());
        }
        if (domain && domain !== 'all') {
          queryStr += ` AND domain ILIKE $${idx++}`;
          params.push(`%${domain}%`);
        }
        if (experience && experience !== 'all') {
          queryStr += ` AND experience_level ILIKE $${idx++}`;
          params.push(`%${experience}%`);
        }

        queryStr += ' ORDER BY skill_score DESC, created_at DESC';
        const res = await pool.query(queryStr, params);
        if (res && res.rows && res.rows.length > 0) {
          return res.rows.map(enrichCandidate);
        }
        console.log('[Campus2Career DB] Cloud database returned 0 candidates, utilizing seeded candidate pool.');
      } catch (dbErr) {
        console.warn('[Campus2Career DB] Cloud candidates query notice (recovering with fallback pool):', dbErr.message);
        lastDbError = dbErr.message;
      }
    }

    const store = getLocalStore();
    let list = (store.candidates || []).slice();

    // Include registered learners who reached Level 4+ (competence >= 75%) or qualified for talent cohort
    const qualifiedUsers = (store.users || []).filter(u => {
      const uCompetence = Number(u.dynamic_competence_percent) || 0;
      const uStudy = (Number(u.total_study_minutes) || 0) + (Number(u.total_lecture_minutes) || 0);
      const uExam = Number(u.avg_exam_score) || 0;
      return (uCompetence >= 75 || (uExam >= 80 && uStudy >= 60)) &&
        !list.some(c => (c.email || '').toLowerCase() === (u.email || '').toLowerCase());
    }).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      stream: (u.stream || 'IT').toUpperCase(),
      domain: 'Systems & Engineering Track',
      experience_level: 'Fresher (0-1 yr)',
      skill_score: Number(u.dynamic_competence_percent) || 75,
      dynamic_competence_percent: Number(u.dynamic_competence_percent) || 75,
      total_study_minutes: Number(u.total_study_minutes) || 0,
      total_lecture_minutes: Number(u.total_lecture_minutes) || 0,
      verified_exam_score: Number(u.avg_exam_score) || 0,
      skills: [(u.stream || 'IT').toUpperCase(), 'Verified Learner', 'Continuous Engineering'],
      capstone_proof: `Verified Student Activity: ${Number(u.total_study_minutes) || 0}m study time, ${Number(u.total_lecture_minutes) || 0}m lecture time, and ${Number(u.avg_exam_score) || 0}% benchmark examination mastery.`
    }));

    list = list.concat(qualifiedUsers).map(enrichCandidate);

    if (stream && stream !== 'all') {
      list = list.filter(c => c.stream.toUpperCase() === stream.toUpperCase());
    }
    if (domain && domain !== 'all') {
      list = list.filter(c => c.domain.toLowerCase().includes(domain.toLowerCase()));
    }
    if (experience && experience !== 'all') {
      list = list.filter(c => c.experience_level.toLowerCase().includes(experience.toLowerCase()));
    }
    return list.sort((a, b) => (b.dynamic_competence_percent || b.skill_score) - (a.dynamic_competence_percent || a.skill_score));
  },

  async getCandidateById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    const cleanLower = cleanId.toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          'SELECT * FROM candidates WHERE id::text = $1 OR user_id::text = $1 OR LOWER(TRIM(email)) = $2 OR LOWER(TRIM(name)) = $2 OR LOWER(TRIM(REPLACE(name, \' \', \'_\'))) = $2 LIMIT 1',
          [cleanId, cleanLower]
        );
        if (res.rows[0]) return res.rows[0];

        const uRes = await p.query(
          'SELECT id, name, email, stream, role, dynamic_competence_percent AS skill_score FROM users WHERE id::text = $1 OR LOWER(TRIM(email)) = $2 OR LOWER(TRIM(username)) = $2 OR LOWER(TRIM(name)) = $2 OR LOWER(TRIM(REPLACE(name, \' \', \'_\'))) = $2 LIMIT 1',
          [cleanId, cleanLower]
        );
        if (uRes.rows[0]) {
          return {
            ...uRes.rows[0],
            domain: `${uRes.rows[0].stream || 'Core'} Engineering Track`
          };
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getCandidateById notice:', err.message);
      }
    }
    const store = getLocalStore();
    const cand = (store.candidates || []).find(c => 
      (c.id && String(c.id).toLowerCase() === cleanLower) ||
      (c.user_id && String(c.user_id).toLowerCase() === cleanLower) ||
      (c.email && c.email.toLowerCase() === cleanLower) ||
      (c.name && (c.name.toLowerCase() === cleanLower || c.name.toLowerCase().replace(/\s+/g, '_') === cleanLower))
    );
    if (cand) return cand;

    const usr = (store.users || []).find(u => 
      (u.id && String(u.id).toLowerCase() === cleanLower) ||
      (u.email && u.email.toLowerCase() === cleanLower) ||
      (u.username && u.username.toLowerCase() === cleanLower) ||
      (u.name && (u.name.toLowerCase() === cleanLower || u.name.toLowerCase().replace(/\s+/g, '_') === cleanLower))
    );
    if (usr) {
      return {
        id: usr.id,
        name: usr.name,
        email: usr.email,
        stream: usr.stream || 'IT',
        domain: 'Core Engineering Track',
        skill_score: usr.dynamic_competence_percent || 90
      };
    }
    return null;
  },

  // Market Signals
  async getMarketSignals() {
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query('SELECT * FROM market_signals ORDER BY created_at DESC');
        return res.rows;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getMarketSignals notice:', err.message);
      }
    }
    const store = getLocalStore();
    return store.market_signals || [];
  },

  async createMarketSignal({ recruiter_name, company, stream, domain, demand_surge, ctc_range, mandatory_skills, fresher_deficit, actionable_directive }) {
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query(
          `INSERT INTO market_signals (recruiter_name, company, stream, domain, demand_surge, ctc_range, mandatory_skills, fresher_deficit, actionable_directive)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [recruiter_name, company, stream, domain, demand_surge || '+75% Surge', ctc_range || '₹12 - ₹24 LPA', mandatory_skills, fresher_deficit, actionable_directive]
        );
        return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud createMarketSignal notice:', err.message);
      }
    }
    const store = getLocalStore();
    const sig = {
      id: `sig-${Date.now()}`,
      recruiter_name,
      company,
      stream,
      domain,
      demand_surge: demand_surge || '+75% Surge',
      ctc_range: ctc_range || '₹12 - ₹24 LPA',
      mandatory_skills,
      fresher_deficit,
      actionable_directive,
      created_at: new Date().toISOString()
    };
    store.market_signals.unshift(sig);
    saveLocalStore(store);
    return sig;
  },

  // Market News
  async getMarketNews() {
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query('SELECT * FROM market_news ORDER BY published_at DESC');
        return res.rows;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getMarketNews notice:', err.message);
      }
    }
    const store = getLocalStore();
    return store.market_news || [];
  },

  async createMarketNews({ title, stream, summary, in_demand_skills, source_company }) {
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query(
          `INSERT INTO market_news (title, stream, summary, in_demand_skills, source_company)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [title, stream, summary, in_demand_skills, source_company]
        );
        return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud createMarketNews notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    const news = {
      id: `news-${Date.now()}`,
      title,
      stream,
      summary,
      in_demand_skills,
      source_company,
      published_at: new Date().toISOString()
    };
    store.market_news.unshift(news);
    saveLocalStore(store);
    return news;
  },

  // Diagnostics & Benchmark Evaluations
  async recordDiagnostic({ user_email, stream, module_title, mode, score, passed, answers }) {
    const normalized = (user_email || '').trim().toLowerCase();
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query(
          `INSERT INTO diagnostics (user_email, stream, module_title, mode, score, passed, answers)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [normalized, stream || 'IT', module_title, mode || 10, score, passed, JSON.stringify(answers || [])]
        );
        return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordDiagnostic notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    if (!store.diagnostics) store.diagnostics = [];
    const diag = {
      id: `diag-${Date.now()}`,
      user_email: normalized,
      stream: stream || 'IT',
      module_title,
      mode: mode || 10,
      score,
      passed,
      answers: answers || [],
      submitted_at: new Date().toISOString()
    };
    store.diagnostics.unshift(diag);
    saveLocalStore(store);
    return diag;
  },

  async getUserDiagnostics(user_email) {
    const normalized = (user_email || '').trim().toLowerCase();
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query(
          'SELECT * FROM diagnostics WHERE LOWER(user_email) = $1 ORDER BY submitted_at DESC',
          [normalized]
        );
        return res.rows;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getUserDiagnostics notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    return (store.diagnostics || []).filter(d => (d.user_email || '').toLowerCase() === normalized);
  },

  // Sovereign Admin Audit Logs
  async recordAuditLog({ actor_email, action, details, ip_address }) {
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query(
          `INSERT INTO audit_logs (actor_email, action, details, ip_address)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [actor_email || 'admin@campus2career.org', action, details || '', ip_address || '127.0.0.1']
        );
        return res.rows[0];
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordAuditLog notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    if (!store.audit_logs) store.audit_logs = [];
    const log = {
      id: `audit-${Date.now()}`,
      actor_email: actor_email || 'admin@campus2career.org',
      action,
      details: details || '',
      ip_address: ip_address || '127.0.0.1',
      created_at: new Date().toISOString()
    };
    store.audit_logs.unshift(log);
    saveLocalStore(store);
    return log;
  },

  async getAuditLogs() {
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
        return res.rows;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getAuditLogs notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }
    const store = getLocalStore();
    return (store.audit_logs || []).slice(0, 50);
  },

  // Student Activity Pipeline & Dynamic Competence Tracking
  async logStudentActivity({ user_id, user_email, activity_type, duration_minutes, score, module_name }) {
    const normalizedEmail = (user_email || '').trim().toLowerCase();
    const duration = Math.max(0, Number(duration_minutes) || 0);
    const scoreVal = score !== undefined && score !== null ? Number(score) : null;
    const cleanMod = module_name || 'General Engineering Module';

    if (pool) {
      try {
        await ensureSchema();
        const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
        // Insert row into student_activity_logs (Trigger automatically executes)
        const insertRes = await pool.query(
          `INSERT INTO student_activity_logs (user_id, user_email, activity_type, duration_minutes, score, module_name)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [validUuid, normalizedEmail, activity_type, duration, scoreVal, cleanMod]
        );

        // Query the trigger-updated metrics from users table
        const userRes = await pool.query(
          `SELECT total_study_minutes, total_lecture_minutes, avg_exam_score, dynamic_competence_percent
           FROM users
           WHERE (id::text = $1 OR LOWER(email) = $2) LIMIT 1`,
          [validUuid || '00000000-0000-0000-0000-000000000000', normalizedEmail]
        );

        const metrics = userRes.rows[0] || {
          total_study_minutes: duration,
          total_lecture_minutes: 0,
          avg_exam_score: scoreVal || 0,
          dynamic_competence_percent: 25.0
        };

        // Update candidates table dynamic competence
        try {
          if (validUuid || normalizedEmail) {
            await pool.query(
              `UPDATE candidates 
               SET dynamic_competence_percent = $1, readiness_score = GREATEST(candidates.readiness_score, $1)
               WHERE user_id = $2 OR LOWER(email) = $3`,
              [Number(metrics.dynamic_competence_percent) || 25.0, validUuid, normalizedEmail]
            );
          }
        } catch (candActErr) {}

        return {
          activity: insertRes.rows[0],
          competence: {
            total_study_minutes: Number(metrics.total_study_minutes) || 0,
            total_lecture_minutes: Number(metrics.total_lecture_minutes) || 0,
            avg_exam_score: Number(metrics.avg_exam_score) || 0,
            dynamic_competence_percent: Number(metrics.dynamic_competence_percent) || 25.0
          }
        };
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud logStudentActivity notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    // High-reliability local fallback store
    const store = getLocalStore();
    if (!store.student_activity_logs) store.student_activity_logs = [];

    const activity = {
      id: `act-${Date.now()}`,
      user_id: user_id || null,
      user_email: normalizedEmail,
      activity_type,
      duration_minutes: duration,
      score: scoreVal,
      module_name: cleanMod,
      created_at: new Date().toISOString()
    };
    store.student_activity_logs.unshift(activity);

    // Compute updated aggregates
    const userLogs = store.student_activity_logs.filter(l => 
      (user_id && l.user_id === user_id) || 
      (normalizedEmail && (l.user_email || '').toLowerCase() === normalizedEmail)
    );

    const totalStudy = userLogs
      .filter(l => l.activity_type === 'study_timer')
      .reduce((sum, l) => sum + (Number(l.duration_minutes) || 0), 0);

    const totalLecture = userLogs
      .filter(l => l.activity_type === 'lecture_timer')
      .reduce((sum, l) => sum + (Number(l.duration_minutes) || 0), 0);

    const examLogs = userLogs.filter(l => l.activity_type === 'exam' && l.score !== null && l.score !== undefined);
    const avgExam = examLogs.length > 0 
      ? Math.round(examLogs.reduce((sum, l) => sum + Number(l.score), 0) / examLogs.length)
      : 0;

    const studyBonus = Math.min(25.0, (totalStudy / 240.0) * 25.0);
    const lectureBonus = Math.min(20.0, (totalLecture / 180.0) * 20.0);
    const examBonus = avgExam * 0.30;
    const competence = Math.min(100.0, Math.max(20.0, Math.round((25.0 + studyBonus + lectureBonus + examBonus) * 10) / 10));

    // Update user in local store if user exists
    const user = (store.users || []).find(u => (user_id && u.id === user_id) || (u.email.toLowerCase() === normalizedEmail));
    if (user) {
      user.total_study_minutes = Math.round(totalStudy);
      user.total_lecture_minutes = Math.round(totalLecture);
      user.avg_exam_score = avgExam;
      user.dynamic_competence_percent = competence;
    }

    saveLocalStore(store);

    return {
      activity,
      competence: {
        total_study_minutes: Math.round(totalStudy),
        total_lecture_minutes: Math.round(totalLecture),
        avg_exam_score: avgExam,
        dynamic_competence_percent: competence
      }
    };
  },

  async getStudentCompetence(user_id, user_email) {
    const normalizedEmail = (user_email || '').trim().toLowerCase();
    if (pool) {
      try {
        await ensureSchema();
        const res = await pool.query(
          `SELECT total_study_minutes, total_lecture_minutes, avg_exam_score, dynamic_competence_percent
           FROM users
           WHERE (id::text = $1 OR LOWER(email) = $2) LIMIT 1`,
          [user_id ? String(user_id) : '00000000-0000-0000-0000-000000000000', normalizedEmail]
        );
        if (res.rows.length > 0) {
          return {
            total_study_minutes: Number(res.rows[0].total_study_minutes) || 0,
            total_lecture_minutes: Number(res.rows[0].total_lecture_minutes) || 0,
            avg_exam_score: Number(res.rows[0].avg_exam_score) || 0,
            dynamic_competence_percent: Number(res.rows[0].dynamic_competence_percent) || 25.0
          };
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getStudentCompetence notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    const store = getLocalStore();
    const user = (store.users || []).find(u => (user_id && u.id === user_id) || (u.email.toLowerCase() === normalizedEmail));
    if (user) {
      return {
        total_study_minutes: user.total_study_minutes || 0,
        total_lecture_minutes: user.total_lecture_minutes || 0,
        avg_exam_score: user.avg_exam_score || 0,
        dynamic_competence_percent: user.dynamic_competence_percent || 25.0
      };
    }
    return {
      total_study_minutes: 0,
      total_lecture_minutes: 0,
      avg_exam_score: 0,
      dynamic_competence_percent: 25.0
    };
  },

  // Supabase SDK Client Factory
  getSupabaseClient() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      try {
        const { createClient } = require('@supabase/supabase-js');
        return createClient(url, key);
      } catch (e) {
        console.warn('[Campus2Career Supabase Client Load Warning]', e.message);
      }
    }
    return null;
  },

  // Record student test attempt in student_test_attempts and update student_skill_progress
  async recordTestAttempt({ user_id, skill_name, test_title, score, total_questions, correct_answers, metadata }) {
    let validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
    const cleanSkill = (skill_name || 'Core Skill').trim();
    const cleanTitle = (test_title || `${cleanSkill} Assessment`).trim();
    const numScore = Math.min(100, Math.max(0, Number(score) || 0));
    const totalQ = Math.max(0, Number(total_questions) || 0);
    const correctA = Math.max(0, Number(correct_answers) || 0);
    const metaObj = (metadata && typeof metadata === 'object') ? metadata : {};

    const p = initPool();
    let attempt = null;
    let summary = null;

    if (p) {
      try {
        await ensureSchema();

        // If validUuid is null but user_id looks like an email or username, resolve to user UUID
        if (!validUuid && user_id && typeof user_id === 'string' && (user_id.includes('@') || isNaN(Number(user_id)))) {
          try {
            const uRes = await p.query(
              'SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) OR LOWER(TRIM(username)) = LOWER(TRIM($1)) LIMIT 1',
              [String(user_id).trim()]
            );
            if (uRes.rows.length > 0) validUuid = uRes.rows[0].id;
          } catch (e) {}
        }

        let res;
        try {
          res = await p.query(
            `INSERT INTO student_test_attempts (user_id, core_skill, test_skill, skill_name, test_title, score, score_percentage, total_questions, correct_answers, metadata)
             VALUES ($1, $2, $3, $2, $3, $4, $4, $5, $6, $7)
             RETURNING *`,
            [validUuid, cleanSkill, cleanTitle, numScore, totalQ, correctA, JSON.stringify(metaObj)]
          );
        } catch (colErr) {
          try {
            res = await p.query(
              `INSERT INTO student_test_attempts (user_id, skill_name, test_title, score, score_percentage, total_questions, correct_answers, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               RETURNING *`,
              [validUuid, cleanSkill, cleanTitle, numScore, numScore, totalQ, correctA, JSON.stringify(metaObj)]
            );
          } catch (colErr2) {
            res = await p.query(
              `INSERT INTO student_test_attempts (user_id, skill_name, test_title, score, total_questions, correct_answers, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING *`,
              [validUuid, cleanSkill, cleanTitle, numScore, totalQ, correctA, JSON.stringify(metaObj)]
            );
          }
        }
        attempt = res.rows[0];

        // Fetch updated progress summary from student_skill_progress
        const progRes = await p.query(
          `SELECT * FROM student_skill_progress
           WHERE (user_id = $1 OR user_id::text = $2) AND LOWER(skill_name) = LOWER($3)
           LIMIT 1`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id), cleanSkill]
        );
        if (progRes.rows && progRes.rows[0]) {
          summary = progRes.rows[0];
        } else {
          // If trigger didn't catch or row wasn't present, calculate and upsert manually
          const currentBase = 35;
          const currentDiag = 0;
          const currentLec = 0;
          const currentMar = 0;
          const gain = Math.max(0, Math.min(5, Math.round((numScore / 100) * 5)));
          const newDiag = Math.min(34, currentDiag + gain);
          const rawTotal = currentBase + currentLec + currentMar + newDiag;
          let newTotal = rawTotal;
          let newStatus = 'UNVERIFIED BASELINE';

          if (rawTotal > 80 && numScore < 100) {
            newTotal = 80;
            newStatus = '80% CAP (Score 100% on Benchmark to Unlock Master Level)';
          } else if (numScore >= 80 || rawTotal >= 80) {
            newTotal = Math.min(100, Math.max(20, rawTotal));
            newStatus = 'LIVE VERIFIED';
          } else {
            newTotal = Math.min(100, Math.max(20, rawTotal));
            newStatus = 'UNVERIFIED BASELINE';
          }
          const isVerified = (numScore >= 80) || (newTotal >= 80);

          const upRes = await p.query(
            `INSERT INTO student_skill_progress (
               user_id, skill_name, category, base_percentage, diagnostic_score, lecture_score, marathon_score, total_score, latest_exam_score, status, verified, last_tested_at, updated_at
             )
             VALUES ($1, $2, 'Core Skill', $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, skill_name) DO UPDATE SET
               diagnostic_score = EXCLUDED.diagnostic_score,
               total_score = EXCLUDED.total_score,
               latest_exam_score = EXCLUDED.latest_exam_score,
               status = EXCLUDED.status,
               verified = EXCLUDED.verified,
               last_tested_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [validUuid, cleanSkill, currentBase, newDiag, currentLec, currentMar, newTotal, numScore, newStatus, isVerified]
          );
          summary = upRes.rows[0];
        }

        // Aggregate user competence and update users & candidates tables
        try {
          if (validUuid) {
            const aggRes = await p.query(
              `SELECT AVG(total_score)::numeric(5,2) as avg_comp,
                      AVG(CASE WHEN latest_exam_score > 0 THEN latest_exam_score END)::numeric(5,2) as avg_exam
               FROM student_skill_progress WHERE user_id = $1`,
              [validUuid]
            );
            if (aggRes.rows && aggRes.rows[0]) {
              const compVal = Number(aggRes.rows[0].avg_comp) || numScore;
              const examVal = Number(aggRes.rows[0].avg_exam) || numScore;
              await p.query(
                'UPDATE users SET dynamic_competence_percent = $1, avg_exam_score = $2 WHERE id = $3',
                [compVal, examVal, validUuid]
              );
              await p.query(
                `UPDATE candidates 
                 SET readiness_score = $1, skill_score = $1, dynamic_competence_percent = $1,
                     status = CASE WHEN $1 >= 80 THEN 'LIVE VERIFIED' ELSE status END,
                     verified_status = CASE WHEN $1 >= 80 THEN 'LIVE VERIFIED' ELSE verified_status END
                 WHERE user_id = $2 OR LOWER(email) = LOWER($3)`,
                [compVal, validUuid, String(user_id)]
              );
            }
          }
        } catch (aggErr) {
          console.warn('[Test Attempt Aggregation Notice]:', aggErr.message);
        }

        return { attempt, summary };
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordTestAttempt notice (falling back to local):', err.message);
      }
    }

    // In-Memory / Local Store Fallback
    const store = getLocalStore();
    if (!store.student_test_attempts) store.student_test_attempts = [];
    if (!store.student_skill_progress) store.student_skill_progress = [];

    attempt = {
      id: `attempt-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      user_id: validUuid || user_id || 'anonymous',
      core_skill: cleanSkill,
      test_skill: cleanTitle,
      skill_name: cleanSkill,
      test_title: cleanTitle,
      score: numScore,
      score_percentage: numScore,
      total_questions: totalQ,
      correct_answers: correctA,
      metadata: metaObj,
      created_at: new Date().toISOString()
    };
    store.student_test_attempts.push(attempt);

    // Update / upsert local skill progress
    let skillProg = store.student_skill_progress.find(s => 
      ((user_id && s.user_id === user_id) || (s.user_id === attempt.user_id)) && 
      s.skill_name.toLowerCase() === cleanSkill.toLowerCase()
    );

    const currentBase = skillProg ? (Number(skillProg.base_percentage) || 35) : 35;
    const currentDiag = skillProg ? (Number(skillProg.diagnostic_score) || 0) : 0;
    const currentLec = skillProg ? (Number(skillProg.lecture_score) || 0) : 0;
    const currentMar = skillProg ? (Number(skillProg.marathon_score) || 0) : 0;
    const gain = Math.max(0, Math.min(5, Math.round((numScore / 100) * 5)));
    const newDiag = Math.min(34, currentDiag + gain);
    const rawTotal = currentBase + currentLec + currentMar + newDiag;

    let newTotal = rawTotal;
    let newStatus = 'UNVERIFIED BASELINE';
    if (rawTotal > 80 && numScore < 100) {
      newTotal = 80;
      newStatus = '80% CAP (Score 100% on Benchmark to Unlock Master Level)';
    } else if (numScore >= 80 || rawTotal >= 80) {
      newTotal = Math.min(100, Math.max(20, rawTotal));
      newStatus = 'LIVE VERIFIED';
    } else {
      newTotal = Math.min(100, Math.max(20, rawTotal));
      newStatus = 'UNVERIFIED BASELINE';
    }
    const isVerified = (numScore >= 80) || (newTotal >= 80);

    if (skillProg) {
      skillProg.diagnostic_score = newDiag;
      skillProg.total_score = newTotal;
      skillProg.latest_exam_score = numScore;
      skillProg.status = newStatus;
      skillProg.verified = isVerified;
      skillProg.last_tested_at = attempt.created_at;
      skillProg.updated_at = new Date().toISOString();
      summary = skillProg;
    } else {
      summary = {
        id: `ssp-${Date.now()}`,
        user_id: user_id || 'anonymous',
        skill_name: cleanSkill,
        category: 'Core Skill',
        base_percentage: currentBase,
        diagnostic_score: newDiag,
        lecture_score: currentLec,
        marathon_score: currentMar,
        total_score: newTotal,
        latest_exam_score: numScore,
        status: newStatus,
        verified: isVerified,
        last_tested_at: attempt.created_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.student_skill_progress.push(summary);
    }

    saveLocalStore(store);
    return { attempt, summary };
  },

  // Get test attempts timeline for analytics
  async getStudentTestAttempts(user_id) {
    const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT COALESCE(core_skill, skill_name) as core_skill,
                  COALESCE(test_skill, test_title) as test_skill,
                  skill_name, test_title, score, created_at
           FROM student_test_attempts
           WHERE user_id = $1 OR user_id::text = $2
           ORDER BY created_at ASC`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id)]
        );
        return res.rows || [];
      } catch (e) {
        console.warn('[Campus2Career DB] getStudentTestAttempts fallback:', e.message);
      }
    }
    const store = getLocalStore();
    return (store.student_test_attempts || [])
      .filter(a => user_id && (a.user_id === user_id || String(a.user_id) === String(user_id)))
      .map(a => ({
        core_skill: a.core_skill || a.skill_name,
        test_skill: a.test_skill || a.test_title,
        skill_name: a.core_skill || a.skill_name,
        test_title: a.test_skill || a.test_title,
        score: a.score,
        created_at: a.created_at
      }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  // Get skill progress overview for analytics
  async getStudentSkillProgress(user_id) {
    const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `SELECT * FROM student_skill_progress
           WHERE user_id = $1 OR user_id::text = $2
           ORDER BY skill_name ASC`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id)]
        );
        return res.rows || [];
      } catch (e) {
        console.warn('[Campus2Career DB] getStudentSkillProgress fallback:', e.message);
      }
    }
    const store = getLocalStore();
    return (store.student_skill_progress || [])
      .filter(s => user_id && (s.user_id === user_id || String(s.user_id) === String(user_id)));
  },

  // Record Student Study Activity & Update Readiness Score in Candidates Table
  async recordStudentActivity({ user_id, stream, topic, activity_type, score, time_spent_minutes, competence_rating, user_email, user_name }) {
    const cleanTopic = (topic || 'Core Engineering Track').trim();
    let normType = (activity_type || 'timer').toLowerCase();
    if (normType === 'study_timer' || normType === 'study') normType = 'timer';
    if (normType === 'lecture_timer' || normType === 'lecture' || normType === 'masterclass') normType = 'revision';
    if (normType === 'exam' || normType === 'mcq') normType = 'quiz';

    const timeSpent = Math.max(0, Number(time_spent_minutes) || 0);
    const scoreVal = (score !== undefined && score !== null && !isNaN(score)) ? Number(score) : null;
    const competenceVal = Math.min(100, Math.max(0, Number(competence_rating) || (scoreVal !== null ? scoreVal : 75)));
    const streamKey = (stream || 'IT').toUpperCase();

    const p = initPool();
    let insertedActivity = null;
    let readinessScore = 35;

    if (p) {
      try {
        await ensureSchema();
        let validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
        if (!validUuid && user_email) {
          try {
            const uRes = await p.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) validUuid = uRes.rows[0].id;
          } catch (e) {}
        }

        const normEmail = (user_email || '').trim().toLowerCase();
        const res = await p.query(
          `INSERT INTO student_activity (user_id, user_email, email, stream, topic, activity_type, score, time_spent_minutes, competence_rating)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [validUuid, normEmail, normEmail, streamKey, cleanTopic, normType, scoreVal, timeSpent, competenceVal]
        );
        insertedActivity = res.rows[0];

        // Recalculate cumulative activity for this user
        const statsRes = await p.query(
          `SELECT 
             COALESCE(SUM(time_spent_minutes), 0) AS total_minutes,
             COALESCE(AVG(CASE WHEN score IS NOT NULL THEN score END), 0) AS avg_score,
             COALESCE(MAX(competence_rating), 0) AS max_competence,
             COUNT(DISTINCT topic) AS completed_topics
           FROM student_activity
           WHERE user_id = $1 OR user_id::text = $2 OR LOWER(TRIM(email)) = LOWER(TRIM($3)) OR LOWER(TRIM(user_email)) = LOWER(TRIM($3))`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id), normEmail]
        );
        const stats = statsRes.rows[0] || {};
        const totalMins = Number(stats.total_minutes) || timeSpent;
        const avgScore = Number(stats.avg_score) || (scoreVal !== null ? scoreVal : 75);
        const maxComp = Number(stats.max_competence) || competenceVal;

        // Dynamic Readiness Formula: 40% Quiz performance + 30% Max competence + 30% Consistency (up to 120m)
        const timeBonus = Math.min(30, (totalMins / 120) * 30);
        readinessScore = Math.min(100, Math.max(50, Math.round((avgScore * 0.40) + (maxComp * 0.30) + timeBonus)));

        // Recalculate and update the user's readiness_score in the candidates table
        try {
          if (validUuid || user_email) {
            const updateRes = await p.query(
              `UPDATE candidates
               SET readiness_score = $1, dynamic_competence_percent = $2, skill_score = $1
               WHERE (user_id = $3 OR LOWER(email) = LOWER($4)) RETURNING id`,
              [readinessScore, maxComp, validUuid, (user_email || '').toLowerCase()]
            );
            if (!updateRes.rows || updateRes.rows.length === 0) {
              const nameToUse = user_name || 'Candidate';
              const emailToUse = user_email || `${validUuid || 'candidate'}@campus2career.org`;
              await p.query(
                `INSERT INTO candidates (user_id, name, email, stream, domain, experience_level, skill_score, dynamic_competence_percent, readiness_score, skills)
                 VALUES ($1, $2, $3, $4, $5, 'Student / Candidate', $6, $7, $6, $8)
                 ON CONFLICT (email) DO UPDATE
                 SET readiness_score = EXCLUDED.readiness_score, dynamic_competence_percent = EXCLUDED.dynamic_competence_percent, skill_score = EXCLUDED.skill_score`,
                [validUuid, nameToUse, emailToUse, streamKey, cleanTopic, readinessScore, maxComp, [streamKey, cleanTopic, 'Diagnostic Benchmark']]
              );
            }
          }
        } catch (candErr) {
          console.warn('[DB Candidate Update Error]:', candErr.message);
        }

        // Also update users table summary metrics
        try {
          await p.query(
            `UPDATE users
             SET total_study_minutes = COALESCE(total_study_minutes, 0) + $1,
                 dynamic_competence_percent = $2
             WHERE (id::text = $3 OR LOWER(email) = LOWER($4))`,
            [timeSpent, maxComp, String(user_id), (user_email || '').toLowerCase()]
          );
        } catch (uErr) {}

        // Update student_skill_progress if matching skill exists
        try {
          if (validUuid) {
            if (normType === 'quiz') {
              const passed = (scoreVal !== null && scoreVal >= 80);
              const statusStr = passed ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE';
              await p.query(
                `UPDATE student_skill_progress
                 SET total_score = GREATEST(total_score, $1),
                     status = CASE WHEN $2 = 'LIVE VERIFIED' THEN 'LIVE VERIFIED' ELSE status END,
                     updated_at = NOW()
                 WHERE user_id = $3 AND (
                   LOWER(skill_name) = LOWER($4) OR
                   LOWER($4) LIKE '%' || LOWER(skill_name) || '%' OR
                   LOWER(skill_name) LIKE '%' || LOWER($4) || '%'
                 )`,
                [scoreVal || 75, statusStr, validUuid, cleanTopic]
              );
            } else if (normType === 'revision' || normType === 'timer') {
              await p.query(
                `UPDATE student_skill_progress
                 SET lectures_completed = lectures_completed + 1,
                     total_score = LEAST(100, total_score + 3),
                     status = CASE WHEN (total_score + 3) >= 80 THEN 'LIVE VERIFIED' ELSE status END,
                     updated_at = NOW()
                 WHERE user_id = $1 AND (
                   LOWER(skill_name) = LOWER($2) OR
                   LOWER($2) LIKE '%' || LOWER(skill_name) || '%' OR
                   LOWER(skill_name) LIKE '%' || LOWER($2) || '%'
                 )`,
                [validUuid, cleanTopic]
              );
            }
          }
        } catch (sspErr) {
          console.warn('[DB student_skill_progress Update Error]:', sspErr.message);
        }

        return {
          activity: insertedActivity,
          readiness_score: readinessScore,
          competence_rating: maxComp,
          total_study_minutes: totalMins
        };
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordStudentActivity notice (falling back to local):', err.message);
        lastDbError = err.message;
      }
    }

    // Local fallback store
    const store = getLocalStore();
    if (!store.student_activity) store.student_activity = [];

    insertedActivity = {
      id: `act-${Date.now()}`,
      user_id: user_id || null,
      user_email: (user_email || '').toLowerCase(),
      stream: streamKey,
      topic: cleanTopic,
      activity_type: normType,
      score: scoreVal,
      time_spent_minutes: timeSpent,
      competence_rating: competenceVal,
      created_at: new Date().toISOString()
    };
    store.student_activity.unshift(insertedActivity);

    // Compute cumulative stats in local store
    const userActs = store.student_activity.filter(a => 
      (user_id && a.user_id === user_id) ||
      (user_email && a.user_email && a.user_email.toLowerCase() === (user_email || '').toLowerCase())
    );
    const totalMins = userActs.reduce((sum, a) => sum + (Number(a.time_spent_minutes) || 0), 0);
    const scoredActs = userActs.filter(a => a.score !== null && a.score !== undefined);
    const avgScore = scoredActs.length > 0 
      ? Math.round(scoredActs.reduce((sum, a) => sum + Number(a.score), 0) / scoredActs.length)
      : (scoreVal !== null ? scoreVal : 75);
    const maxComp = userActs.length > 0 
      ? Math.max(...userActs.map(a => Number(a.competence_rating) || 75))
      : competenceVal;

    const timeBonus = Math.min(30, (totalMins / 120) * 30);
    readinessScore = Math.min(100, Math.max(50, Math.round((avgScore * 0.40) + (maxComp * 0.30) + timeBonus)));

    // Update candidate in local store if present
    if (store.candidates) {
      let cand = store.candidates.find(c => (user_id && c.user_id === user_id) || (user_email && c.email && c.email.toLowerCase() === (user_email || '').toLowerCase()));
      if (cand) {
        cand.readiness_score = readinessScore;
        cand.dynamic_competence_percent = maxComp;
        cand.skill_score = readinessScore;
      } else if (user_id || user_email) {
        cand = {
          id: `cand-${Date.now()}`,
          user_id: user_id || null,
          name: user_name || 'Candidate',
          email: user_email || '',
          stream: streamKey,
          domain: cleanTopic,
          experience_level: 'Student / Candidate',
          skill_score: readinessScore,
          dynamic_competence_percent: maxComp,
          readiness_score: readinessScore,
          skills: [cleanTopic],
          created_at: new Date().toISOString()
        };
        store.candidates.push(cand);
      }
    }

    // Update user in local store
    if (store.users) {
      const u = store.users.find(usr => (user_id && usr.id === user_id) || (user_email && usr.email.toLowerCase() === (user_email || '').toLowerCase()));
      if (u) {
        u.total_study_minutes = (Number(u.total_study_minutes) || 0) + timeSpent;
        u.dynamic_competence_percent = maxComp;
      }
    }

    // Update matching skill in student_skill_progress in local store
    if (store.student_skill_progress) {
      const match = store.student_skill_progress.find(item => 
        ((user_id && item.user_id === user_id) || (user_email && item.user_email === (user_email || '').toLowerCase())) &&
        (cleanTopic.toLowerCase().includes(item.skill_name.toLowerCase()) || item.skill_name.toLowerCase().includes(cleanTopic.toLowerCase()))
      );
      if (match) {
        if (normType === 'quiz' && scoreVal !== null) {
          match.total_score = Math.max(match.total_score, scoreVal);
          if (scoreVal >= 80 || match.total_score >= 80) match.status = 'LIVE VERIFIED';
        } else if (normType === 'revision' || normType === 'timer') {
          match.lectures_completed = (match.lectures_completed || 0) + 1;
          match.total_score = Math.min(100, (match.total_score || 35) + 3);
          if (match.total_score >= 80) match.status = 'LIVE VERIFIED';
        }
        match.updated_at = new Date().toISOString();
      }
    }

    saveLocalStore(store);

    return {
      activity: insertedActivity,
      readiness_score: readinessScore,
      competence_rating: maxComp,
      total_study_minutes: totalMins
    };
  },

  // Retrieve Aggregated Analytics for Radar Chart and Student Dashboard
  async getStudentAnalytics({ user_id, user_email, stream }) {
    const streamKey = resolveStreamKey(stream);
    const p = initPool();
    let activities = [];
    let testAttempts = [];
    let lectureMins = 0;
    let readinessScore = 35;
    let validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;

    if (p) {
      try {
        await ensureSchema();
        if (!validUuid && user_email) {
          const uRes = await p.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
          if (uRes.rows[0]) validUuid = uRes.rows[0].id;
        }

        const res = await p.query(
          `SELECT * FROM student_activity
           WHERE (user_id = $1 OR user_id::text = $2)
           ORDER BY created_at DESC`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id)]
        );
        activities = res.rows || [];

        // Check readiness score from candidates table
        const candRes = await p.query(
          `SELECT readiness_score, skill_score FROM candidates
           WHERE (user_id = $1 OR LOWER(email) = LOWER($2)) LIMIT 1`,
          [validUuid, (user_email || '').toLowerCase()]
        );
        if (candRes.rows && candRes.rows[0]) {
          readinessScore = Number(candRes.rows[0].readiness_score) || Number(candRes.rows[0].skill_score) || 35;
        }

        // Fetch test attempts
        if (validUuid) {
          const attRes = await p.query(
            'SELECT * FROM student_test_attempts WHERE user_id = $1 ORDER BY created_at ASC',
            [validUuid]
          );
          testAttempts = attRes.rows || [];

          const lecRes = await p.query(
            'SELECT SUM(time_watched_seconds) as total_secs FROM user_completed_lectures WHERE user_id = $1',
            [validUuid]
          );
          if (lecRes.rows[0] && lecRes.rows[0].total_secs) {
            lectureMins = Math.round(Number(lecRes.rows[0].total_secs) / 60);
          }
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getStudentAnalytics notice:', err.message);
      }
    }

    if (activities.length === 0) {
      const store = getLocalStore();
      activities = (store.student_activity || []).filter(a => 
        (user_id && a.user_id === user_id) || 
        (user_email && a.user_email && a.user_email.toLowerCase() === (user_email || '').toLowerCase())
      );
      if (store.candidates) {
        const cand = store.candidates.find(c => (user_id && c.user_id === user_id) || (user_email && c.email && c.email.toLowerCase() === (user_email || '').toLowerCase()));
        if (cand) {
          readinessScore = Number(cand.readiness_score) || Number(cand.skill_score) || 35;
        }
      }
      if (testAttempts.length === 0) {
        testAttempts = (store.student_test_attempts || []).filter(a => (user_id && a.user_id === user_id));
      }
      const lecs = (store.user_completed_lectures || []).filter(l => (user_id && l.user_id === user_id) || (user_email && l.user_email === (user_email || '').toLowerCase()));
      lectureMins = Math.round(lecs.reduce((acc, l) => acc + (Number(l.time_watched_seconds) || 0), 0) / 60);
    }

    const activityMinutes = activities.reduce((sum, a) => sum + (Number(a.time_spent_minutes) || 0), 0);
    const totalMinutes = activityMinutes + lectureMins;
    const studyHours = Math.round((totalMinutes / 60) * 10) / 10;
    const completedTopicsList = [...new Set(activities.map(a => a.topic).filter(Boolean))];

    const benchmarksTaken = testAttempts.length;
    const avgScore = benchmarksTaken > 0
      ? Math.round(testAttempts.reduce((sum, t) => sum + (Number(t.score) || 0), 0) / benchmarksTaken)
      : 0;

    // Active learning streak calculation from distinct dates
    const activeDates = new Set();
    activities.forEach(a => { if (a.created_at) activeDates.add(new Date(a.created_at).toISOString().split('T')[0]); });
    testAttempts.forEach(t => { if (t.created_at) activeDates.add(new Date(t.created_at).toISOString().split('T')[0]); });
    const streakDays = activeDates.size;

    let growthPercent = 0;
    if (benchmarksTaken >= 2) {
      const firstScore = Number(testAttempts[0].score) || 0;
      const lastScore = Number(testAttempts[testAttempts.length - 1].score) || 0;
      growthPercent = Math.round(lastScore - firstScore);
    }

    // Standard stream disciplines map
    const defaultStreamDisciplines = {
      it: [
        { name: 'Data Structures & Algorithms', keywords: ['algorithm', 'dsa', 'data structure', 'sorting', 'binary'] },
        { name: 'Web Dev & Full-Stack', keywords: ['web', 'full-stack', 'react', 'api', 'backend', 'node'] },
        { name: 'Database Systems & SQL', keywords: ['database', 'dbms', 'sql', 'postgres', 'index'] },
        { name: 'Operating Systems & Concurrency', keywords: ['os', 'concurrency', 'process', 'thread', 'memory'] },
        { name: 'Computer Networks & APIs', keywords: ['network', 'tcp', 'http', 'socket', 'ip'] }
      ],
      cse: [
        { name: 'Distributed Systems & Raft', keywords: ['distributed', 'raft', 'consensus', 'microservices'] },
        { name: 'Low-Level OS & Kernel', keywords: ['os', 'kernel', 'memory', 'thread', 'virtual'] },
        { name: 'High-Throughput Databases', keywords: ['database', 'indexing', 'b-tree', 'wal', 'storage'] },
        { name: 'Docker & Kubernetes', keywords: ['docker', 'kubernetes', 'k8s', 'container'] },
        { name: 'APM & Reliability', keywords: ['debugging', 'telemetry', 'tracing', 'profiler'] }
      ],
      ece: [
        { name: 'Embedded C & RTOS', keywords: ['embedded', 'c', 'rtos', 'freertos', 'arm'] },
        { name: 'Microcontrollers & STM32', keywords: ['microcontroller', 'stm32', 'firmware', 'registers'] },
        { name: 'Hardware Protocols (SPI/I2C/CAN)', keywords: ['protocol', 'spi', 'i2c', 'can', 'uart'] },
        { name: 'VLSI & Circuit Diagnostics', keywords: ['vlsi', 'circuit', 'verilog', 'fpga'] },
        { name: 'Signal Processing & Control', keywords: ['signal', 'dsp', 'filter', 'matlab'] }
      ],
      mechanical: [
        { name: 'SolidWorks & Parametric CAD', keywords: ['cad', 'solidworks', 'part', 'modeling', 'gd&t'] },
        { name: 'FEA Stress Analysis (ANSYS)', keywords: ['fea', 'ansys', 'stress', 'simulation', 'structural'] },
        { name: 'CFD Fluid & Thermal Flow', keywords: ['cfd', 'fluid', 'thermal', 'flow', 'navier'] },
        { name: 'CNC Machining & DFM', keywords: ['cnc', 'machining', 'dfm', 'manufacturing', 'g-code'] },
        { name: 'Failure Analysis & Reliability', keywords: ['failure', 'fractography', 'vibration', 'reliability'] }
      ],
      aids: [
        { name: 'Generative AI & Vector DBs', keywords: ['genai', 'vector', 'rag', 'embeddings'] },
        { name: 'Python Concurrency & AsyncIO', keywords: ['python', 'asyncio', 'multiprocessing'] },
        { name: 'LLM Fine-Tuning & Quantization', keywords: ['llm', 'fine-tuning', 'quantization', 'lora'] },
        { name: 'Production Model Serving', keywords: ['serving', 'fastapi', 'vllm', 'mlops'] },
        { name: 'GPU Memory & Latency Profiling', keywords: ['gpu', 'cuda', 'profiling', 'pytorch'] }
      ]
    };

    // Check if user has explicit records in student_skill_progress
    let userProgressSkills = [];
    if (p) {
      try {
        if (validUuid) {
          const sspRes = await p.query(
            'SELECT * FROM student_skill_progress WHERE user_id = $1 ORDER BY skill_name ASC',
            [validUuid]
          );
          userProgressSkills = sspRes.rows || [];
        }
      } catch (e) {}
    }
    if (userProgressSkills.length === 0) {
      const store = getLocalStore();
      userProgressSkills = (store.student_skill_progress || []).filter(item => 
        (user_id && item.user_id === user_id) || (user_email && item.user_email === (user_email || '').toLowerCase())
      );
    }

    let skillCompetencies = [];
    if (userProgressSkills.length >= 3) {
      skillCompetencies = userProgressSkills.map(s => ({
        name: s.skill_name,
        score: Number(s.total_score) || Number(s.base_percentage) || 35,
        verified: s.status === 'LIVE VERIFIED' || Number(s.total_score) >= 80,
        category: s.category || 'Core Skill',
        current_milestone: s.current_milestone,
        next_milestone: s.next_milestone
      }));
      readinessScore = Math.round(skillCompetencies.reduce((sum, s) => sum + s.score, 0) / skillCompetencies.length);
    } else if (activities.length === 0) {
      readinessScore = 35;
    } else {
      const disciplines = defaultStreamDisciplines[streamKey] || defaultStreamDisciplines.it;
      skillCompetencies = disciplines.map(disc => {
        const matching = activities.filter(a => {
          const top = (a.topic || '').toLowerCase();
          return disc.keywords.some(kw => top.includes(kw)) || top.includes(disc.name.toLowerCase());
        });

        if (matching.length > 0) {
          const avgScore = matching.reduce((sum, m) => sum + (Number(m.score) || Number(m.competence_rating) || 75), 0) / matching.length;
          return {
            name: disc.name,
            score: Math.min(100, Math.max(30, Math.round(avgScore))),
            verified: true
          };
        }

        if (activities.length > 0) {
          return {
            name: disc.name,
            score: Math.min(85, Math.max(25, Math.round(readinessScore * 0.8))),
            verified: false
          };
        }

        return {
          name: disc.name,
          score: 20,
          verified: false
        };
      });
    }

    return {
      study_hours: studyHours,
      total_study_minutes: totalMinutes,
      streak_days: streakDays,
      benchmarks_taken: benchmarksTaken,
      tests_count: benchmarksTaken,
      avg_exam_score: avgScore,
      growth_percent: growthPercent,
      completed_topics: completedTopicsList.length,
      topics: completedTopicsList,
      readiness_score: readinessScore,
      skill_competencies: skillCompetencies,
      activities: activities.slice(0, 20),
      attempts: testAttempts
    };
  },

  // Sync / Upsert Student Skill Progress
  async syncStudentSkills({ user_id, user_email, stream, skills }) {
    if (!skills) return [];
    const skillList = Array.isArray(skills) ? skills : [skills];
    const p = initPool();
    const synced = [];

    let resolvedUserId = user_id;
    let resolvedStream = stream;
    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id, stream FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) {
              resolvedUserId = uRes.rows[0].id;
              if (!resolvedStream && uRes.rows[0].stream) resolvedStream = uRes.rows[0].stream;
            }
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;

        // Non-destructive synchronization: Fetch existing rows to preserve test/diagnostic scores
        const existingProgressMap = {};
        if (validUuid) {
          try {
            const exRes = await p.query('SELECT * FROM student_skill_progress WHERE user_id = $1', [validUuid]);
            (exRes.rows || []).forEach(r => {
              if (r.skill_name) existingProgressMap[r.skill_name.toLowerCase().trim()] = r;
            });
          } catch (_) {}
        }

        const skillNames = skillList.map(s => (s.skill_name || s.name || '').trim()).filter(Boolean);
        const avgScore = Math.round(
          skillList.reduce((acc, s) => acc + (Number(s.total_score !== undefined ? s.total_score : (s.score !== undefined ? s.score : s.base_percentage)) || 35), 0) / (skillList.length || 1)
        );

        for (const s of skillList) {
          const skillName = (s.skill_name || s.name || '').trim();
          if (!skillName) continue;
          const sLower = skillName.toLowerCase();
          const existing = existingProgressMap[sLower];

          const skillId = (s.skill_id || s.id || (existing && existing.skill_id) || skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
          const category = (s.category || (existing && existing.category) || 'Core Skill').trim();
          const basePct = Math.min(100, Math.max(0, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : (existing && existing.base_percentage) || s.score), 10) || 35));
          
          const diagnosticScore = Math.max(0, Number(s.diagnostic_score !== undefined ? s.diagnostic_score : ((existing && existing.diagnostic_score) || 0)));
          const lectureScore = Math.max(0, Number(s.lecture_score !== undefined ? s.lecture_score : ((existing && existing.lecture_score) || 0)));
          const marathonScore = Math.max(0, Number(s.marathon_score !== undefined ? s.marathon_score : ((existing && existing.marathon_score) || 0)));
          const latestExamScore = Math.max(0, Number(s.latest_exam_score !== undefined ? s.latest_exam_score : ((existing && existing.latest_exam_score) || 0)));

          let totalScore = Number(s.total_score !== undefined ? s.total_score : (s.score !== undefined ? s.score : (existing && existing.total_score) || basePct));
          totalScore = Math.max(totalScore, basePct + diagnosticScore + lectureScore + marathonScore);
          totalScore = Math.min(100, Math.max(20, totalScore));

          const isVerified = Boolean(s.verified || (existing && existing.verified) || totalScore >= 80 || latestExamScore >= 80);
          const status = (s.status || (isVerified ? 'LIVE VERIFIED' : ((existing && existing.status) || 'UNVERIFIED BASELINE'))).trim();
          const currentMilestone = (s.current_milestone || s.currentMilestone || (existing && existing.current_milestone) || 'Fundamental syntax & baseline concepts').trim();
          const nextMilestone = (s.next_milestone || s.nextMilestone || (existing && existing.next_milestone) || 'Production architecture & high-throughput concurrency').trim();
          const lecturesCompleted = Math.max(Number(s.lectures_completed || 0), Number((existing && existing.lectures_completed) || 0));

          if (validUuid) {
            const res = await p.query(
              `INSERT INTO student_skill_progress (
                 user_id, skill_id, skill_name, category, base_percentage, total_score, diagnostic_score, lecture_score, marathon_score, latest_exam_score, status, verified, lectures_completed, current_milestone, next_milestone, updated_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
               ON CONFLICT (user_id, skill_name) DO UPDATE SET
                 skill_id = EXCLUDED.skill_id,
                 category = EXCLUDED.category,
                 base_percentage = EXCLUDED.base_percentage,
                 total_score = GREATEST(student_skill_progress.total_score, EXCLUDED.total_score),
                 diagnostic_score = GREATEST(student_skill_progress.diagnostic_score, EXCLUDED.diagnostic_score),
                 lecture_score = GREATEST(student_skill_progress.lecture_score, EXCLUDED.lecture_score),
                 marathon_score = GREATEST(student_skill_progress.marathon_score, EXCLUDED.marathon_score),
                 latest_exam_score = GREATEST(COALESCE(student_skill_progress.latest_exam_score, 0), EXCLUDED.latest_exam_score),
                 status = CASE WHEN EXCLUDED.verified OR student_skill_progress.verified OR GREATEST(student_skill_progress.total_score, EXCLUDED.total_score) >= 80 THEN 'LIVE VERIFIED' ELSE EXCLUDED.status END,
                 verified = student_skill_progress.verified OR EXCLUDED.verified OR (GREATEST(student_skill_progress.total_score, EXCLUDED.total_score) >= 80),
                 lectures_completed = GREATEST(student_skill_progress.lectures_completed, EXCLUDED.lectures_completed),
                 current_milestone = EXCLUDED.current_milestone,
                 next_milestone = EXCLUDED.next_milestone,
                 updated_at = NOW()
               RETURNING *;`,
              [validUuid, skillId, skillName, category, basePct, totalScore, diagnosticScore, lectureScore, marathonScore, latestExamScore, status, isVerified, lecturesCompleted, currentMilestone, nextMilestone]
            );
            if (res.rows[0]) synced.push(res.rows[0]);
          }
        }

        // Keep users and candidates tables completely synchronized with evaluated readiness
        if (validUuid) {
          const cleanStreamKey = resolveStreamKey(resolvedStream || 'it');
          await p.query(
            'UPDATE users SET stream = $1, branch = $2, skills = $3, dynamic_competence_percent = $4 WHERE id = $5',
            [cleanStreamKey.toUpperCase(), cleanStreamKey, skillNames, avgScore, validUuid]
          );

          // Get user details for candidates upsert
          let uEmail = (user_email || '').trim().toLowerCase();
          let uName = 'Student';
          try {
            const uInfo = await p.query('SELECT name, email FROM users WHERE id = $1 LIMIT 1', [validUuid]);
            if (uInfo.rows[0]) {
              uName = uInfo.rows[0].name || uName;
              uEmail = (uInfo.rows[0].email || uEmail).toLowerCase();
            }
          } catch (e) {}

          if (uEmail) {
            const domainName = (skillNames[0] || 'Core Engineering');
            await p.query(
              `INSERT INTO candidates (
                 user_id, name, email, stream, domain, experience_level, skill_score, 
                 dynamic_competence_percent, readiness_score, skills, status, verified_status
               )
               VALUES ($1, $2, $3, $4, $5, 'Student / Candidate', $6, $6, $6, $7, $8, $8)
               ON CONFLICT (email) DO UPDATE SET
                 user_id = COALESCE(candidates.user_id, EXCLUDED.user_id),
                 stream = EXCLUDED.stream,
                 skills = EXCLUDED.skills,
                 skill_score = EXCLUDED.skill_score,
                 dynamic_competence_percent = EXCLUDED.dynamic_competence_percent,
                 readiness_score = EXCLUDED.readiness_score,
                 status = EXCLUDED.status,
                 verified_status = EXCLUDED.verified_status;`,
              [
                validUuid,
                uName,
                uEmail,
                cleanStreamKey.toUpperCase(),
                domainName,
                avgScore,
                skillNames,
                avgScore >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE'
              ]
            );
          }

          // Mirror into Supabase Client if configured
          const sbClient = getSupabaseClient();
          if (sbClient) {
            try {
              const supaRows = skillList.map(s => {
                const sName = (s.skill_name || s.name || '').trim();
                const sId = (s.skill_id || s.id || sName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
                const bPct = Math.min(100, Math.max(0, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : s.score), 10) || 35));
                const tScore = Math.min(100, Math.max(0, parseInt(s.total_score !== undefined ? s.total_score : s.score, 10) || bPct));
                return {
                  user_id: validUuid,
                  skill_id: sId,
                  skill_name: sName,
                  category: (s.category || 'Core Skill').trim(),
                  base_percentage: bPct,
                  total_score: tScore,
                  status: (s.status || (tScore >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE')).trim(),
                  lectures_completed: Math.max(0, parseInt(s.lectures_completed || 0, 10)),
                  current_milestone: (s.current_milestone || s.currentMilestone || 'Fundamental syntax & baseline concepts').trim(),
                  next_milestone: (s.next_milestone || s.nextMilestone || 'Production architecture & high-throughput concurrency').trim()
                };
              });
              await sbClient.from('student_skill_progress').insert(supaRows);
              await sbClient.from('users').update({
                stream: cleanStreamKey.toUpperCase(),
                branch: cleanStreamKey,
                skills: skillNames,
                dynamic_competence_percent: avgScore
              }).eq('id', validUuid);
              if (uEmail) {
                await sbClient.from('candidates').upsert({
                  user_id: validUuid,
                  name: uName,
                  email: uEmail,
                  stream: cleanStreamKey.toUpperCase(),
                  domain: skillNames[0] || 'Core Engineering',
                  experience_level: 'Student / Candidate',
                  skill_score: avgScore,
                  dynamic_competence_percent: avgScore,
                  readiness_score: avgScore,
                  skills: skillNames,
                  status: avgScore >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE',
                  verified_status: avgScore >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE'
                }, { onConflict: 'email' });
              }
            } catch (sbSyncErr) {
              console.warn('[Supabase Skill Sync Warning]:', sbSyncErr.message);
            }
          }
        }

        if (synced.length > 0) return synced;
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud syncStudentSkills notice (falling back to local):', err.message);
      }
    }

    // Local fallback store
    const store = getLocalStore();
    if (!store.student_skill_progress) store.student_skill_progress = [];

    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? `usr-${normEmail}` : 'usr-default');

    for (const s of skillList) {
      const skillName = (s.skill_name || s.name || '').trim();
      if (!skillName) continue;
      const sLower = skillName.toLowerCase();
      const existing = store.student_skill_progress.find(item => 
        (item.user_id === effectiveUserId || (item.user_email && item.user_email.toLowerCase() === normEmail)) &&
        item.skill_name.toLowerCase() === sLower
      );

      const skillId = (s.skill_id || s.id || (existing && existing.skill_id) || skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
      const category = (s.category || (existing && existing.category) || 'Core Skill').trim();
      const basePct = Math.min(100, Math.max(0, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : (existing && existing.base_percentage) || s.score), 10) || 35));
      const diagnosticScore = Math.max(0, Number(s.diagnostic_score !== undefined ? s.diagnostic_score : ((existing && existing.diagnostic_score) || 0)));
      const lectureScore = Math.max(0, Number(s.lecture_score !== undefined ? s.lecture_score : ((existing && existing.lecture_score) || 0)));
      const marathonScore = Math.max(0, Number(s.marathon_score !== undefined ? s.marathon_score : ((existing && existing.marathon_score) || 0)));
      const latestExamScore = Math.max(0, Number(s.latest_exam_score !== undefined ? s.latest_exam_score : ((existing && existing.latest_exam_score) || 0)));

      let totalScore = Number(s.total_score !== undefined ? s.total_score : (s.score !== undefined ? s.score : (existing && existing.total_score) || basePct));
      totalScore = Math.max(totalScore, basePct + diagnosticScore + lectureScore + marathonScore);
      totalScore = Math.min(100, Math.max(20, totalScore));

      const isVerified = Boolean(s.verified || (existing && existing.verified) || totalScore >= 80 || latestExamScore >= 80);
      const status = (s.status || (isVerified ? 'LIVE VERIFIED' : ((existing && existing.status) || 'UNVERIFIED BASELINE'))).trim();
      const currentMilestone = (s.current_milestone || s.currentMilestone || (existing && existing.current_milestone) || 'Fundamental syntax & baseline concepts').trim();
      const nextMilestone = (s.next_milestone || s.nextMilestone || (existing && existing.next_milestone) || 'Production architecture & high-throughput concurrency').trim();
      const lecturesCompleted = Math.max(Number(s.lectures_completed || 0), Number((existing && existing.lectures_completed) || 0));

      if (existing) {
        existing.base_percentage = basePct;
        existing.total_score = Math.max(existing.total_score || 0, totalScore);
        existing.diagnostic_score = Math.max(existing.diagnostic_score || 0, diagnosticScore);
        existing.lecture_score = Math.max(existing.lecture_score || 0, lectureScore);
        existing.marathon_score = Math.max(existing.marathon_score || 0, marathonScore);
        existing.latest_exam_score = Math.max(existing.latest_exam_score || 0, latestExamScore);
        existing.status = isVerified ? 'LIVE VERIFIED' : existing.status;
        existing.verified = isVerified;
        existing.lectures_completed = lecturesCompleted;
        synced.push(existing);
      } else {
        const newItem = {
          id: `ssp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          user_id: effectiveUserId,
          user_email: normEmail,
          skill_id: skillId,
          skill_name: skillName,
          category,
          base_percentage: basePct,
          total_score: totalScore,
          diagnostic_score: diagnosticScore,
          lecture_score: lectureScore,
          marathon_score: marathonScore,
          latest_exam_score: latestExamScore,
          status,
          verified: isVerified,
          lectures_completed: lecturesCompleted,
          current_milestone: currentMilestone,
          next_milestone: nextMilestone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.student_skill_progress.push(newItem);
        synced.push(newItem);
      }
    }

    if (resolvedStream && normEmail) {
      const cleanStreamKey = resolveStreamKey(resolvedStream);
      const u = (store.users || []).find(usr => usr.email.toLowerCase() === normEmail);
      if (u) {
        u.stream = cleanStreamKey.toUpperCase();
        u.branch = cleanStreamKey;
        u.skills = skillList.map(s => s.skill_name || s.name);
      }
    }

    saveLocalStore(store);
    return synced;
  },

  // Auto-Seed Default Stream Skills and Candidate Record (No manual CSV imports needed)
  async autoSeedStudentSkills({ user_id, user_email, user_name, stream, base_percentage = 35 }) {
    let resolvedUserId = user_id;
    let resolvedStream = stream;
    let resolvedName = user_name;

    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id, name, stream FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) {
              resolvedUserId = uRes.rows[0].id;
              if (!resolvedName) resolvedName = uRes.rows[0].name;
              if (!resolvedStream) resolvedStream = uRes.rows[0].stream;
            }
          }
        } else if (!resolvedStream && resolvedUserId) {
          const uRes = await p.query('SELECT name, stream FROM users WHERE id = $1 LIMIT 1', [resolvedUserId]);
          if (uRes.rows[0]) {
            if (!resolvedName) resolvedName = uRes.rows[0].name;
            if (!resolvedStream) resolvedStream = uRes.rows[0].stream;
          }
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud autoSeed user lookup notice:', err.message);
      }
    } else {
      const store = getLocalStore();
      const u = (store.users || []).find(x => (resolvedUserId && x.id === resolvedUserId) || (user_email && x.email.toLowerCase() === (user_email || '').toLowerCase()));
      if (u) {
        if (!resolvedUserId) resolvedUserId = u.id;
        if (!resolvedName) resolvedName = u.name;
        if (!resolvedStream) resolvedStream = u.stream;
      }
    }

    const streamKey = resolveStreamKey(resolvedStream);
    const defaultSkills = DEFAULT_SKILLS_BY_STREAM[streamKey] || DEFAULT_SKILLS_BY_STREAM.it;

    if (p) {
      try {
        await ensureSchema();
        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          // Wipe previous skills for this user to avoid stream mixing
          await p.query('DELETE FROM student_skill_progress WHERE user_id = $1', [validUuid]);
          const sb = getSupabaseClient();
          if (sb) {
            try { await sb.from('student_skill_progress').delete().eq('user_id', validUuid); } catch (_) {}
          }

          if (defaultSkills.length > 0) {
            const placeholders = [];
            const values = [];
            let paramIdx = 1;
            for (const s of defaultSkills) {
              placeholders.push(`(${paramIdx++}, ${paramIdx++}, ${paramIdx++}, ${paramIdx++}, ${paramIdx++}, 0, 0, 0, ${paramIdx++}, 0, 'UNVERIFIED BASELINE', false, ${paramIdx++}, ${paramIdx++})`);
              values.push(validUuid, s.id, s.name, s.category, base_percentage, base_percentage, s.current_milestone, s.next_milestone);
            }
            await p.query(
              `INSERT INTO student_skill_progress (
                user_id, skill_id, skill_name, category, base_percentage, diagnostic_score, lecture_score, marathon_score, total_score, latest_exam_score, status, verified, current_milestone, next_milestone
              ) VALUES ${placeholders.join(', ')}
              ON CONFLICT (user_id, skill_name) DO NOTHING`,
              values
            );
          }

          // Also guarantee candidate profile exists in candidates table
          const nameToUse = resolvedName || 'Candidate';
          const emailToUse = user_email || `${validUuid}@campus2career.org`;
          const skillNames = defaultSkills.map(s => s.name);
          await p.query(
            `INSERT INTO candidates (user_id, name, email, stream, domain, experience_level, skill_score, dynamic_competence_percent, readiness_score, skills)
             VALUES ($1, $2, $3, $4, 'Core Engineering & Architecture', 'Fresher (0-1 yr)', $5, $5, $5, $6)
             ON CONFLICT (email) DO UPDATE SET user_id = COALESCE(candidates.user_id, EXCLUDED.user_id), stream = EXCLUDED.stream`,
            [validUuid, nameToUse, emailToUse, streamKey.toUpperCase(), base_percentage, skillNames]
          );

          const seeded = await p.query(
            `SELECT * FROM student_skill_progress WHERE user_id = $1 ORDER BY created_at ASC, skill_name ASC`,
            [validUuid]
          );
          if (seeded.rows && seeded.rows.length > 0) {
            return seeded.rows;
          }
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud autoSeed notice (falling back to local):', err.message);
      }
    }

    // Local fallback store
    const store = getLocalStore();
    if (!store.student_skill_progress) store.student_skill_progress = [];
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? `usr-${normEmail}` : 'usr-default');

    // Wipe previous skills for this user in local store
    store.student_skill_progress = store.student_skill_progress.filter(item => 
      item.user_id !== effectiveUserId && (item.user_email ? item.user_email.toLowerCase() !== normEmail : true)
    );

    const seededLocal = [];
    for (const s of defaultSkills) {
      const newItem = {
        id: `ssp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        user_id: effectiveUserId,
        user_email: normEmail,
        skill_id: s.id,
        skill_name: s.name,
        category: s.category || 'Core Skill',
        base_percentage: base_percentage,
        diagnostic_score: 0,
        lecture_score: 0,
        marathon_score: 0,
        total_score: base_percentage,
        latest_exam_score: 0,
        status: 'UNVERIFIED BASELINE',
        verified: false,
        lectures_completed: 0,
        current_milestone: s.current_milestone,
        next_milestone: s.next_milestone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.student_skill_progress.push(newItem);
      seededLocal.push(newItem);
    }

    if (store.candidates) {
      let cand = store.candidates.find(c => (c.user_id && c.user_id === effectiveUserId) || (normEmail && c.email && c.email.toLowerCase() === normEmail));
      if (!cand) {
        cand = {
          id: `cand-${Date.now()}`,
          user_id: effectiveUserId,
          name: resolvedName || 'Candidate',
          email: normEmail,
          stream: streamKey.toUpperCase(),
          domain: 'Core Engineering & Architecture',
          experience_level: 'Fresher (0-1 yr)',
          skill_score: base_percentage,
          dynamic_competence_percent: base_percentage,
          readiness_score: base_percentage,
          skills: defaultSkills.map(s => s.name),
          created_at: new Date().toISOString()
        };
        store.candidates.push(cand);
      } else {
        cand.stream = streamKey.toUpperCase();
        cand.skills = defaultSkills.map(s => s.name);
      }
    }

    saveLocalStore(store);
    return seededLocal;
  },

  // Get Persisted Student Skill Progress (Auto-initializes if empty)
  async getStudentSkills(idOrParams) {
    let user_id = null;
    let user_email = null;
    let stream = null;
    if (typeof idOrParams === 'object' && idOrParams !== null) {
      user_id = idOrParams.user_id || idOrParams.id;
      user_email = idOrParams.user_email || idOrParams.email;
      stream = idOrParams.stream;
    } else if (typeof idOrParams === 'string') {
      if (idOrParams.includes('@')) {
        user_email = idOrParams;
      } else {
        user_id = idOrParams;
      }
    }
    const p = initPool();
    let resolvedUserId = user_id;
    let resolvedStream = stream;

    if (p) {
      try {
        await ensureSchema();
        if (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (!resolvedStream) {
            const uRes = await p.query('SELECT stream FROM users WHERE id = $1 LIMIT 1', [resolvedUserId]);
            if (uRes.rows[0] && uRes.rows[0].stream) resolvedStream = uRes.rows[0].stream;
          }
        } else if (user_email) {
          const uRes = await p.query('SELECT id, stream FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
          if (uRes.rows[0]) {
            resolvedUserId = uRes.rows[0].id;
            if (!resolvedStream && uRes.rows[0].stream) resolvedStream = uRes.rows[0].stream;
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          const res = await p.query(
            `SELECT * FROM student_skill_progress
             WHERE user_id = $1
             ORDER BY skill_name ASC`,
            [validUuid]
          );
          // Stream Sanitization: If user is non-IT, check if existing rows are stale auto-seeded IT skills
          if (resolvedStream) {
            const streamKey = resolveStreamKey(resolvedStream);
            const itSkillNames = new Set(['Java & Multithreading', 'Spring Boot & Microservices', 'PostgreSQL & SQL Tuning', 'Docker & Containers', 'Production Debugging']);
            if (streamKey !== 'it' && res.rows && res.rows.length > 0 && res.rows.every(r => itSkillNames.has(r.skill_name))) {
              console.log(`[STREAM ISOLATION] User ${validUuid} is registered as ${streamKey} but has stale default IT skills. Auto-re-seeding ${streamKey}...`);
              return await this.autoSeedStudentSkills({
                user_id: validUuid,
                user_email,
                stream: resolvedStream
              });
            }
          }

          if (res.rows && res.rows.length > 0) {
            return res.rows;
          }

          // Auto-seed strictly using the user's registered stream if known
          if (resolvedStream) {
            return await this.autoSeedStudentSkills({
              user_id: validUuid,
              user_email,
              stream: resolvedStream
            });
          }
          return [];
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getStudentSkills notice:', err.message);
      }
    }

    // Local fallback store
    const store = getLocalStore();
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUser = (store.users || []).find(u => (resolvedUserId && u.id === resolvedUserId) || (normEmail && u.email.toLowerCase() === normEmail));
    const effectiveUserId = (effectiveUser && effectiveUser.id) || resolvedUserId || user_id || (normEmail ? `usr-${normEmail}` : null);
    if (effectiveUser && effectiveUser.stream && !resolvedStream) {
      resolvedStream = effectiveUser.stream;
    }

    let skills = (store.student_skill_progress || []).filter(item => 
      (effectiveUserId && item.user_id === effectiveUserId) ||
      (normEmail && item.user_email && item.user_email === normEmail)
    );

    if (resolvedStream) {
      const streamKey = resolveStreamKey(resolvedStream);
      const itSkillNames = new Set(['Java & Multithreading', 'Spring Boot & Microservices', 'PostgreSQL & SQL Tuning', 'Docker & Containers', 'Production Debugging']);
      if (streamKey !== 'it' && skills.length > 0 && skills.every(r => itSkillNames.has(r.skill_name))) {
        return await this.autoSeedStudentSkills({
          user_id: effectiveUserId,
          user_email: normEmail,
          stream: resolvedStream
        });
      }
    }

    if (skills.length === 0 && (effectiveUserId || normEmail)) {
      if (resolvedStream) {
        skills = await this.autoSeedStudentSkills({
          user_id: effectiveUserId,
          user_email: normEmail,
          stream: resolvedStream
        });
      } else {
        skills = [];
      }
    }

    return skills;
  },

  // Lecture Progress Verification & Watch-Time Fraud Prevention
  async recordLectureProgress({ user_id, user_email, skill_name, lecture_id, duration_seconds, time_watched_seconds }) {
    const p = initPool();
    const duration = Math.max(1, parseInt(duration_seconds, 10) || 600);
    const watched = Math.max(0, parseInt(time_watched_seconds, 10) || 0);
    const cleanSkill = (skill_name || 'Core Skill').trim();
    const cleanLecture = String(lecture_id || 'lecture-1').trim();
    const isCompleted = watched >= Math.min(30, Math.floor(duration * 0.85));

    let resolvedUserId = user_id;

    if (!isCompleted) {
      return {
        success: true,
        completed: false,
        percent_watched: Math.min(100, Math.round((watched / duration) * 100)),
        message: 'Lecture progress recorded. Must accumulate active watch time >= 85% of duration to earn credit.'
      };
    }

    // Legitimately completed (watched >= 30s or >= 85%)
    if (p) {
      try {
        if (!resolvedUserId && user_email) {
          const uRes = await p.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [user_email.trim().toLowerCase()]);
          if (uRes.rows[0]) resolvedUserId = uRes.rows[0].id;
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          // Idempotent record insertion
          await p.query(
            `INSERT INTO user_completed_lectures (user_id, user_email, skill_name, lecture_id, duration_seconds, time_watched_seconds, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT (user_id, skill_name, lecture_id)
             DO UPDATE SET time_watched_seconds = GREATEST(user_completed_lectures.time_watched_seconds, EXCLUDED.time_watched_seconds)`,
            [validUuid, (user_email || '').toLowerCase(), cleanSkill, cleanLecture, duration, watched]
          );

          // Unique completed lectures count, capped at 15
          const countRes = await p.query(
            `SELECT LEAST(COUNT(DISTINCT lecture_id), 15)::int as count
             FROM user_completed_lectures
             WHERE user_id = $1 AND (
               LOWER(skill_name) = LOWER($2) OR
               LOWER($2) LIKE '%' || LOWER(skill_name) || '%' OR
               LOWER(skill_name) LIKE '%' || LOWER($2) || '%'
             )`,
            [validUuid, cleanSkill]
          );
          const uniqueCompleted = (countRes.rows[0] && countRes.rows[0].count) || 1;

          // Update student_skill_progress (Formula: Base max 48 + Lectures max 15 + Marathon max 3 + Tests max 34)
          await p.query(
            `UPDATE student_skill_progress
             SET lectures_completed = $1,
                 lecture_score = $1,
                 total_score = LEAST(100, base_percentage + $1 + marathon_score + CASE WHEN status = 'LIVE VERIFIED' THEN 34 ELSE COALESCE(diagnostic_score, 0) END),
                 updated_at = NOW()
             WHERE user_id = $2 AND (
               LOWER(skill_name) = LOWER($3) OR
               LOWER($3) LIKE '%' || LOWER(skill_name) || '%' OR
               LOWER(skill_name) LIKE '%' || LOWER($3) || '%'
             )`,
            [uniqueCompleted, validUuid, cleanSkill]
          );

          // Synchronize overall user & candidate competence dynamically
          try {
            const avgRes = await p.query(
              'SELECT ROUND(AVG(total_score), 1) as avg_score FROM student_skill_progress WHERE user_id = $1',
              [validUuid]
            );
            if (avgRes.rows[0] && avgRes.rows[0].avg_score !== null) {
              const newAvg = parseFloat(avgRes.rows[0].avg_score);
              await p.query(
                'UPDATE users SET dynamic_competence_percent = $1 WHERE id = $2',
                [newAvg, validUuid]
              );
              await p.query(
                'UPDATE candidates SET readiness_score = $1, dynamic_competence_percent = $1, skill_score = $2 WHERE user_id = $3',
                [newAvg, Math.round(newAvg), validUuid]
              );
            }
          } catch (syncErr) {
            console.warn('[DB Lecture Sync Warning]:', syncErr.message);
          }

          return {
            success: true,
            completed: true,
            lectures_completed: uniqueCompleted,
            lecture_score: uniqueCompleted,
            message: 'Lecture legitimately completed and verified (+1 unique lecture towards 15% weight).'
          };
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud recordLectureProgress notice:', err.message);
      }
    }

    // Local JSON Store Fallback
    const store = getLocalStore();
    if (!store.user_completed_lectures) store.user_completed_lectures = [];
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? `usr-${normEmail}` : 'usr-default');

    let existing = store.user_completed_lectures.find(l => 
      ((l.user_id === effectiveUserId) || (normEmail && l.user_email === normEmail)) &&
      (l.skill_name.toLowerCase() === cleanSkill.toLowerCase()) &&
      (l.lecture_id === cleanLecture)
    );

    if (existing) {
      existing.time_watched_seconds = Math.max(existing.time_watched_seconds || 0, watched);
      existing.completed_at = new Date().toISOString();
    } else {
      store.user_completed_lectures.push({
        id: Date.now(),
        user_id: effectiveUserId,
        user_email: normEmail,
        skill_name: cleanSkill,
        lecture_id: cleanLecture,
        duration_seconds: duration,
        time_watched_seconds: watched,
        completed_at: new Date().toISOString()
      });
    }

    // Count unique completed lectures for this skill, capped at 15
    const distinctLectures = new Set(
      store.user_completed_lectures
        .filter(l => 
          ((l.user_id === effectiveUserId) || (normEmail && l.user_email === normEmail)) &&
          (l.skill_name.toLowerCase() === cleanSkill.toLowerCase() || cleanSkill.toLowerCase().includes(l.skill_name.toLowerCase()))
        )
        .map(l => l.lecture_id)
    );
    const uniqueCount = Math.min(15, distinctLectures.size);

    if (store.student_skill_progress) {
      const match = store.student_skill_progress.find(item =>
        ((item.user_id === effectiveUserId) || (normEmail && item.user_email === normEmail)) &&
        (item.skill_name.toLowerCase().includes(cleanSkill.toLowerCase()) || cleanSkill.toLowerCase().includes(item.skill_name.toLowerCase()))
      );
      if (match) {
        match.lectures_completed = uniqueCount;
        const base = Math.min(100, Math.max(0, match.base_percentage || 35));
        const testB = (match.status === 'LIVE VERIFIED') ? 34 : 0;
        match.total_score = Math.min(100, base + uniqueCount + testB);
        match.updated_at = new Date().toISOString();
      }
    }

    saveLocalStore(store);

    return {
      success: true,
      completed: true,
      lectures_completed: uniqueCount,
      lecture_score: uniqueCount,
      message: 'Lecture legitimately completed and verified (+1 unique lecture towards 15% weight).'
    };
  },

  async getCompletedLectures({ user_id, user_email, skill_name }) {
    const p = initPool();
    const cleanSkill = (skill_name || '').trim().toLowerCase();
    let resolvedUserId = user_id;

    if (p) {
      try {
        if (!resolvedUserId && user_email) {
          const uRes = await p.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [user_email.trim().toLowerCase()]);
          if (uRes.rows[0]) resolvedUserId = uRes.rows[0].id;
        }
        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          let query = 'SELECT DISTINCT lecture_id, skill_name, completed_at FROM user_completed_lectures WHERE user_id = $1';
          const params = [validUuid];
          if (cleanSkill) {
            query += ' AND (LOWER(skill_name) = $2 OR LOWER($2) LIKE '%' || LOWER(skill_name) || '%')';
            params.push(cleanSkill);
          }
          const res = await p.query(query, params);
          return res.rows || [];
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getCompletedLectures notice:', err.message);
      }
    }

    const store = getLocalStore();
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? `usr-${normEmail}` : null);

    return (store.user_completed_lectures || []).filter(l => {
      const matchUser = (effectiveUserId && l.user_id === effectiveUserId) || (normEmail && l.user_email === normEmail);
      if (!matchUser) return false;
      if (!cleanSkill) return true;
      return l.skill_name.toLowerCase().includes(cleanSkill) || cleanSkill.includes(l.skill_name.toLowerCase());
    });
  },

  // Connection & Diagnostics Helpers
  isCloudConnected() {
    return Boolean(pool);
  },
  getLocalStore,
  getLastError() {
    return lastDbError;
  }
};

module.exports = db;
