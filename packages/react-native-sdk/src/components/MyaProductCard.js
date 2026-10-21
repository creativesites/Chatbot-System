/**
 * MyaProductCard (CommonJS)
 *
 * Renders verified product recommendations matching MYAVANA Hair Journey
 * brand guidelines and luxury aesthetics.
 */

const React = require('react');
const { defaultMyaTheme } = require('./theme');
const { Image, StyleSheet, Text, TouchableOpacity, View } = require('./nativePrimitives');

function formatListText(val) {
  if (Array.isArray(val)) {
    return val.map((v) => String(v == null ? '' : v).trim()).filter(Boolean).join(' • ');
  }
  return typeof val === 'string' ? val : '';
}

function MyaProductCard(props) {
  const product = props.product || props.data || {};
  const activeTheme = Object.assign({}, defaultMyaTheme, props.theme);

  const name = product.name || product.title || 'Recommended Hair Product';
  const brand = product.brand || 'MYAVANA Recommended';
  const category = (product.category || 'Targeted Hair Care').toUpperCase();
  const reason =
    formatListText(product.reason) ||
    formatListText(product.benefits) ||
    formatListText(product.description);
  const price = product.price
    ? typeof product.price === 'number'
      ? `$${product.price.toFixed(2)}`
      : String(product.price)
    : '';
  const imageUrl = product.image || product.imageUrl || product.image_url;

  const handleView = () => {
    if (typeof props.onPressProduct === 'function') {
      props.onPressProduct(product);
    } else if (typeof props.onPressAction === 'function') {
      props.onPressAction('view_product', product);
    }
  };

  const handleFitRoutine = () => {
    if (typeof props.onFitRoutine === 'function') {
      props.onFitRoutine(product);
    } else if (typeof props.onPressAction === 'function') {
      props.onPressAction('fit_into_routine', {
        product,
        prompt: `How would ${name} fit into my hair routine?`
      });
    }
  };

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
    // Header Row: Category Pill & Price
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(
        View,
        {
          style: [
            styles.categoryPill,
            { backgroundColor: activeTheme.colors.sand || activeTheme.colors.surfaceElevated }
          ]
        },
        React.createElement(
          Text,
          {
            style: [
              styles.categoryText,
              {
                color: activeTheme.colors.onyx || activeTheme.colors.textPrimary,
                fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
              }
            ]
          },
          category
        )
      ),
      price
        ? React.createElement(
            Text,
            {
              style: [
                styles.priceText,
                {
                  color: activeTheme.colors.accent || activeTheme.colors.primary,
                  fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
                }
              ]
            },
            price
          )
        : null
    ),
    // Brand & Title
    React.createElement(
      Text,
      {
        style: [
          styles.brandText,
          {
            color: activeTheme.colors.textMuted,
            fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold'
          }
        ]
      },
      brand
    ),
    React.createElement(
      Text,
      {
        style: [
          styles.titleText,
          {
            color: activeTheme.colors.textPrimary,
            fontSize: activeTheme.typography.fontSizeLarge,
            fontFamily: activeTheme.typography.fontFamilyBold || 'Archivo-Bold',
            letterSpacing: activeTheme.typography.letterSpacingHeading ?? -0.3
          }
        ]
      },
      name
    ),
    // Hero Product Image
    imageUrl
      ? React.createElement(
          View,
          { style: styles.imageContainer },
          React.createElement(Image, {
            source: { uri: imageUrl },
            style: styles.image,
            resizeMode: 'cover',
            accessibilityLabel: name
          })
        )
      : null,
    // Reason / Benefits Copy
    reason
      ? React.createElement(
          Text,
          {
            style: [
              styles.reasonText,
              {
                color: activeTheme.colors.textSecondary,
                fontFamily: activeTheme.typography.fontFamilyRegular || 'Archivo-Regular',
                letterSpacing: activeTheme.typography.letterSpacingBody ?? -0.2
              }
            ]
          },
          reason
        )
      : null,
    // Action CTAs
    React.createElement(
      View,
      { style: styles.actionsRow },
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.primaryButton,
            { backgroundColor: activeTheme.colors.primary }
          ],
          onPress: handleView,
          activeOpacity: 0.8
        },
        React.createElement(
          Text,
          {
            style: [
              styles.primaryButtonText,
              {
                color: '#FFFFFF',
                fontFamily: activeTheme.typography.fontFamilySemiBold || 'Archivo-SemiBold'
              }
            ]
          },
          'View Product'
        )
      ),
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.secondaryButton,
            {
              backgroundColor: activeTheme.colors.surfaceElevated,
              borderColor: activeTheme.colors.border
            }
          ],
          onPress: handleFitRoutine,
          activeOpacity: 0.7
        },
        React.createElement(
          Text,
          {
            style: [
              styles.secondaryButtonText,
              {
                color: activeTheme.colors.textPrimary,
                fontFamily: activeTheme.typography.fontFamilyMedium || 'Archivo-Medium'
              }
            ]
          },
          'Fit Into My Routine'
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
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  categoryText: {
    fontSize: 9.5,
    letterSpacing: 0.8
  },
  priceText: {
    fontSize: 14
  },
  brandText: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 2
  },
  titleText: {
    lineHeight: 22,
    marginBottom: 8
  },
  imageContainer: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    height: 150,
    backgroundColor: '#F5F5F7'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  reasonText: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonText: {
    fontSize: 13
  },
  secondaryButton: {
    flex: 1.2,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  secondaryButtonText: {
    fontSize: 12.5
  }
});

module.exports = { MyaProductCard };
