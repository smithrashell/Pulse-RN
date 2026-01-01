# Changelog

## [Unreleased]

### Fixed
- **Monthly Outcomes - Week Calculation**: Fixed bug showing "Week -47 of 5" - now correctly calculates week of month using day-based formula
- **Monthly Outcomes - Status Buttons**: Buttons now show filled background when selected, outlined when not (removed confusing checkmark icon)
- **Monthly Outcomes - Layout**: Fixed card content being cut off at bottom, added proper spacing for title and buttons
- **Monthly Outcomes - Carried Over**: Removed from progress buttons, now displays as informational badge instead
- **Weekly Intentions - Modal**: Fixed modal not displaying content when tapping FAB button
- **Weekly Intentions - Outcome Linking**: Fixed outcomes not showing for cross-month weeks (now loads outcomes for the week's starting month)
- **Keyboard Handling**: Added KeyboardAvoidingView to all form screens (daily-log, focus-area create/edit, monthly outcomes, weekly intentions)
- **Daily Log - Previous Days**: Fixed reflections not showing when viewing previous days

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
