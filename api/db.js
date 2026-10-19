// Database integration module for Campus2Career (PostgreSQL / Supabase)
// Supports connection via process.env.POSTGRES_URL or local fallback store
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool = null;
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.SUPABASE_POSTGRES_URL;

if (connectionString) {
  try {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000
    });
    console.log('[Campus2Career DB] Connected to PostgreSQL / Supabase pool.');
  } catch (err) {
    console.error('[Campus2Career DB] Pool init failed:', err.message);
  }
}

// In-memory / file-backed fallback store for seamless offline/local development
const LOCAL_DB_FILE = path.join(__dirname, '..', 'candidates_db.json');
const LOCAL_STORE_FILE = path.join(__dirname, '..', 'local_pg_store.json');

function getLocalStore() {
  if (fs.existsSync(LOCAL_STORE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));
    } catch (e) {}
  }
  return {
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
    login_attempts: {},
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
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Campus2Career DB] Local store write failed:', e);
  }
}

// Ensure schema is auto-migrated if connected to PostgreSQL
let schemaInitialized = false;
async function ensureSchema() {
  if (!pool || schemaInitialized) return;
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf-8');
    await pool.query(schemaSql);
    schemaInitialized = true;
    console.log('[Campus2Career DB] PostgreSQL schema & seed migration verified.');
  } catch (err) {
    console.warn('[Campus2Career DB] Auto-migration notice:', err.message);
  }
}

