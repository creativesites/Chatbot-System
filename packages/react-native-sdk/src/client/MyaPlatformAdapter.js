/**
 * MyaPlatformAdapter (CommonJS)
 */

let activePlatformAdapter = null;

function registerPlatformAdapter(adapter) {
  activePlatformAdapter = adapter;
}

function getPlatformAdapter() {
  return activePlatformAdapter;
}

function resetPlatformAdapter() {
  activePlatformAdapter = null;
}

module.exports = {
  registerPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter
};
