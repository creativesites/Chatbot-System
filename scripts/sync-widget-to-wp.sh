#!/usr/bin/env bash
# ==============================================================================
# sync-widget-to-wp.sh
# Synchronizes packages/widget/src/myavana-widget.js to the WordPress plugin
# with strict pre- and post-sync SHA-256 integrity verification.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SOURCE_FILE="${REPO_ROOT}/packages/widget/src/myavana-widget.js"
WP_PLUGIN_DIR="${WP_PLUGIN_DIR:-/Users/winstonzulu/Local Sites/myavana-hair-journey/app/public/wp-content/plugins/myavana-hair-journey-next}"
DEST_FILE="${WP_PLUGIN_DIR}/assets/js/myavana-widget.js"

echo "========================================================"
echo "  MYAVANA WIDGET <-> WORDPRESS SYNC & INTEGRITY CHECK"
echo "========================================================"

if [[ ! -f "${SOURCE_FILE}" ]]; then
    echo "❌ Error: Source widget file not found at ${SOURCE_FILE}"
    exit 1
fi

if [[ ! -d "${WP_PLUGIN_DIR}" ]]; then
    echo "⚠️ Warning: Target WordPress plugin directory not found at ${WP_PLUGIN_DIR}"
    echo "Skipping physical file copy (verification only)."
    exit 0
fi

SRC_HASH=$(shasum -a 256 "${SOURCE_FILE}" | awk '{print $1}')
echo "📦 Source Widget SHA-256: ${SRC_HASH}"

if [[ -f "${DEST_FILE}" ]]; then
    DEST_HASH=$(shasum -a 256 "${DEST_FILE}" | awk '{print $1}')
    echo "🎯 Target Widget SHA-256: ${DEST_HASH}"
    if [[ "${SRC_HASH}" == "${DEST_HASH}" ]]; then
        echo "✅ Widget files are already in sync. No copy needed."
        exit 0
    else
        echo "⚠️ Hashes diverge! Synchronizing source to WordPress plugin..."
    fi
else
    echo "ℹ️ Target widget file does not exist. Creating..."
fi

mkdir -p "$(dirname "${DEST_FILE}")"
cp -f "${SOURCE_FILE}" "${DEST_FILE}"

NEW_DEST_HASH=$(shasum -a 256 "${DEST_FILE}" | awk '{print $1}')
if [[ "${SRC_HASH}" != "${NEW_DEST_HASH}" ]]; then
    echo "❌ Post-sync verification failed! Hashes do not match."
    exit 1
fi

echo "✅ Sync successful and verified!"
echo "   Source: ${SOURCE_FILE}"
echo "   Target: ${DEST_FILE}"
echo "   Hash:   ${NEW_DEST_HASH}"
