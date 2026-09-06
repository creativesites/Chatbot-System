/**
 * MyaGoalCard
 *
 * Themeable mobile Hair Journey goal tracking card primitive.
 * Displays goal title, target milestone, progress bar, and status badges.
 */

import React from 'react';
import { defaultMyaTheme, MyaTheme } from './theme';
import { StyleSheet, Text, TouchableOpacity, View } from './nativePrimitives';

export interface HairGoalData {
  id: string;
  title: string;
  category?: 'growth' | 'moisture' | 'retention' | 'damage_repair' | string;
  targetDate?: string;
  progressPercent?: number;
  currentMilestone?: string;
  isCompleted?: boolean;
}

export interface MyaGoalCardProps {
  goal: HairGoalData;
  theme?: Partial<MyaTheme>;
  onUpdateGoal?: (goalId: string) => void;
}

export function MyaGoalCard({ goal, theme = {}, onUpdateGoal }: MyaGoalCardProps) {
  const activeTheme = { ...defaultMyaTheme, ...theme };
  const progress = Math.min(100, Math.max(0, goal.progressPercent ?? 45));

  return React.createElement(
    View,
    {
      style: [
        styles.card,
        {
          backgroundColor: activeTheme.colors.surface,
          borderColor: activeTheme.colors.border
        }
      ]
    },
    // Header
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(
        View,
        null,
        React.createElement(
          Text,
          { style: [styles.categoryBadge, { color: activeTheme.colors.accentGold }] },
          (goal.category || 'HAIR GOAL').toUpperCase()
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.title,
              {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeTitle
              }
            ]
          },
          goal.title
        )
      ),
      // Progress percentage tag
      React.createElement(
        View,
        {
          style: [
            styles.percentTag,
            { backgroundColor: activeTheme.colors.surfaceElevated }
          ]
        },
        React.createElement(
          Text,
          { style: [styles.percentText, { color: activeTheme.colors.accentGold }] },
          `${progress}%`
        )
      )
    ),
    // Progress Bar
    React.createElement(
      View,
      {
        style: [
          styles.progressBarBackground,
          { backgroundColor: activeTheme.colors.surfaceElevated }
        ]
      },
      React.createElement(View, {
        style: [
          styles.progressBarFill,
          {
            width: `${progress}%`,
            backgroundColor: goal.isCompleted
              ? activeTheme.colors.success
              : activeTheme.colors.accentGold
          }
        ]
      })
    ),
    // Milestone and Target Date Info
    React.createElement(
      View,
      { style: styles.infoRow },
      goal.currentMilestone &&
        React.createElement(
          Text,
          { style: [styles.milestoneText, { color: activeTheme.colors.textSecondary }] },
          `🎯 ${goal.currentMilestone}`
        ),
      goal.targetDate &&
        React.createElement(
          Text,
          { style: [styles.dateText, { color: activeTheme.colors.textMuted }] },
          `Target: ${goal.targetDate}`
        )
    ),
    // Update Button
    onUpdateGoal &&
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.actionButton,
            {
              backgroundColor: activeTheme.colors.surfaceElevated,
              borderColor: activeTheme.colors.border
            }
          ],
          onPress: () => onUpdateGoal(goal.id),
          activeOpacity: 0.7
        },
        React.createElement(
          Text,
          { style: [styles.actionButtonText, { color: activeTheme.colors.textPrimary }] },
          'Update Goal Progress'
        )
      )
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4
  },
  title: {
    fontWeight: '700'
  },
  percentTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800'
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: '500'
  },
  dateText: {
    fontSize: 11
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600'
  }
});
