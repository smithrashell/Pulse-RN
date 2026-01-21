import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Open the database
const expoDb = openDatabaseSync('pulse.db', { enableChangeListener: true });

// Create Drizzle instance
export const db = drizzle(expoDb, { schema });

// Initialize database with migrations
export async function initializeDatabase() {
  // Create tables if they don't exist
  await expoDb.execAsync(`
    CREATE TABLE IF NOT EXISTS focus_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      description TEXT,
      target_outcome TEXT,
      target_time_weekly_minutes INTEGER,
      target_frequency INTEGER,
      identity_statement TEXT,
      icon TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      progress_unit TEXT,
      progress_unit_label TEXT,
      progress_target INTEGER,
      time_required INTEGER NOT NULL DEFAULT 1,
      completion_reflection TEXT,
      abandonment_reason TEXT,
      parent_focus_area_id INTEGER REFERENCES focus_areas(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_focus_areas_parent ON focus_areas(parent_focus_area_id);
    CREATE INDEX IF NOT EXISTS idx_focus_areas_status ON focus_areas(status);

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      focus_area_id INTEGER REFERENCES focus_areas(id) ON DELETE SET NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration_minutes INTEGER,
      quality_rating INTEGER,
      note TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_focus_area ON sessions(focus_area_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

    CREATE TABLE IF NOT EXISTS daily_logs (
      date TEXT PRIMARY KEY,
      morning_intention TEXT,
      proof_commitment TEXT,
      evening_reflection TEXT,
      feeling_rating INTEGER
    );

    CREATE TABLE IF NOT EXISTS monthly_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      title TEXT NOT NULL,
      focus_area_id INTEGER REFERENCES focus_areas(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      due_date TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_monthly_outcomes_month ON monthly_outcomes(month);
    CREATE INDEX IF NOT EXISTS idx_monthly_outcomes_focus_area ON monthly_outcomes(focus_area_id);

    CREATE TABLE IF NOT EXISTS weekly_intentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL,
      title TEXT NOT NULL,
      monthly_outcome_id INTEGER REFERENCES monthly_outcomes(id) ON DELETE SET NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_intentions_week ON weekly_intentions(week);
    CREATE INDEX IF NOT EXISTS idx_weekly_intentions_monthly ON weekly_intentions(monthly_outcome_id);

    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week TEXT NOT NULL,
      what_worked TEXT,
      what_didnt_work TEXT,
      try_next_week TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews(week);

    CREATE TABLE IF NOT EXISTS monthly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      biggest_win TEXT,
      carry_forward TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_monthly_reviews_month ON monthly_reviews(month);

    CREATE TABLE IF NOT EXISTS quarterly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quarter TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER NOT NULL,
      focus_area_id INTEGER REFERENCES focus_areas(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      completion_reflection TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quarterly_goals_quarter ON quarterly_goals(quarter);
    CREATE INDEX IF NOT EXISTS idx_quarterly_goals_focus_area ON quarterly_goals(focus_area_id);

    CREATE TABLE IF NOT EXISTS quarterly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quarter TEXT NOT NULL,
      biggest_win TEXT,
      biggest_challenge TEXT,
      lessons_learned TEXT,
      focus_next_quarter TEXT,
      goals_completed INTEGER,
      goals_total INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quarterly_reviews_quarter ON quarterly_reviews(quarter);

    CREATE TABLE IF NOT EXISTS disciplines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL,
      specific_days TEXT,
      target_time TEXT,
      flexibility_minutes INTEGER DEFAULT 15,
      quarter TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      started_at INTEGER NOT NULL,
      ingrained_at INTEGER,
      evolved_from_id INTEGER,
      ingrained_reflection TEXT,
      retired_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_disciplines_status ON disciplines(status);
    CREATE INDEX IF NOT EXISTS idx_disciplines_quarter ON disciplines(quarter);

    CREATE TABLE IF NOT EXISTS discipline_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discipline_id INTEGER NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      rating TEXT NOT NULL,
      actual_time TEXT,
      note TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_discipline_checks_discipline ON discipline_checks(discipline_id);
    CREATE INDEX IF NOT EXISTS idx_discipline_checks_date ON discipline_checks(date);

    CREATE TABLE IF NOT EXISTS life_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      time_window TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      is_stretch_goal INTEGER NOT NULL DEFAULT 0,
      focus_area_id INTEGER REFERENCES focus_areas(id) ON DELETE SET NULL,
      achieved_at INTEGER,
      achievement_reflection TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_life_goals_category ON life_goals(category);
    CREATE INDEX IF NOT EXISTS idx_life_goals_time_window ON life_goals(time_window);
    CREATE INDEX IF NOT EXISTS idx_life_goals_status ON life_goals(status);
    CREATE INDEX IF NOT EXISTS idx_life_goals_focus_area ON life_goals(focus_area_id);

    CREATE TABLE IF NOT EXISTS life_goal_check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      goals_achieved_count INTEGER NOT NULL DEFAULT 0,
      goals_in_motion_count INTEGER NOT NULL DEFAULT 0,
      new_connections_note TEXT,
      general_reflection TEXT,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_life_goal_check_ins_month ON life_goal_check_ins(month);

    CREATE TABLE IF NOT EXISTS accountability_partner (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      check_in_day TEXT NOT NULL DEFAULT 'Monday',
      check_in_time TEXT,
      contact_method TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS partner_check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES accountability_partner(id) ON DELETE CASCADE,
      week TEXT NOT NULL,
      completed_at INTEGER,
      topics_discussed TEXT,
      partner_feedback TEXT,
      commitment_made TEXT,
      felt_productive_rating INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_partner_check_ins_partner ON partner_check_ins(partner_id);
    CREATE INDEX IF NOT EXISTS idx_partner_check_ins_week ON partner_check_ins(week);

    -- Add quarterly_goal_id to monthly_outcomes if it doesn't exist
    -- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we check pragmatically
    PRAGMA table_info(monthly_outcomes);
  `);

  // Check if quarterly_goal_id column exists
  const tableInfo = await expoDb.getAllAsync('PRAGMA table_info(monthly_outcomes)') as any[];
  const hasQuarterlyGoalId = tableInfo.some((col: any) => col.name === 'quarterly_goal_id');

  if (!hasQuarterlyGoalId) {
    await expoDb.execAsync(`
      ALTER TABLE monthly_outcomes ADD COLUMN quarterly_goal_id INTEGER REFERENCES quarterly_goals(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_monthly_outcomes_quarterly_goal ON monthly_outcomes(quarterly_goal_id);
    `);
  }

  // Check if life_goal_id column exists in focus_areas
  const focusAreasInfo = await expoDb.getAllAsync('PRAGMA table_info(focus_areas)') as any[];
  const hasLifeGoalIdInFocusAreas = focusAreasInfo.some((col: any) => col.name === 'life_goal_id');

  if (!hasLifeGoalIdInFocusAreas) {
    await expoDb.execAsync(`
      ALTER TABLE focus_areas ADD COLUMN life_goal_id INTEGER REFERENCES life_goals(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_focus_areas_life_goal ON focus_areas(life_goal_id);
    `);
  }

  // Check if life_goal_id column exists in quarterly_goals
  const quarterlyGoalsInfo = await expoDb.getAllAsync('PRAGMA table_info(quarterly_goals)') as any[];
  const hasLifeGoalIdInQuarterlyGoals = quarterlyGoalsInfo.some((col: any) => col.name === 'life_goal_id');

  if (!hasLifeGoalIdInQuarterlyGoals) {
    await expoDb.execAsync(`
      ALTER TABLE quarterly_goals ADD COLUMN life_goal_id INTEGER REFERENCES life_goals(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_quarterly_goals_life_goal ON quarterly_goals(life_goal_id);
    `);
  }

  // Add Flinch Test columns to quarterly_goals if they don't exist
  const hasWasStretched = quarterlyGoalsInfo.some((col: any) => col.name === 'was_stretched');
  if (!hasWasStretched) {
    await expoDb.execAsync(`
      ALTER TABLE quarterly_goals ADD COLUMN was_stretched INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE quarterly_goals ADD COLUMN original_goal TEXT;
    `);
  }
}

export { schema };
