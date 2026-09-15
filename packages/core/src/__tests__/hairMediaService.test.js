const { HairMediaService } = require("../hairMedia/hairMediaService");
const { BlockType } = require("../chatProtocol");

describe("HairMediaService", () => {
  test("getAllAssets returns all verified assets", () => {
    const assets = HairMediaService.getAllAssets();
    expect(Array.isArray(assets)).toBe(true);
    expect(assets.length).toBeGreaterThanOrEqual(60);
  });

  test("getAssetById returns correct asset or null", () => {
    const asset = HairMediaService.getAssetById("media_curl_4c_macro_001");
    expect(asset).not.toBeNull();
    expect(asset.id).toBe("media_curl_4c_macro_001");
    expect(asset.hair_attributes.type).toBe("4C");

    const notFound = HairMediaService.getAssetById("non_existent_asset_xyz");
    expect(notFound).toBeNull();
  });

  test("getMediaForHairType filters accurately for 4C and 1A", () => {
    const coily4c = HairMediaService.getMediaForHairType("4C");
    expect(coily4c.length).toBeGreaterThan(0);
    expect(coily4c.some(a => a.hair_attributes?.type === "4C")).toBe(true);

    const straight1a = HairMediaService.getMediaForHairType("1A");
    expect(straight1a.length).toBeGreaterThan(0);
    expect(straight1a[0].hair_attributes?.type === "1A");
  });

  test("getMediaForHairstyle matches protective hairstyles", () => {
    const bantuKnots = HairMediaService.getMediaForHairstyle("bantu knots");
    expect(bantuKnots.length).toBeGreaterThan(0);
    expect(bantuKnots[0].id).toBe("media_style_bantu_knots_019");

    const flatTwists = HairMediaService.getMediaForHairstyle("flat_twists");
    expect(flatTwists.length).toBeGreaterThan(0);
    expect(flatTwists[0].id).toBe("media_style_flat_twists_curls_023");
  });

  test("getMediaForDiagnostic finds microscopic anatomy assets", () => {
    const cuticleResults = HairMediaService.getMediaForDiagnostic("cuticle");
    expect(cuticleResults.length).toBeGreaterThan(0);
    expect(cuticleResults.some(a => a.subcategory === "cuticle_architecture")).toBe(true);

    const semResults = HairMediaService.getMediaForDiagnostic("sem");
    expect(semResults.length).toBeGreaterThan(0);
  });

  test("searchMedia performs scored multi-field search", () => {
    const results = HairMediaService.searchMedia("traction alopecia tension");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain("traction");

    const styleResults = HairMediaService.searchMedia("locs", { category: "hairstyles" });
    expect(styleResults.length).toBeGreaterThan(0);
    expect(styleResults.every(a => a.category === "hairstyles")).toBe(true);
  });

  test("formatMediaBlock formats asset into valid BlockType.MEDIA_CARD", () => {
    const asset = HairMediaService.getAssetById("media_curl_4c_macro_001");
    const block = HairMediaService.formatMediaBlock(asset, BlockType.MEDIA_CARD);

    expect(block.id).toBe("block_media_curl_4c_macro_001");
    expect(block.type).toBe("media_card");
    expect(block.data.title).toBe(asset.title);
    expect(block.data.imageUrl).toBe(asset.source_url);
    expect(block.data.attribution).toBe(asset.author_attribution);
    expect(block.data.license).toBe(asset.license);
    expect(block.data.hairType).toBe("4C");
  });
});
