import sys

with open("api/_handlers/db.js", "rb") as f:
    raw = f.read()

has_crlf = b"\r\n" in raw
nl = "\r\n" if has_crlf else "\n"
content = raw.decode("utf-8")

# 1. Update users DDL & migrations
schema_target = """      // 2. Users Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS college VARCHAR(255);",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS year INT;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[];",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_study_minutes INT DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_lecture_minutes INT DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_exam_score NUMERIC(5,2) DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS dynamic_competence_percent NUMERIC(5,2) DEFAULT 25.0;"
      ];"""

schema_replacement = """      // 2. Users Table
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
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT[];",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_study_minutes INT DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS total_lecture_minutes INT DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avg_exam_score NUMERIC(5,2) DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS dynamic_competence_percent NUMERIC(5,2) DEFAULT 25.0;"
      ];"""

schema_target_crlf = schema_target.replace("\n", nl)
schema_replacement_crlf = schema_replacement.replace("\n", nl)

if schema_target_crlf in content:
    content = content.replace(schema_target_crlf, schema_replacement_crlf, 1)
    print("1. Users table DDL and migrations updated.")
else:
    print("Error: schema_target not found!")
    sys.exit(1)

# 2. Add student_activity table & candidates readiness_score migration in ensureSchema
candidates_target = """      // 6. Candidates Table
      await p.query(`
        CREATE TABLE IF NOT EXISTS candidates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          stream VARCHAR(50),
          domain VARCHAR(255),
          experience_level VARCHAR(100),
          skill_score NUMERIC(5,2) DEFAULT 90,
          dynamic_competence_percent NUMERIC(5,2) DEFAULT 90,
          skills TEXT[],
          capstone_proof TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);"""

candidates_replacement = """      // 6. Candidates Table
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
          readiness_score NUMERIC(5,2) DEFAULT 75,
          skills TEXT[],
          capstone_proof TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      const candCols = [
        "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS user_id UUID;",
        "ALTER TABLE candidates ADD COLUMN IF NOT EXISTS readiness_score NUMERIC(5,2) DEFAULT 75;"
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
          competence_rating NUMERIC(5,2) DEFAULT 75,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_activity_user_id ON student_activity (user_id);');
        await p.query('CREATE INDEX IF NOT EXISTS idx_student_activity_created ON student_activity (created_at DESC);');
      } catch (e) {}"""

candidates_target_crlf = candidates_target.replace("\n", nl)
candidates_replacement_crlf = candidates_replacement.replace("\n", nl)

if candidates_target_crlf in content:
    content = content.replace(candidates_target_crlf, candidates_replacement_crlf, 1)
    print("2. Candidates and student_activity DDL updated.")
else:
    print("Error: candidates_target not found!")
    sys.exit(1)

# 3. Add getUserByUsername & update createUser and upsertUser
create_user_target = """  async createUser({ name, email, password_hash, role, stream, is_verified = false }) {
    const normalized = (email || '').trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `INSERT INTO users (name, email, password_hash, role, stream, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [name, normalized, password_hash, role, stream || 'IT', is_verified]
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

  async upsertUser({ name, email, password_hash, role, stream, is_verified = false }) {
    const normalized = (email || '').trim().toLowerCase();
    const p = initPool();
    if (p) {
      try {
        await ensureSchema();
        const res = await p.query(
          `INSERT INTO users (name, email, password_hash, role, stream, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO UPDATE 
           SET name = EXCLUDED.name,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role,
               stream = EXCLUDED.stream,
               is_verified = EXCLUDED.is_verified
           RETURNING *`,
          [name, normalized, password_hash, role, stream || 'IT', is_verified]
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
      u.name = name;
      u.password_hash = password_hash;
      u.role = role;
      u.stream = stream || 'IT';
      u.is_verified = is_verified;
    } else {
      u = {
        id: `usr-${Date.now()}`,
        name,
        email: normalized,
        password_hash,
        role,
        stream: stream || 'IT',
        is_verified,
        created_at: new Date().toISOString()
      };
      store.users.push(u);
    }
    saveLocalStore(store);
    return u;
  },"""

create_user_replacement = """  async getUserByUsername(username) {
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
  },"""

create_user_target_crlf = create_user_target.replace("\n", nl)
create_user_replacement_crlf = create_user_replacement.replace("\n", nl)

if create_user_target_crlf in content:
    content = content.replace(create_user_target_crlf, create_user_replacement_crlf, 1)
    print("3. getUserByUsername and createUser/upsertUser updated.")
else:
    print("Error: create_user_target not found!")
    sys.exit(1)

