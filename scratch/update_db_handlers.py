import re

def update_db():
    with open('api/_handlers/db.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add user_completed_lectures to getLocalStore()
    old_store_check = "if (!inMemoryStore.student_skill_progress) inMemoryStore.student_skill_progress = [];"
    new_store_check = """if (!inMemoryStore.student_skill_progress) inMemoryStore.student_skill_progress = [];
    if (!inMemoryStore.user_completed_lectures) inMemoryStore.user_completed_lectures = [];"""
    content = content.replace(old_store_check, new_store_check)

    # 2. Add user_completed_lectures table creation in initDb()
    old_init = """      const skillCols = [
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

    new_init = """      const skillCols = [
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
      } catch (e) {}"""
    content = content.replace(old_init, new_init, 1)

    # 3. Add recordLectureProgress and getCompletedLectures methods
    # Add right before `// Connection & Diagnostics Helpers`
    target_pos = "  // Connection & Diagnostics Helpers"
    methods_code = """  // Lecture Progress Verification & Watch-Time Fraud Prevention
  async recordLectureProgress({ user_id, user_email, skill_name, lecture_id, duration_seconds, time_watched_seconds }) {
    const p = await getPool();
    const duration = Math.max(1, parseInt(duration_seconds, 10) || 600);
    const watched = Math.max(0, parseInt(time_watched_seconds, 10) || 0);
    const cleanSkill = (skill_name || 'Core Skill').trim();
    const cleanLecture = String(lecture_id || 'lecture-1').trim();
    const isCompleted = watched >= Math.floor(duration * 0.85);

    let resolvedUserId = user_id;

    if (!isCompleted) {
      return {
        success: true,
        completed: false,
        percent_watched: Math.min(100, Math.round((watched / duration) * 100)),
        message: 'Lecture progress recorded. Must accumulate active watch time >= 85% of duration to earn credit.'
      };
    }

    // Legitimately completed (watched >= 85%)
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
                 total_score = LEAST(100, base_percentage + $1 + CASE WHEN status = 'LIVE VERIFIED' THEN 34 ELSE 0 END),
                 updated_at = NOW()
             WHERE user_id = $2 AND (
               LOWER(skill_name) = LOWER($3) OR
               LOWER($3) LIKE '%' || LOWER(skill_name) || '%' OR
               LOWER(skill_name) LIKE '%' || LOWER($3) || '%'
             )`,
            [uniqueCompleted, validUuid, cleanSkill]
          );

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
        const base = Math.min(48, Math.max(20, match.base_percentage || 35));
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
    const p = await getPool();
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
            query += ' AND (LOWER(skill_name) = $2 OR LOWER($2) LIKE \'%\' || LOWER(skill_name) || \'%\')';
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

  // Connection & Diagnostics Helpers"""

    content = content.replace(target_pos, methods_code, 1)

    # 4. Strict baseline cap in syncStudentSkills:
    content = content.replace(
        "const basePct = Math.min(100, Math.max(0, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : s.score), 10) || 35));",
        "const basePct = Math.min(48, Math.max(20, parseInt(s.base_percentage !== undefined ? s.base_percentage : (s.baseScore !== undefined ? s.baseScore : s.score), 10) || 35));"
    )

    with open('api/_handlers/db.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("[OK] Successfully updated api/_handlers/db.js with lecture progress tracking and strict score formula")

if __name__ == '__main__':
    update_db()
