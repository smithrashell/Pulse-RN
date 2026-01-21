# Changelog

## [Unreleased]

### Added
- **Goal Visibility (Today Screen)**: Quarterly goals and disciplines now visible on Today screen
  - **QuarterlyFocusCard**: Shows disciplines, 6 quarterly goals with status icons, and week X of 13 progress
  - Card taps to navigate to quarterly goals screen
  - Prominent placement to keep goals top-of-mind daily
- **Accountability Partner**: Full accountability partner system for weekly check-ins
  - **Partner Setup**: Configure partner name, check-in day, and contact method (Settings > Accountability)
  - **Check-In Card**: Appears on Today screen on check-in day or when overdue
  - **Log Check-In**: Record what was discussed, partner feedback, commitments made, and productivity rating
  - **Goal Sharing**: Generate shareable text of quarterly goals and disciplines
  - **Streak Tracking**: Track consecutive weeks of check-ins
  - Database tables: `accountability_partner`, `partner_check_ins`
- **Flinch Test**: Mindset prompts during quarterly goal creation
  - **Flinch Prompt**: "Does this goal scare you?" - validates goals are challenging
  - **Think Bigger Prompt**: If goal feels safe, prompts for stretch version
  - Tracks `wasStretched` and `originalGoal` fields on quarterly goals
  - Encourages users to set ambitious, growth-oriented goals
- **Push Notifications**: Full notification system with 5 notification types
  - Morning Intention reminder (daily, customizable time)
  - Evening Reflection reminder (daily, customizable time)
  - Weekly Review reminder (Mondays, customizable time)
  - Monthly Review reminder (1st of month, customizable time)
  - Gentle Return Prompts (adaptive messaging based on engagement level)
- **Settings Screen**: Working notification toggles with time pickers
- **Deep Linking**: Tapping notifications navigates to relevant screens
- **Live Session Notes**: Add notes while timer is running (tap "Add note" button)
  - Redesigned note input with "Done" button below input
  - Shows note as centered italic text when saved (limited to 2 lines)
  - Edit button to modify saved notes
- **Recent Focus Areas**: Quick Start now sorts focus areas by most recently used (including Areas based on child activity)
- **Session Editing**: Tap on expanded sessions to edit notes, times, and quality ratings

### Changed
- **QuickStartSlider UI**: Refactored to two-row layout for better organization and scalability
  - **Row 1 (Recent Focus Areas)**: Shows Quick Timer + up to 6 most recently used standalone Focus Areas (scrollable)
  - **Row 2 (Areas)**: Shows all Areas as buttons (scrollable) - tap to expand dropdown below showing child Focus Areas
  - When an Area is expanded, its children appear in a third row below with original dropdown behavior
  - Children within expanded Areas sorted by recent use
  - Prevents UI clutter as more focus areas and areas are created while maintaining easy access to recent items

### Fixed
- **Database Migration**: Fixed missing table errors for quarterly_goals, quarterly_reviews, disciplines, and discipline_checks
  - Added CREATE TABLE statements for all quarterly and discipline-related tables
  - Added quarterly_goal_id column migration to monthly_outcomes table
  - Added proper indexes for performance
  - **Action Required**: Reload the app (press 'r' in terminal or shake device) to create missing tables
- **Monthly Outcomes - Week Calculation**: Fixed bug showing "Week -47 of 5" - now correctly calculates week of month using day-based formula
- **Monthly Outcomes - Status Buttons**: Buttons now show filled background when selected, outlined when not (removed confusing checkmark icon)
- **Monthly Outcomes - Layout**: Fixed card content being cut off at bottom, added proper spacing for title and buttons
- **Monthly Outcomes - Carried Over**: Removed from progress buttons, now displays as informational badge instead
- **Weekly Intentions - Modal**: Fixed modal not displaying content when tapping FAB button
- **Weekly Intentions - Outcome Linking**: Fixed outcomes not showing for cross-month weeks (now loads outcomes for the week's starting month)
- **Keyboard Handling**: Added KeyboardAvoidingView to all form screens and maxHeight to all modals for proper keyboard handling
  - Full-screen forms: daily-log, focus-area create/edit, monthly outcomes, weekly intentions, weekly review, monthly review, session detail
  - Modals: weekly-intentions dialog, monthly-outcomes dialog, session stop dialog, focus-area status/reflection dialogs, settings time picker
- **Daily Log - Previous Days**: Fixed reflections not showing when viewing previous days
- **Expo Go Compatibility**: Notifications gracefully skip scheduling in Expo Go (limited support)

### Added
- **Life Vision (100 Goals System)**:Comprehensive goal management system for defining and tracking 100 life goals across different time horizons
  - **Database Layer**: Life goals and check-in tables with proper indexes and relations
  - **Setup Wizard**: 10-page wizard for entering 100 goals (10 per page) with auto-save, progress tracking, and stretch goal detection
  - **Dashboard**: Main life vision screen with stats header, category filtering, and goals organized by time windows (Short/Mid/Mid-Late/Long Term)
  - **Goal Detail Screen**: Full CRUD with status management (Active/In Motion/Achieved/Deferred/Released), achievement reflections, and delete functionality
  - **Monthly Check-In Flow**: First Monday ritual for reviewing goals, marking achievements, tracking progress, and adding reflections
  - **North Star Card**: Summary card on Plan tab showing life vision stats (in motion, achieved this year, overall progress) - taps through to full dashboard
  - **Service Layer**: Business logic for stats calculation, check-in management, status updates, and filtering
  - **Time Windows**: 4 time horizons (1-2yr, 3-5yr, 6-9yr, 10-20yr) for organizing goals
  - **Categories**: 15 life categories (Career, Education, Entrepreneurship, Personal Brand, Financial, Health & Fitness, Relationships, Family, Lifestyle, Travel, Impact & Legacy, Mentorship & Network, Creative, Spiritual, Other)
  - **Integration**: Links to Quarterly Goals and Focus Areas (foreign keys in database for future linking UI)

### Added
- **Month View Enhancements**: Added three new sections below the calendar grid
  - **Disciplines Summary**: Shows active disciplines with completion rate (X/Y days) and color-coded progress bars (green ≥80%, primary 50-79%, error <50%)
  - **Weekly Rollup**: Displays each week (W1-W5) with start date, total time, and 7-dot activity indicator
  - **Quick Actions**: Navigation buttons for Monthly Review, Outcomes, and Quarter screens
- **Month View Screen**: New calendar-based view for monthly navigation
- **Weekly Review Screen**: Review intentions, time logged, and add reflections
- **Monthly Review Screen**: Review outcomes, focus area summary, and add reflections
- **Session Detail Screen**: View and edit individual sessions
- **Linked Intentions Display**: Monthly outcomes now show count of linked intentions with completion status and time context

### Changed
- **Status Button Styling**: Using inverseSurface color for selected state across all status buttons
- **Intentions Section**: Removed divider line, cleaner layout

---

## [Previous]

### 2025-12-XX
- Redesign daily log flow with sequential morning/evening prompts
- Fix invalid prop index warning on session expansion
- Implement full Pulse app with Expo Router, React Native Paper, and SQLite
