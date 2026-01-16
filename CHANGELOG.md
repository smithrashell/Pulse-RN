# Changelog

## [Unreleased]

### Added
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

### Fixed
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
