/**
 * MyaStrandCard
 *
 * Themeable mobile HairID Strand DNA card primitive.
 * Displays hair health score, strand metrics (porosity, density, texture),
 * and personalized product guidance.
 */

import React from 'react';
import { HairStrandData } from '../types';
import { defaultMyaTheme, MyaTheme } from './theme';
import { StyleSheet, Text, View } from './nativePrimitives';

export interface MyaStrandCardProps {
  strandData: HairStrandData;
  theme?: Partial<MyaTheme>;
  onProductPress?: (product: any) => void;
}

export function MyaStrandCard({ strandData, theme = {} }: MyaStrandCardProps) {
  const activeTheme = { ...defaultMyaTheme, ...theme };
  const healthScore = strandData.overallHealthScore ?? 88;

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
          { style: [styles.badge, { color: activeTheme.colors.accentGold }] },
          'HAIRID™ STRAND DNA'
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
          strandData.hairType ? `Type ${strandData.hairType} Profile` : 'Hair Profile Analysis'
        )
      ),
      // Health Score Badge
      React.createElement(
        View,
        {
          style: [
            styles.scoreCircle,
            {
              backgroundColor: activeTheme.colors.surfaceElevated,
              borderColor: activeTheme.colors.accentGold
            }
          ]
        },
        React.createElement(
          Text,
          { style: [styles.scoreNumber, { color: activeTheme.colors.accentGold }] },
          String(healthScore)
        ),
        React.createElement(
          Text,
          { style: [styles.scoreLabel, { color: activeTheme.colors.textMuted }] },
          'HEALTH'
        )
      )
    ),
    // Divider
    React.createElement(View, {
      style: [styles.divider, { backgroundColor: activeTheme.colors.border }]
    }),
    // 2x2 Strand Traits Grid
    React.createElement(
      View,
      { style: styles.traitsGrid },
      renderTraitItem(
        'Porosity',
        strandData.porosity || 'Medium',
        activeTheme
      ),
      renderTraitItem(
        'Density',
        strandData.density || 'High',
        activeTheme
      ),
      renderTraitItem(
        'Elasticity',
        strandData.elasticity || 'Normal',
        activeTheme
      ),
      renderTraitItem(
        'Thickness',
        strandData.strandThickness || 'Coarse',
        activeTheme
      )
    ),
    // Recommended Products
    strandData.recommendedProducts && strandData.recommendedProducts.length > 0 &&
      React.createElement(
        View,
        { style: styles.productsContainer },
        React.createElement(
          Text,
          {
            style: [
              styles.sectionTitle,
              { color: activeTheme.colors.textSecondary }
            ]
          },
          'MATCHED PRODUCT REGIMEN'
        ),
        ...strandData.recommendedProducts.slice(0, 3).map((prod, idx) =>
          React.createElement(
            View,
            {
              key: prod.id || `prod_${idx}`,
              style: [styles.productRow, { borderBottomColor: activeTheme.colors.border }]
            },
            React.createElement(
              Text,
              { style: [styles.productName, { color: activeTheme.colors.textPrimary }] },
              prod.name
            ),
            prod.brand &&
              React.createElement(
                Text,
                { style: [styles.productBrand, { color: activeTheme.colors.textMuted }] },
                prod.brand
              )
          )
        )
      )
  );
}

function renderTraitItem(label: string, value: string, theme: MyaTheme) {
  return React.createElement(
    View,
    {
      key: label,
      style: [styles.traitBox, { backgroundColor: theme.colors.surfaceElevated }]
    },
    React.createElement(
      Text,
      { style: [styles.traitLabel, { color: theme.colors.textMuted }] },
      label.toUpperCase()
    ),
    React.createElement(
      Text,
      {
        style: [
          styles.traitValue,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSizeMedium
          }
        ]
      },
      value
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
    alignItems: 'center'
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4
  },
  title: {
    fontWeight: '700'
  },
  scoreCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  divider: {
    height: 1,
    marginVertical: 12
  },
  traitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  traitBox: {
    width: '48%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8
  },
  traitLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5
  },
  traitValue: {
    fontWeight: '600'
  },
  productsContainer: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  productBrand: {
    fontSize: 12,
    marginLeft: 8
  }
});
