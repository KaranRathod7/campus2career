import sys

with open('api/_handlers/db.js', 'rb') as f:
    content = f.read().decode('utf-8')

nl = "\n"

# 1. ensureSchema: Add student_skill_progress table
t1 = """      // 7. Student Study Activity Table
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

r1 = """      // 7. Student Study Activity Table
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
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'UNVERIFIED BASELINE';",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS lectures_completed INT DEFAULT 0;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS current_milestone TEXT;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS next_milestone TEXT;",
        "ALTER TABLE student_skill_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;"
      ];
      for (const sCol of skillCols) {
        try { await p.query(sCol); } catch (e) {}
      }"""

assert t1 in content, "t1 not found in db.js"
content = content.replace(t1, r1, 1)

# 2. getLocalStore: ensure student_skill_progress is initialized
t2 = """function getLocalStore() {
  if (inMemoryStore) return inMemoryStore;
  const tmpPath = path.join('/tmp', 'local_pg_store.json');
  if (fs.existsSync(tmpPath)) {
    try {
      inMemoryStore = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
      return inMemoryStore;
    } catch (e) {}
  }
  if (fs.existsSync(LOCAL_STORE_FILE)) {
    try {
      inMemoryStore = JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));
      return inMemoryStore;
    } catch (e) {}
  }"""

r2 = """function getLocalStore() {
  if (inMemoryStore) {
    if (!inMemoryStore.student_skill_progress) inMemoryStore.student_skill_progress = [];
    return inMemoryStore;
  }
  const tmpPath = path.join('/tmp', 'local_pg_store.json');
  if (fs.existsSync(tmpPath)) {
    try {
      inMemoryStore = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));
      if (!inMemoryStore.student_skill_progress) inMemoryStore.student_skill_progress = [];
      return inMemoryStore;
    } catch (e) {}
  }
  if (fs.existsSync(LOCAL_STORE_FILE)) {
    try {
      inMemoryStore = JSON.parse(fs.readFileSync(LOCAL_STORE_FILE, 'utf-8'));
      if (!inMemoryStore.student_skill_progress) inMemoryStore.student_skill_progress = [];
      return inMemoryStore;
    } catch (e) {}
  }"""

assert t2 in content, "t2 not found in db.js"
content = content.replace(t2, r2, 1)

# 3. Add student_skill_progress update in recordStudentActivity (PostgreSQL)
t3 = """        // Also update users table summary metrics
        try {
          await p.query(
            `UPDATE users
             SET total_study_minutes = COALESCE(total_study_minutes, 0) + $1,
                 dynamic_competence_percent = $2
             WHERE (id::text = $3 OR LOWER(email) = LOWER($4))`,
            [timeSpent, maxComp, String(user_id), (user_email || '').toLowerCase()]
          );
        } catch (uErr) {}"""

r3 = """        // Also update users table summary metrics
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
        }"""

assert t3 in content, "t3 not found in db.js"
content = content.replace(t3, r3, 1)

# 4. Add student_skill_progress update in recordStudentActivity (Local store)
t4 = """    // Update user in local store
    if (store.users) {
      const u = store.users.find(usr => (user_id && usr.id === user_id) || (user_email && usr.email.toLowerCase() === (user_email || '').toLowerCase()));
      if (u) {
        u.total_study_minutes = (Number(u.total_study_minutes) || 0) + timeSpent;
        u.dynamic_competence_percent = maxComp;
      }
    }"""

r4 = """    // Update user in local store
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
    }"""

assert t4 in content, "t4 not found in db.js"
content = content.replace(t4, r4, 1)

# 5. getStudentAnalytics: incorporate student_skill_progress if present
t5 = """    const disciplines = defaultStreamDisciplines[streamKey] || defaultStreamDisciplines.it;
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
    });"""

r5 = """    // Check if user has explicit records in student_skill_progress
    let userProgressSkills = [];
    if (p) {
      try {
        const validUuid = (user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(user_id))) ? String(user_id) : null;
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
    }"""

assert t5 in content, "t5 not found in db.js"
content = content.replace(t5, r5, 1)

# 6. Add syncStudentSkills and getStudentSkills before connection helpers
t6 = """  // Connection & Diagnostics Helpers
  isCloudConnected() {"""

r6 = """  // Sync / Upsert Student Skill Progress
  async syncStudentSkills({ user_id, user_email, skills }) {
    if (!skills) return [];
    const skillList = Array.isArray(skills) ? skills : [skills];
    const p = initPool();
    const synced = [];

    let resolvedUserId = user_id;
    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) resolvedUserId = uRes.rows[0].id;
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;

        for (const s of skillList) {
          const skillName = (s.skill_name || s.name || '').trim();
          if (!skillName) continue;
          const skillId = (s.skill_id || s.id || skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
          const category = (s.category || 'Core Skill').trim();
          const basePct = Math.min(100, Math.max(0, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : s.score), 10) || 35));
          const totalScore = Math.min(100, Math.max(0, parseInt(s.total_score !== undefined ? s.total_score : s.score, 10) || basePct));
          const status = (s.status || (totalScore >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE')).trim();
          const currentMilestone = (s.current_milestone || s.currentMilestone || 'Fundamental syntax & baseline concepts').trim();
          const nextMilestone = (s.next_milestone || s.nextMilestone || 'Production architecture & high-throughput concurrency').trim();
          const lecturesCompleted = Math.max(0, parseInt(s.lectures_completed || 0, 10));

          if (validUuid) {
            const res = await p.query(
              `INSERT INTO student_skill_progress (
                 user_id, skill_id, skill_name, category, base_percentage, total_score, status, lectures_completed, current_milestone, next_milestone, updated_at
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
               ON CONFLICT (user_id, skill_name) 
               DO UPDATE SET 
                 skill_id = EXCLUDED.skill_id,
                 category = EXCLUDED.category,
                 base_percentage = EXCLUDED.base_percentage,
                 total_score = EXCLUDED.total_score,
                 status = EXCLUDED.status,
                 lectures_completed = GREATEST(student_skill_progress.lectures_completed, EXCLUDED.lectures_completed),
                 current_milestone = COALESCE(EXCLUDED.current_milestone, student_skill_progress.current_milestone),
                 next_milestone = COALESCE(EXCLUDED.next_milestone, student_skill_progress.next_milestone),
                 updated_at = NOW()
               RETURNING *;`,
              [validUuid, skillId, skillName, category, basePct, totalScore, status, lecturesCompleted, currentMilestone, nextMilestone]
            );
            if (res.rows[0]) synced.push(res.rows[0]);
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
      const skillId = (s.skill_id || s.id || skillName.toLowerCase().replace(/[^a-z0-9]/g, '_')).trim();
      const category = (s.category || 'Core Skill').trim();
      const basePct = Math.min(100, Math.max(0, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : s.score), 10) || 35));
      const totalScore = Math.min(100, Math.max(0, parseInt(s.total_score !== undefined ? s.total_score : s.score, 10) || basePct));
      const status = (s.status || (totalScore >= 80 ? 'LIVE VERIFIED' : 'UNVERIFIED BASELINE')).trim();
      const currentMilestone = (s.current_milestone || s.currentMilestone || 'Fundamental syntax & baseline concepts').trim();
      const nextMilestone = (s.next_milestone || s.nextMilestone || 'Production architecture & high-throughput concurrency').trim();
      const lecturesCompleted = Math.max(0, parseInt(s.lectures_completed || 0, 10));

      let existing = store.student_skill_progress.find(item => 
        (item.user_id === effectiveUserId || (item.user_email && item.user_email === normEmail)) &&
        item.skill_name.toLowerCase() === skillName.toLowerCase()
      );

      if (existing) {
        existing.skill_id = skillId;
        existing.category = category;
        existing.base_percentage = basePct;
        existing.total_score = totalScore;
        existing.status = status;
        existing.lectures_completed = Math.max(existing.lectures_completed || 0, lecturesCompleted);
        existing.current_milestone = currentMilestone || existing.current_milestone;
        existing.next_milestone = nextMilestone || existing.next_milestone;
        existing.updated_at = new Date().toISOString();
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
          status,
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

    saveLocalStore(store);
    return synced;
  },

  // Get Persisted Student Skill Progress
  async getStudentSkills({ user_id, user_email }) {
    const p = initPool();
    let resolvedUserId = user_id;

    if (p) {
      try {
        await ensureSchema();
        if (!resolvedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) {
          if (user_email) {
            const uRes = await p.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1', [user_email.trim().toLowerCase()]);
            if (uRes.rows[0]) resolvedUserId = uRes.rows[0].id;
          }
        }

        const validUuid = (resolvedUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(resolvedUserId))) ? String(resolvedUserId) : null;
        if (validUuid) {
          const res = await p.query(
            `SELECT * FROM student_skill_progress
             WHERE user_id = $1
             ORDER BY created_at ASC, skill_name ASC`,
            [validUuid]
          );
          if (res.rows && res.rows.length > 0) {
            return res.rows;
          }
        }
      } catch (err) {
        console.warn('[Campus2Career DB] Cloud getStudentSkills notice:', err.message);
      }
    }

    // Local fallback store
    const store = getLocalStore();
    const normEmail = (user_email || '').trim().toLowerCase();
    const effectiveUserId = resolvedUserId || user_id || (normEmail ? `usr-${normEmail}` : null);

    const skills = (store.student_skill_progress || []).filter(item => 
      (effectiveUserId && item.user_id === effectiveUserId) ||
      (normEmail && item.user_email && item.user_email === normEmail)
    );

    return skills;
  },

  // Connection & Diagnostics Helpers
  isCloudConnected() {"""

assert t6 in content, "t6 not found in db.js"
content = content.replace(t6, r6, 1)

with open('api/_handlers/db.js', 'wb') as f:
    f.write(content.encode('utf-8'))

print("api/_handlers/db.js updated successfully with student_skill_progress support!")