# 4. Add recordStudentActivity & getStudentAnalytics methods
activity_methods = """  // Record Student Study Activity & Update Readiness Score in Candidates Table
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
    let readinessScore = 75;

    if (p) {
      try {
        await ensureSchema();
        const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;

        const res = await p.query(
          `INSERT INTO student_activity (user_id, stream, topic, activity_type, score, time_spent_minutes, competence_rating)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [validUuid, streamKey, cleanTopic, normType, scoreVal, timeSpent, competenceVal]
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
           WHERE user_id = $1 OR user_id::text = $2`,
          [validUuid || '00000000-0000-0000-0000-000000000000', String(user_id)]
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
                `INSERT INTO candidates (user_id, name, email, stream, domain, experience_level, skill_score, dynamic_competence_percent, readiness_score)
                 VALUES ($1, $2, $3, $4, $5, 'Student / Candidate', $6, $7, $6)
                 ON CONFLICT (email) DO UPDATE
                 SET readiness_score = EXCLUDED.readiness_score, dynamic_competence_percent = EXCLUDED.dynamic_competence_percent, skill_score = EXCLUDED.skill_score`,
                [validUuid, nameToUse, emailToUse, streamKey, cleanTopic, readinessScore, maxComp]
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
    const streamKey = (stream || 'it').toLowerCase();
    const p = initPool();
    let activities = [];
    let readinessScore = 75;

    if (p) {
      try {
        await ensureSchema();
        const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
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
          readinessScore = Number(candRes.rows[0].readiness_score) || Number(candRes.rows[0].skill_score) || 75;
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
          readinessScore = Number(cand.readiness_score) || Number(cand.skill_score) || 75;
        }
      }
    }

    const totalMinutes = activities.reduce((sum, a) => sum + (Number(a.time_spent_minutes) || 0), 0);
    const studyHours = Math.round((totalMinutes / 60) * 10) / 10;
    const completedTopicsList = [...new Set(activities.map(a => a.topic).filter(Boolean))];

    // Standard stream disciplines map
    const defaultStreamDisciplines = {
      it: [
        { name: 'Data Structures & Algorithms', keywords: ['algorithm', 'dsa', 'data structure', 'sorting', 'binary'] },
        { name: 'Web Dev & Full-Stack', keywords: ['web', 'full-stack', 'react', 'api', 'backend', 'node'] },
        { name: 'Database Systems & SQL', keywords: ['database', 'dbms', 'sql', 'postgres', 'index'] },
        { name: 'Operating Systems & Concurrency', keywords: ['os', 'concurrency', 'process', 'thread', 'memory'] },
        { name: 'Computer Networks & APIs', keywords: ['network', 'tcp', 'http', 'socket', 'ip'] }
      ],
      ece: [
        { name: 'Embedded C & RTOS', keywords: ['embedded', 'c', 'rtos', 'freertos', 'arm'] },
        { name: 'Microcontrollers & STM32', keywords: ['microcontroller', 'stm32', 'firmware', 'registers'] },
        { name: 'Hardware Protocols (SPI/I2C/CAN)', keywords: ['protocol', 'spi', 'i2c', 'can', 'uart'] },
        { name: 'VLSI & Circuit Diagnostics', keywords: ['vlsi', 'circuit', 'verilog', 'fpga'] },
        { name: 'Signal Processing & Control', keywords: ['signal', 'dsp', 'filter', 'matlab'] }
      ]
    };

    const disciplines = defaultStreamDisciplines[streamKey] || defaultStreamDisciplines.it;
    const skillCompetencies = disciplines.map(disc => {
      // Find matching activities for this discipline
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

      // If user has general activity, compute proportional baseline
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

    return {
      study_hours: studyHours,
      total_study_minutes: totalMinutes,
      completed_topics: completedTopicsList.length,
      topics: completedTopicsList,
      readiness_score: readinessScore,
      skill_competencies: skillCompetencies,
      activities: activities.slice(0, 20)
    };
  },
"""

target_end = "  // Connection & Diagnostics Helpers"
target_end_crlf = target_end.replace("\n", nl)
activity_methods_crlf = activity_methods.replace("\n", nl)

if target_end_crlf in content:
    content = content.replace(target_end_crlf, activity_methods_crlf + nl + target_end_crlf, 1)
    print("4. recordStudentActivity and getStudentAnalytics added to db.js.")
else:
    print("Error: target_end not found!")
    sys.exit(1)

with open("api/_handlers/db.js", "wb") as f:
    f.write(content.encode("utf-8"))

print("api/_handlers/db.js successfully updated!")