async function query(text, params = []) {
  if (pool) {
    await ensureSchema();
    return await pool.query(text, params);
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
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalized]);
      return res.rows[0] || null;
    }
    const store = getLocalStore();
    return store.users.find(u => u.email.toLowerCase() === normalized) || null;
  },

  async createUser({ name, email, password_hash, role, stream, is_verified = false }) {
    const normalized = (email || '').trim().toLowerCase();
    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, stream, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, normalized, password_hash, role, stream || 'IT', is_verified]
      );
      return res.rows[0];
    }
    const store = getLocalStore();
    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email: normalized,
      password_hash,
      role,
      stream: stream || 'IT',
      is_verified,
      created_at: new Date().toISOString()
    };
    store.users.push(newUser);
    saveLocalStore(store);
    return newUser;
  },

  async markUserVerified(email) {
    const normalized = (email || '').trim().toLowerCase();
    if (pool) {
      await ensureSchema();
      await pool.query('UPDATE users SET is_verified = TRUE WHERE LOWER(email) = $1', [normalized]);
      return true;
    }
    const store = getLocalStore();
    const u = store.users.find(usr => usr.email.toLowerCase() === normalized);
    if (u) {
      u.is_verified = true;
      saveLocalStore(store);
    }
    return true;
  },

  async getAllUsers() {
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT id, name, email, role, stream, is_verified, created_at FROM users ORDER BY created_at DESC');
      return res.rows;
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
    if (pool) {
      await ensureSchema();
      const res = await pool.query('DELETE FROM users WHERE id::text = $1 OR LOWER(email) = $1 RETURNING id, email', [val]);
      return res.rows.length > 0;
    }
    const store = getLocalStore();
    const initLen = (store.users || []).length;
    store.users = (store.users || []).filter(u => u.id !== idOrEmail && u.email.toLowerCase() !== val);
    if (store.users.length !== initLen) {
      saveLocalStore(store);
      return true;
    }
    return false;
  },

  // Rate Limiting (Brute-Force Protection)
  async checkRateLimit(ip, email) {
    const ipAddr = ip || '127.0.0.1';
    const emailAddr = (email || '').trim().toLowerCase();
    const now = new Date();

    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        `SELECT failed_attempts, locked_until 
         FROM login_attempts 
         WHERE ip_address = $1 AND email = $2`,
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
    }

    const store = getLocalStore();
    const key = `${ipAddr}_${emailAddr}`;
    const entry = store.login_attempts[key];
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

    if (pool) {
      await ensureSchema();
      const cur = await pool.query(
        `SELECT failed_attempts FROM login_attempts WHERE ip_address = $1 AND email = $2`,
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

      await pool.query(
        `INSERT INTO login_attempts (ip_address, email, failed_attempts, locked_until, updated_at)
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
    }

    const store = getLocalStore();
    const key = `${ipAddr}_${emailAddr}`;
    const entry = store.login_attempts[key] || { failed_attempts: 0 };
    entry.failed_attempts += 1;
    let lockedUntil = null;
    if (entry.failed_attempts === 5) {
      lockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
    } else if (entry.failed_attempts >= 6) {
      lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    }
    entry.locked_until = lockedUntil ? lockedUntil.toISOString() : null;
    entry.updated_at = now.toISOString();
    store.login_attempts[key] = entry;
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
    if (pool) {
      await ensureSchema();
      await pool.query('DELETE FROM login_attempts WHERE ip_address = $1 AND email = $2', [ipAddr, emailAddr]);
      return;
    }
    const store = getLocalStore();
    const key = `${ipAddr}_${emailAddr}`;
    delete store.login_attempts[key];
    saveLocalStore(store);
  },

  // Pending Verifications
  async createPendingVerification(email, pin, token) {
    const normalized = (email || '').trim().toLowerCase();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (pool) {
      await ensureSchema();
      // Remove any previous pending verification for this email
      await pool.query('DELETE FROM pending_verifications WHERE LOWER(email) = $1', [normalized]);
      await pool.query(
        `INSERT INTO pending_verifications (email, pin, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [normalized, pin, token, expiresAt]
      );
      return { email: normalized, pin, token, expiresAt };
    }

    const store = getLocalStore();
    store.pending_verifications = store.pending_verifications.filter(v => v.email.toLowerCase() !== normalized);
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
    const now = new Date();

    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        `SELECT * FROM pending_verifications 
         WHERE LOWER(email) = $1 
           AND (token = $2 OR pin = $2) 
           AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [normalized, tokenOrPin]
      );
      return res.rows[0] || null;
    }

    const store = getLocalStore();
    return store.pending_verifications.find(v => 
      v.email.toLowerCase() === normalized &&
      (v.token === tokenOrPin || v.pin === tokenOrPin) &&
      new Date(v.expires_at) > now
    ) || null;
  },

  async deletePendingVerification(email) {
    const normalized = (email || '').trim().toLowerCase();
    if (pool) {
      await ensureSchema();
      await pool.query('DELETE FROM pending_verifications WHERE LOWER(email) = $1', [normalized]);
      return;
    }
    const store = getLocalStore();
    store.pending_verifications = store.pending_verifications.filter(v => v.email.toLowerCase() !== normalized);
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
      await ensureSchema();
      let queryStr = 'SELECT * FROM candidates WHERE (skill_score >= 75 OR dynamic_competence_percent >= 75)';
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
      return res.rows.map(enrichCandidate);
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
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT * FROM candidates WHERE id::text = $1 OR email = $1 LIMIT 1', [id]);
      return res.rows[0] || null;
    }
    const store = getLocalStore();
    return store.candidates.find(c => c.id === id || c.email === id) || null;
  },

  // Market Signals
  async getMarketSignals() {
    if (pool) {
      await ensureSchema();
      const res = await pool.query('SELECT * FROM market_signals ORDER BY created_at DESC');
      return res.rows;
    }
    const store = getLocalStore();
    return store.market_signals;
  },

  async createMarketSignal({ recruiter_name, company, stream, domain, demand_surge, ctc_range, mandatory_skills, fresher_deficit, actionable_directive }) {
    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        `INSERT INTO market_signals (recruiter_name, company, stream, domain, demand_surge, ctc_range, mandatory_skills, fresher_deficit, actionable_directive)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [recruiter_name, company, stream, domain, demand_surge || '+75% Surge', ctc_range || '₹12 - ₹24 LPA', mandatory_skills, fresher_deficit, actionable_directive]
      );
      return res.rows[0];
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
      await ensureSchema();
      const res = await pool.query('SELECT * FROM market_news ORDER BY published_at DESC');
      return res.rows;
    }
    const store = getLocalStore();
    return store.market_news;
  },

  async createMarketNews({ title, stream, summary, in_demand_skills, source_company }) {
    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        `INSERT INTO market_news (title, stream, summary, in_demand_skills, source_company)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [title, stream, summary, in_demand_skills, source_company]
      );
      return res.rows[0];
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
      await ensureSchema();
      const res = await pool.query(
        `INSERT INTO diagnostics (user_email, stream, module_title, mode, score, passed, answers)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [normalized, stream || 'IT', module_title, mode || 10, score, passed, JSON.stringify(answers || [])]
      );
      return res.rows[0];
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
      await ensureSchema();
      const res = await pool.query(
        'SELECT * FROM diagnostics WHERE LOWER(user_email) = $1 ORDER BY submitted_at DESC',
        [normalized]
      );
      return res.rows;
    }
    const store = getLocalStore();
    return (store.diagnostics || []).filter(d => (d.user_email || '').toLowerCase() === normalized);
  },

  // Sovereign Admin Audit Logs
  async recordAuditLog({ actor_email, action, details, ip_address }) {
    if (pool) {
      await ensureSchema();
      const res = await pool.query(
        `INSERT INTO audit_logs (actor_email, action, details, ip_address)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [actor_email || 'admin@campus2career.org', action, details || '', ip_address || '127.0.0.1']
      );
      return res.rows[0];
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
      await ensureSchema();
      const res = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50');
      return res.rows;
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

      return {
        activity: insertRes.rows[0],
        competence: {
          total_study_minutes: Number(metrics.total_study_minutes) || 0,
          total_lecture_minutes: Number(metrics.total_lecture_minutes) || 0,
          avg_exam_score: Number(metrics.avg_exam_score) || 0,
          dynamic_competence_percent: Number(metrics.dynamic_competence_percent) || 25.0
        }
      };
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
  }
};

module.exports = db;
