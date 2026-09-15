/**
 * Hair Media & Hairstyle Taxonomy Service
 *
 * Provides semantic discovery, filtering, and block formatting over the 35 verified
 * textured hair and strand diagnostic media assets (Andre Walker 1A-4C, SEM microscopy,
 * protective hairstyles, and regimen demonstrations).
 */

const path = require('path');
const fs = require('fs');

let catalogCache = null;

function loadCatalog() {
  if (catalogCache) return catalogCache;
  try {
    const catalogPath = path.resolve(__dirname, '../../data/hair_media_catalog.json');
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf8');
      catalogCache = JSON.parse(raw);
      return catalogCache;
    }
  } catch (err) {
    console.warn('[HairMediaService] Could not load catalog from disk:', err.message);
  }
  catalogCache = [];
  return catalogCache;
}

/** Escape a term for safe use inside a RegExp. */
function escapeRegExp(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whole-word, case-insensitive matcher for a search term. Underscores count as
 * word characters in JS regex, so style tags like `bantu_knots` still match
 * their individual words via the explicit underscore boundaries.
 */
function wordMatcher(term) {
  const t = escapeRegExp(term);
  return new RegExp(`(?:^|[^a-z0-9])${t}(?:[^a-z0-9]|$)`, 'i');
}

/**
 * Score every catalog asset against pre-split search terms, best first.
 *
 * Title and exact style-tag hits score high; a hit anywhere in the asset's
 * body text scores 1. That weak body match is deliberately permissive for
 * search - a query like "protective style for the gym" should still surface
 * something - but it means almost any phrase containing a common word like
 * "hairstyle" matches *something*. Callers that must not guess (repairing a
 * fabricated card) pass a higher `minScore`.
 *
 * @param {string[]} terms lowercased search terms, each longer than 1 char
 * @param {{category?: string, minScore?: number}} options
 * @returns {{asset: object, score: number}[]}
 */
function scoreAssets(terms, options = {}) {
  const { category, minScore = 1 } = options;
  const assets = loadCatalog();

  return assets
    .filter((a) => (category ? a.category === category : true))
    .map((a) => {
      let score = 0;
      const fullText = [
        a.id,
        a.title,
        a.category,
        a.subcategory,
        a.description,
        a.educational_notes,
        ...(a.style_tags || []),
        a.hair_attributes?.type || '',
        a.hair_attributes?.porosity_relevance || ''
      ]
        .join(' ')
        .toLowerCase();

      for (const term of terms) {
        // Whole-word matching, not substring. "not" is a substring of "knots",
        // so plain includes() scored a title hit on Bantu Knots for the phrase
        // "not a hairstyle" - enough to swap that photo onto an unrelated
        // card. Short common words made this fire constantly.
        const word = wordMatcher(term);
        if (word.test(a.title)) score += 5;
        if ((a.style_tags || []).some((t) => t.toLowerCase() === term)) score += 4;
        if (word.test(a.subcategory)) score += 3;
        if (word.test(fullText)) score += 1;
      }

      return { asset: a, score };
    })
    .filter((item) => (terms.length === 0 ? true : item.score >= minScore))
    .sort((x, y) => y.score - x.score);
}

const HairMediaService = {
  /**
   * Return all verified assets in the catalog.
   */
  getAllAssets() {
    return loadCatalog();
  },

  /**
   * Retrieve a single asset by unique identifier.
   */
  getAssetById(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    const assets = loadCatalog();
    return assets.find((a) => a.id.toLowerCase() === cleanId) || null;
  },

  /**
   * Filter assets by Andre Walker hair type (e.g., '4C', '4B', '3A', '1A').
   */
  getMediaForHairType(hairType, limit = 5) {
    if (!hairType) return [];
    const typeClean = String(hairType).toUpperCase().trim();
    const assets = loadCatalog();

    return assets
      .filter((a) => {
        const typeAttr = a.hair_attributes?.type || '';
        const inTags = (a.style_tags || []).some((t) => t.toUpperCase() === typeClean);
        return typeAttr.toUpperCase().includes(typeClean) || inTags;
      })
      .slice(0, limit);
  },

  /**
   * Filter assets by hairstyle (e.g. 'bantu_knots', 'cornrows', 'box_braids', 'flat_twists', 'afro', 'twist_out', 'locs').
   */
  getMediaForHairstyle(styleName, limit = 5) {
    if (!styleName) return [];
    const term = String(styleName).toLowerCase().replace(/[\s-]+/g, '_').trim();
    const assets = loadCatalog();

    return assets
      .filter((a) => {
        if (a.category !== 'hairstyles') return false;
        const sub = (a.subcategory || '').toLowerCase();
        const title = (a.title || '').toLowerCase();
        const tags = (a.style_tags || []).map((t) => t.toLowerCase());
        return (
          sub.includes(term) ||
          title.includes(term.replace(/_/g, ' ')) ||
          tags.some((t) => t.includes(term) || term.includes(t))
        );
      })
      .slice(0, limit);
  },

  /**
   * Filter assets by microscopic anatomy or diagnostic criteria (e.g. 'cuticle', 'sem', 'porosity', 'split_ends', 'follicle', 'scalp').
   */
  getMediaForDiagnostic(diagnosticType, limit = 5) {
    if (!diagnosticType) return [];
    const term = String(diagnosticType).toLowerCase().trim();
    const assets = loadCatalog();

    return assets
      .filter((a) => {
        if (a.category !== 'microscopic_anatomy') return false;
        const sub = (a.subcategory || '').toLowerCase();
        const title = (a.title || '').toLowerCase();
        const tags = (a.style_tags || []).map((t) => t.toLowerCase());
        const desc = (a.description || '').toLowerCase();
        return (
          sub.includes(term) ||
          title.includes(term) ||
          tags.some((t) => t.includes(term)) ||
          desc.includes(term)
        );
      })
      .slice(0, limit);
  },

  /**
   * Keyword and semantic tag search across the entire catalog.
   */
  searchMedia(query, options = {}) {
    const { category, limit = 5 } = options;
    if (!query && !category) return [];

    const terms = (query || '')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const assets = loadCatalog();

    return scoreAssets(terms, { category, minScore: 1 })
      .map((item) => item.asset)
      .slice(0, limit);
  },

  /**
   * True when `url` is an image that actually exists in the verified catalog.
   *
   * Models sometimes emit a hairstyle_card or media_card with an invented
   * imageUrl instead of calling searchHairMedia - the weaker fallback models
   * do it often. A fabricated photo is worse than no photo: it shows the user
   * a marketing banner or an unrelated image under a hairstyle's name. This
   * lets the server check any URL against the catalog before it goes out.
   */
  isVerifiedImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().toLowerCase();
    if (!clean) return false;
    return loadCatalog().some(
      (a) =>
        (a.source_url && String(a.source_url).trim().toLowerCase() === clean) ||
        (a.thumbnail_url && String(a.thumbnail_url).trim().toLowerCase() === clean)
    );
  },

  /**
   * Best catalog asset for a free-text label (a card's title or caption), so a
   * block carrying a fabricated image can be repaired with a real one rather
   * than simply losing its picture.
   */
  findAssetForText(text, options = {}) {
    if (!text || typeof text !== 'string') return null;

    const terms = text.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
    if (terms.length === 0) return null;

    // MIN_REPAIR_SCORE of 4 means the label must hit an asset's title or an
    // exact style tag. A body-text match alone (score 1) is not enough:
    // "zzzz not a hairstyle zzzz" body-matches the word "hairstyle" on most of
    // the catalog and would otherwise swap an arbitrary photo onto the card.
    // Showing no image beats showing the wrong one.
    const MIN_REPAIR_SCORE = 4;
    const ranked = scoreAssets(terms, { ...options, minScore: MIN_REPAIR_SCORE });
    return ranked.length > 0 ? ranked[0].asset : null;
  },

  /**
   * Formats a catalog asset into a canonical wire BlockType object.
   */
  formatMediaBlock(asset, blockType = 'media_card') {
    if (!asset) return null;
    return {
      id: `block_${asset.id}`,
      type: blockType,
      data: {
        id: asset.id,
        title: asset.title,
        category: asset.category,
        subcategory: asset.subcategory,
        imageUrl: asset.source_url,
        sourceUrl: asset.source_url,
        pageUrl: asset.page_url,
        resolution: asset.resolution,
        format: asset.format,
        hairType: asset.hair_attributes?.type || null,
        porosity: asset.hair_attributes?.porosity_relevance || null,
        caption: asset.description,
        educationalNotes: asset.educational_notes,
        attribution: asset.author_attribution,
        license: asset.license,
        tags: asset.style_tags || []
      }
    };
  }
};

module.exports = {
  HairMediaService,
  hairMediaService: HairMediaService
};
