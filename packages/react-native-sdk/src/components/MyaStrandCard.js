/**
 * MyaStrandCard (JavaScript implementation)
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { View, Text, StyleSheet } = require('./nativePrimitives');

function renderTraitItem(label, value, theme) {
  return React.createElement(
    View,
    {
      key: label,
      style: [styles.traitBox, { backgroundColor: theme.colors.surfaceElevated }]
    },
    React.createElement(
      Text,
      {
        style: [
          styles.traitLabel,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyBold || 'Archivo-Bold'
          }
        ]
      },
      label.toUpperCase()
    ),
    React.createElement(
      Text,
      {
        style: [
          styles.traitValue,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSizeMedium,
            fontFamily: theme.typography.fontFamilyMedium || 'Archivo-Medium'
          }
        ]
      },
      String(value)
    )
  );
}

function MyaStrandCard(props) {
  const { strandData = {}, theme = {} } = props;
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
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(
        View,
        null,
        React.createElement(
          Text,
          {
            style: [
              styles.badge,
              {
                color: activeTheme.colors.accent || activeTheme.colors.accentGold,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          'HAIRID™ STRAND DNA'
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.title,
              {
                color: activeTheme.colors.textPrimary,
                fontSize: activeTheme.typography.fontSizeTitle,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold',
                letterSpacing: activeTheme.typography.letterSpacingHeading ?? -0.3
              }
            ]
          },
          strandData.hairType ? `Type ${strandData.hairType} Profile` : 'Hair Profile Analysis'
        )
      ),
      React.createElement(
        View,
        {
          style: [
            styles.scoreCircle,
            {
              backgroundColor: activeTheme.colors.surfaceElevated,
              borderColor: activeTheme.colors.accent || activeTheme.colors.accentGold
            }
          ]
        },
        React.createElement(
          Text,
          {
            style: [
              styles.scoreNumber,
              {
                color: activeTheme.colors.accent || activeTheme.colors.accentGold,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          String(healthScore)
        ),
        React.createElement(
          Text,
          {
            style: [
              styles.scoreLabel,
              {
                color: activeTheme.colors.textMuted,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          'HEALTH'
        )
      )
    ),
    React.createElement(View, {
      style: [styles.divider, { backgroundColor: activeTheme.colors.border }]
    }),
    React.createElement(
      View,
      { style: styles.traitsGrid },
      renderTraitItem('Porosity', strandData.porosity || 'Medium', activeTheme),
      renderTraitItem('Density', strandData.density || 'High', activeTheme),
      renderTraitItem('Elasticity', strandData.elasticity || 'Normal', activeTheme),
      renderTraitItem('Thickness', strandData.strandThickness || 'Coarse', activeTheme)
    ),
    strandData.recommendedProducts && strandData.recommendedProducts.length > 0 &&
      React.createElement(
        View,
        { style: styles.productsContainer },
        React.createElement(
          Text,
          {
            style: [
              styles.sectionTitle,
              {
                color: activeTheme.colors.textSecondary,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
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
              {
                style: [
                  styles.productName,
                  {
                    color: activeTheme.colors.textPrimary,
                    fontFamily: activeTheme.typography.fontFamilyMedium || 'Archivo-Medium'
                  }
                ]
              },
              prod.name
            ),
            prod.brand &&
              React.createElement(
                Text,
                {
                  style: [
                    styles.productBrand,
                    {
                      color: activeTheme.colors.textMuted,
                      fontFamily: activeTheme.typography.fontFamilyRegular || 'Archivo-Regular'
                    }
                  ]
                },
                prod.brand
              )
          )
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
    alignItems: 'center'
  },
  badge: {
    fontSize: 10,
    fontFamily: 'Archivo-Bold',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4
  },
  title: {
    fontFamily: 'Archivo-Bold',
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
    fontFamily: 'Archivo-Bold',
    fontWeight: '800',
    lineHeight: 20
  },
  scoreLabel: {
    fontSize: 8,
    fontFamily: 'Archivo-Bold',
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
    fontFamily: 'Archivo-Bold',
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5
  },
  traitValue: {
    fontFamily: 'Archivo-Medium',
    fontWeight: '600'
  },
  productsContainer: {
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Archivo-Bold',
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
    fontFamily: 'Archivo-Medium',
    fontWeight: '500',
    flex: 1
  },
  productBrand: {
    fontSize: 12,
    fontFamily: 'Archivo-Regular',
    marginLeft: 8
  }
});

module.exports = {
  MyaStrandCard
};
