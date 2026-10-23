import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  calculateDailyStreak,
  DailyChallengeHistory,
  formatDateKey,
  getMonthCalendarData,
  isDateCompleted,
  isFutureDate,
  parseDateKey,
} from '../engine/daily';
import { getDailyChallengeSeed } from '../engine/deck';
import {
  borderRadius,
  colors,
  fontSize,
  fontWeight,
  modalStyles,
  spacing,
} from '../theme';

export interface DailyChallengeModalProps {
  visible: boolean;
  dailyHistory: DailyChallengeHistory;
  currentSeed?: string;
  onClose: () => void;
  onPlayChallenge: (dateStr: string, seed: string) => void;
  referenceDate?: Date;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatElapsed(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({
  visible,
  dailyHistory,
  currentSeed,
  onClose,
  onPlayChallenge,
  referenceDate = new Date(),
}) => {
  const todayKey = useMemo(() => formatDateKey(referenceDate), [referenceDate]);

  // Initial selected date defaults to today or current active challenge date
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  // Month and Year view for calendar navigation
  const initialDate = parseDateKey(selectedDate || todayKey);
  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth());

  const streakInfo = useMemo(
    () => calculateDailyStreak(dailyHistory, referenceDate),
    [dailyHistory, referenceDate]
  );

  const calendarData = useMemo(
    () => getMonthCalendarData(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  if (!visible) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = parseDateKey(todayKey);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayKey);
  };

  const handlePrevDay = () => {
    const curr = parseDateKey(selectedDate);
    curr.setDate(curr.getDate() - 1);
    const newKey = formatDateKey(curr);
    setSelectedDate(newKey);
    setViewYear(curr.getFullYear());
    setViewMonth(curr.getMonth());
  };

  const handleNextDay = () => {
    const curr = parseDateKey(selectedDate);
    curr.setDate(curr.getDate() + 1);
    const newKey = formatDateKey(curr);
    if (!isFutureDate(newKey, referenceDate)) {
      setSelectedDate(newKey);
      setViewYear(curr.getFullYear());
      setViewMonth(curr.getMonth());
    }
  };

  const selectedRecord = dailyHistory[selectedDate];
  const isSelectedCompleted = isDateCompleted(selectedDate, dailyHistory);
  const isSelectedFuture = isFutureDate(selectedDate, referenceDate);
  const selectedDateObj = parseDateKey(selectedDate);
  const selectedMonthName = MONTH_NAMES[selectedDateObj.getMonth()];
  const selectedDayNum = selectedDateObj.getDate();
  const selectedYear = selectedDateObj.getFullYear();

  const handleStartSelectedChallenge = () => {
    if (isSelectedFuture) return;
    const seed = getDailyChallengeSeed(selectedDateObj);
    onPlayChallenge(selectedDate, seed);
    onClose();
  };

  // Build grid of days
  const calendarCells: Array<{ day: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < calendarData.firstDayOfWeek; i++) {
    calendarCells.push({ day: null, dateKey: null });
  }
  for (let d = 1; d <= calendarData.daysInMonth; d++) {
    const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ day: d, dateKey });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.backdropMedium}>
        <Pressable
          style={modalStyles.backdropPressable}
          onPress={onClose}
          accessibilityLabel="Close daily challenge modal"
          accessibilityRole="button"
        />

        <View style={[modalStyles.cardBase, modalStyles.cardDark, styles.modalCard]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Daily Challenges</Text>
                <Text style={styles.headerSubtitle}>Complete daily deals in a row</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeIconBtn}
                accessibilityLabel="Close daily challenges"
                accessibilityRole="button"
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Streak Metrics Banner */}
            <View style={styles.streakBanner}>
              <View style={styles.streakItem}>
                <Text style={styles.streakValue}>🔥 {streakInfo.currentStreak}</Text>
                <Text style={styles.streakLabel}>Current Streak</Text>
              </View>

              <View style={styles.streakDivider} />

              <View style={styles.streakItem}>
                <Text style={styles.streakValue}>⭐ {streakInfo.longestStreak}</Text>
                <Text style={styles.streakLabel}>Best Streak</Text>
              </View>

              <View style={styles.streakDivider} />

              <View style={styles.streakItem}>
                <Text style={styles.streakValue}>🏆 {streakInfo.totalCompleted}</Text>
                <Text style={styles.streakLabel}>Completed</Text>
              </View>
            </View>

            {/* Calendar Month Navigation */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePrevMonth}
                style={styles.navArrowBtn}
                accessibilityLabel="Previous month"
                accessibilityRole="button"
              >
                <Text style={styles.navArrowText}>‹</Text>
              </TouchableOpacity>

              <Text style={styles.monthNavTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>

              <View style={styles.monthNavActions}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleJumpToToday}
                  style={styles.todayBtn}
                  accessibilityLabel="Jump to today"
                  accessibilityRole="button"
                >
                  <Text style={styles.todayBtnText}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleNextMonth}
                  style={styles.navArrowBtn}
                  accessibilityLabel="Next month"
                  accessibilityRole="button"
                >
                  <Text style={styles.navArrowText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekdays Row */}
            <View style={styles.weekdaysRow}>
              {WEEKDAY_NAMES.map((w, idx) => (
                <Text key={idx} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarCells.map((cell, idx) => {
                if (cell.day === null || cell.dateKey === null) {
                  return <View key={`empty-${idx}`} style={styles.emptyDayCell} />;
                }

                const cellKey = cell.dateKey;
                const isCompleted = isDateCompleted(cellKey, dailyHistory);
                const isSelected = cellKey === selectedDate;
                const isToday = cellKey === todayKey;
                const isFuture = isFutureDate(cellKey, referenceDate);

                return (
                  <TouchableOpacity
                    key={cellKey}
                    activeOpacity={isFuture ? 1 : 0.7}
                    onPress={() => setSelectedDate(cellKey)}
                    style={[
                      styles.dayCell,
                      isCompleted && styles.dayCellCompleted,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                      isFuture && styles.dayCellFuture,
                    ]}
                    accessibilityLabel={`${MONTH_NAMES[viewMonth]} ${cell.day}, ${viewYear}. ${
                      isCompleted ? 'Completed.' : 'Not completed.'
                    } ${isSelected ? 'Selected.' : ''}`}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        isCompleted && styles.dayNumberCompleted,
                        isSelected && styles.dayNumberSelected,
                        isFuture && styles.dayNumberFuture,
                      ]}
                    >
                      {cell.day}
                    </Text>
                    {isCompleted && <Text style={styles.completedBadge}>✓</Text>}
                    {isToday && !isCompleted && <View style={styles.todayDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Day Details Card */}
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handlePrevDay}
                  style={styles.dayNavArrow}
                  accessibilityLabel="Previous day"
                  accessibilityRole="button"
                >
                  <Text style={styles.dayNavArrowText}>‹</Text>
                </TouchableOpacity>

                <View style={styles.detailTitleGroup}>
                  <Text style={styles.detailDateText}>
                    {selectedDate === todayKey ? 'Today — ' : ''}
                    {selectedMonthName} {selectedDayNum}, {selectedYear}
                  </Text>
                  <Text style={styles.detailSeedText}>#{selectedDate}</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleNextDay}
                  disabled={isFutureDate(
                    formatDateKey(
                      new Date(
                        selectedDateObj.getFullYear(),
                        selectedDateObj.getMonth(),
                        selectedDateObj.getDate() + 1
                      )
                    ),
                    referenceDate
                  )}
                  style={[
                    styles.dayNavArrow,
                    isFutureDate(
                      formatDateKey(
                        new Date(
                          selectedDateObj.getFullYear(),
                          selectedDateObj.getMonth(),
                          selectedDateObj.getDate() + 1
                        )
                      ),
                      referenceDate
                    ) && styles.btnDisabled,
                  ]}
                  accessibilityLabel="Next day"
                  accessibilityRole="button"
                >
                  <Text style={styles.dayNavArrowText}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Status and Metrics */}
              {isSelectedCompleted && selectedRecord ? (
                <View style={styles.statusSection}>
                  <View style={styles.statusBadgeCompleted}>
                    <Text style={styles.statusBadgeTextCompleted}>✅ Completed</Text>
                  </View>

                  <View style={styles.detailMetricsRow}>
                    <View style={styles.detailMetric}>
                      <Text style={styles.detailMetricLabel}>SCORE</Text>
                      <Text style={styles.detailMetricValue}>{selectedRecord.score}</Text>
                    </View>
                    <View style={styles.detailMetric}>
                      <Text style={styles.detailMetricLabel}>MOVES</Text>
                      <Text style={styles.detailMetricValue}>{selectedRecord.moves}</Text>
                    </View>
                    <View style={styles.detailMetric}>
                      <Text style={styles.detailMetricLabel}>TIME</Text>
                      <Text style={styles.detailMetricValue}>
                        {formatElapsed(selectedRecord.elapsedSeconds)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleStartSelectedChallenge}
                    style={styles.replayBtn}
                    accessibilityLabel="Replay daily challenge"
                    accessibilityRole="button"
                  >
                    <Text style={styles.replayBtnText}>Replay Challenge</Text>
                  </TouchableOpacity>
                </View>
              ) : isSelectedFuture ? (
                <View style={styles.statusSection}>
                  <View style={styles.statusBadgeFuture}>
                    <Text style={styles.statusBadgeTextFuture}>🔒 Upcoming Challenge</Text>
                  </View>
                  <Text style={styles.futureSubtext}>
                    This daily challenge unlocks on {selectedMonthName} {selectedDayNum}.
                  </Text>
                  <View style={[styles.playBtn, styles.playBtnDisabled]}>
                    <Text style={styles.playBtnTextDisabled}>Locked</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.statusSection}>
                  <View style={styles.statusBadgeIncomplete}>
                    <Text style={styles.statusBadgeTextIncomplete}>⏳ Not Completed</Text>
                  </View>
                  <Text style={styles.incompleteSubtext}>
                    Play this daily challenge to add to your consecutive streak!
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleStartSelectedChallenge}
                    style={styles.playBtn}
                    accessibilityLabel="Play daily challenge"
                    accessibilityRole="button"
                  >
                    <Text style={styles.playBtnText}>Play Challenge</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalCard: {
    maxWidth: 420,
    maxHeight: '92%',
    padding: spacing.xl,
    borderRadius: borderRadius.modalLg,
  },
  scrollContent: {
    alignItems: 'stretch',
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  headerSubtitle: {
    color: colors.slate[400],
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.slate[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: colors.slate[400],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  streakBanner: {
    flexDirection: 'row',
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.slate[700],
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  streakValue: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  streakLabel: {
    color: colors.slate[400],
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.slate[700],
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthNavTitle: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  monthNavActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  navArrowText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    lineHeight: 20,
  },
  todayBtn: {
    backgroundColor: colors.felt.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  todayBtnText: {
    color: colors.felt.accent,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: colors.slate[400],
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    backgroundColor: colors.slate[900],
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.slate[800],
  },
  emptyDayCell: {
    width: '14.28%',
    aspectRatio: 1,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  dayCellCompleted: {
    backgroundColor: colors.felt.surface,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: colors.felt.accent,
    backgroundColor: colors.slate[700],
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.action.info,
  },
  dayCellFuture: {
    opacity: 0.35,
  },
  dayNumberText: {
    color: colors.slate[300],
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  dayNumberCompleted: {
    color: colors.white,
    fontWeight: fontWeight.heavy,
  },
  dayNumberSelected: {
    color: colors.white,
    fontWeight: fontWeight.heavy,
  },
  dayNumberFuture: {
    color: colors.slate[500],
  },
  completedBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
    color: colors.action.success,
    fontSize: 10,
    fontWeight: fontWeight.heavy,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.action.info,
    position: 'absolute',
    bottom: 3,
  },
  detailCard: {
    backgroundColor: colors.slate[800],
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailTitleGroup: {
    alignItems: 'center',
  },
  detailDateText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  detailSeedText: {
    color: colors.felt.accent,
    fontSize: fontSize.subtext,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  dayNavArrow: {
    width: 28,
    height: 28,
    backgroundColor: colors.slate[700],
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNavArrowText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  statusSection: {
    alignItems: 'center',
  },
  statusBadgeCompleted: {
    backgroundColor: colors.felt.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.action.successBorder,
  },
  statusBadgeTextCompleted: {
    color: colors.action.success,
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  statusBadgeIncomplete: {
    backgroundColor: colors.slate[700],
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  statusBadgeTextIncomplete: {
    color: colors.slate[300],
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  statusBadgeFuture: {
    backgroundColor: colors.slate[700],
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  statusBadgeTextFuture: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    fontWeight: fontWeight.bold,
  },
  futureSubtext: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  incompleteSubtext: {
    color: colors.slate[400],
    fontSize: fontSize.subtext,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  detailMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: colors.slate[900],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  detailMetric: {
    alignItems: 'center',
  },
  detailMetricLabel: {
    color: colors.felt.textMuted,
    fontSize: fontSize.tiny,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  detailMetricValue: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
    marginTop: 2,
  },
  replayBtn: {
    backgroundColor: colors.action.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  replayBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  playBtn: {
    backgroundColor: colors.action.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  playBtnText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: fontWeight.heavy,
  },
  playBtnDisabled: {
    backgroundColor: colors.slate[700],
  },
  playBtnTextDisabled: {
    color: colors.slate[500],
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  btnDisabled: {
    opacity: 0.3,
  },
});
