/**
 * MyaMediaCard (CommonJS)
 *
 * Renders verified visual media assets for hair types (Andre Walker 1A-4C),
 * protective hairstyles, microscopic trichology/SEM diagnostics, and regimens.
 * Includes legal attribution badge, educational science notes, and interaction handlers.
 */

const React = require("react");
const { defaultMyaTheme } = require("./theme");
const { View, Text, Image, TouchableOpacity, StyleSheet } = require("./nativePrimitives");

function MyaMediaCard(props) {
  const media = props.media || props.mediaData || props.data || {};
  const activeTheme = { ...defaultMyaTheme, ...props.theme };

  const title = media.title || "Visual Strand Reference";
  const category = media.category || "hair_media";
  const subcategory = media.subcategory || "";
  const imageUrl = media.imageUrl || media.image || media.image_url || media.url || media.sourceUrl || media.source_url;
  const hairType = media.hairType || media.hair_attributes?.type;
  const caption = media.caption || media.description;
  const educationalNotes = media.educationalNotes || media.educational_notes;
  const attribution = media.attribution || media.author_attribution || "MYAVANA Research";
  const license = media.license || "Verified Reference";
  const tags = media.tags || media.style_tags || [];

  const handlePress = () => {
    if (typeof props.onPressMedia === "function") {
      props.onPressMedia(media);
    } else if (typeof props.onPressAction === "function") {
      props.onPressAction("view_media", media);
    }
  };

  const categoryLabel = (category || "")
    .replace(/_/g, " ")
    .toUpperCase();

  const eyebrow = hairType
    ? `${categoryLabel} • TYPE ${hairType}`
    : categoryLabel;

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
    // Category Eyebrow & Subcategory Tag
    React.createElement(
      View,
      { style: styles.headerRow },
      React.createElement(
        Text,
        {
          style: [
            styles.eyebrow,
            {
              color: activeTheme.colors.accent,
              fontFamily: activeTheme.typography.fontFamilyBold
            }
          ]
        },
        eyebrow
      ),
      subcategory
        ? React.createElement(
            View,
            {
              style: [
                styles.subTag,
                { backgroundColor: activeTheme.colors.surfaceElevated }
              ]
            },
            React.createElement(
              Text,
              {
                style: [
                  styles.subTagText,
                  {
                    color: activeTheme.colors.textSecondary,
                    fontFamily: activeTheme.typography.fontFamilySemiBold
                  }
                ]
              },
              subcategory.replace(/_/g, " ")
            )
          )
        : null
    ),

    // Hero Image Container
    imageUrl
      ? React.createElement(
          View,
          { style: styles.imageContainer },
          React.createElement(Image, {
            source: { uri: imageUrl },
            style: styles.image,
            resizeMode: "cover"
          })
        )
      : null,

    // Title
    React.createElement(
      Text,
      {
        style: [
          styles.title,
          {
            color: activeTheme.colors.textPrimary,
            fontFamily: activeTheme.typography.fontFamilyBold,
            fontSize: activeTheme.typography.fontSizeTitle
          }
        ]
      },
      title
    ),

    // Caption
    caption
      ? React.createElement(
          Text,
          {
            style: [
              styles.caption,
              {
                color: activeTheme.colors.textSecondary,
                fontFamily: activeTheme.typography.fontFamilyRegular,
                fontSize: activeTheme.typography.fontSizeMedium
              }
            ]
          },
          caption
        )
      : null,

    // Educational Science Notes Callout (Scientific Taxonomy)
    educationalNotes
      ? React.createElement(
          View,
          {
            style: [
              styles.notesBox,
              {
                backgroundColor: activeTheme.colors.surfaceElevated,
                borderLeftColor: activeTheme.colors.accent
              }
            ]
          },
          React.createElement(
            Text,
            {
              style: [
                styles.notesText,
                {
                  color: activeTheme.colors.textPrimary,
                  fontFamily: activeTheme.typography.fontFamilyRegular,
                  fontSize: activeTheme.typography.fontSizeSmall
                }
              ]
            },
            `🔬 Science Note: ${educationalNotes}`
          )
        )
      : null,

    // Style Tags
    tags && tags.length > 0
      ? React.createElement(
          View,
          { style: styles.tagsRow },
          tags.slice(0, 4).map((t, i) =>
            React.createElement(
              View,
              {
                key: `${t}_${i}`,
                style: [
                  styles.tagPill,
                  { backgroundColor: activeTheme.colors.surfaceElevated }
                ]
              },
              React.createElement(
                Text,
                {
                  style: [
                    styles.tagText,
                    {
                      color: activeTheme.colors.textMuted,
                      fontFamily: activeTheme.typography.fontFamilyMedium
                    }
                  ]
                },
                `#${t.replace(/_/g, "-")}`
              )
            )
          )
        )
      : null,

    // Attribution & Legal Pill
    React.createElement(
      View,
      {
        style: [
          styles.attributionRow,
          { borderTopColor: activeTheme.colors.border }
        ]
      },
      React.createElement(
        Text,
        {
          style: [
            styles.attributionText,
            {
              color: activeTheme.colors.textMuted,
              fontFamily: activeTheme.typography.fontFamilyRegular
            }
          ],
          numberOfLines: 1
        },
        `📷 ${attribution} (${license})`
      ),
      React.createElement(
        TouchableOpacity,
        {
          style: [
            styles.actionButton,
            { backgroundColor: activeTheme.colors.primary }
          ],
          onPress: handlePress
        },
        React.createElement(
          Text,
          {
            style: [
              styles.actionButtonText,
              {
                color: activeTheme.colors.userBubbleText,
                fontFamily: activeTheme.typography.fontFamilyBold
              }
            ]
          },
          "View Details"
        )
      )
    )
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Archivo-Bold",
    letterSpacing: 1
  },
  subTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  subTagText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Archivo-SemiBold",
    textTransform: "capitalize"
  },
  imageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F5F5F7",
    marginBottom: 10
  },
  image: {
    width: "100%",
    height: "100%"
  },
  title: {
    fontWeight: "700",
    fontFamily: "Archivo-Bold",
    lineHeight: 22,
    marginBottom: 6
  },
  caption: {
    fontFamily: "Archivo-Regular",
    lineHeight: 20,
    marginBottom: 8
  },
  notesBox: {
    borderLeftWidth: 3,
    padding: 10,
    borderRadius: 8,
    marginVertical: 8
  },
  notesText: {
    fontStyle: "italic",
    fontFamily: "Archivo-Regular",
    lineHeight: 18
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 6
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  tagText: {
    fontSize: 10,
    fontWeight: "500",
    fontFamily: "Archivo-Medium"
  },
  attributionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8
  },
  attributionText: {
    fontSize: 10,
    fontFamily: "Archivo-Regular",
    flex: 1,
    marginRight: 8
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Archivo-Bold"
  }
});

module.exports = { MyaMediaCard };
