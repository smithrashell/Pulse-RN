import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';

interface WeekDaySelectorProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dayMinutes?: Map<string, number>; // Map of 'yyyy-MM-dd' to total minutes
}

// Format minutes as compact string (1h13m, 45m, etc)
function formatMinutesShort(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function WeekDaySelector({
  selectedDate,
  onSelectDate,
  weekStartsOn = 1,
  dayMinutes,
}: WeekDaySelectorProps) {
  const theme = useTheme();

  const weekStart = startOfWeek(selectedDate, { weekStartsOn });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <View style={styles.container}>
      {weekDays.map((date) => {
        const isSelected = isSameDay(date, selectedDate);
        const isCurrentDay = isToday(date);
        const dayLetter = format(date, 'EEEEE'); // Single letter: M, T, W, etc.
        const dateNumber = format(date, 'd');
        const dateKey = format(date, 'yyyy-MM-dd');
        const minutes = dayMinutes?.get(dateKey) || 0;

        // Colors based on state
        const circleColor = isSelected
          ? theme.colors.primary
          : minutes > 0
            ? theme.colors.secondaryContainer
            : theme.colors.surfaceVariant;

        const circleTextColor = isSelected
          ? theme.colors.onPrimary
          : minutes > 0
            ? theme.colors.onSecondaryContainer
            : theme.colors.onSurfaceVariant;

        const labelColor =
          isSelected || isCurrentDay ? theme.colors.primary : theme.colors.onSurfaceVariant;

        return (
          <TouchableRipple
            key={date.toISOString()}
            onPress={() => onSelectDate(date)}
            style={styles.dayButton}
            borderless
          >
            <View style={styles.dayContent}>
              {/* Single letter day name */}
              <Text
                style={[
                  styles.dayLabel,
                  {
                    color: labelColor,
                    fontWeight: isSelected || isCurrentDay ? '700' : '400',
                  },
                ]}
              >
                {dayLetter}
              </Text>

              {/* Date number in circle */}
              <View style={[styles.dateCircle, { backgroundColor: circleColor }]}>
                <Text
                  style={[
                    styles.dateNumber,
                    {
                      color: circleTextColor,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {dateNumber}
                </Text>
              </View>

              {/* Time tracked (empty if no time) */}
              <Text
                style={[
                  styles.timeLabel,
                  {
                    color: labelColor,
                  },
                ]}
              >
                {minutes > 0 ? formatMinutesShort(minutes) : ' '}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 16,
    paddingVertical: 8,
  },
  dayButton: {
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dayContent: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 14,
  },
  timeLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default WeekDaySelector;
