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
  `);
}

export { schema };
