/**
 * @myavana/react-native-sdk (JavaScript entry point)
 */

const types = require('./types');
const storage = require('./storage/StorageAdapter');
const telemetry = require('./telemetry/deviceTelemetry');
const stream = require('./client/StreamAdapter');
const errors = require('./client/errors');
const attachments = require('./client/attachments');
const client = require('./client/MyaMobileClient');
const platform = require('./client/MyaPlatformAdapter');
const chatHook = require('./hooks/useMyaChat');
const routeHook = require('./hooks/useMyaRouteSync');
const components = require('./components');
const voice = require('./voice');

module.exports = {
  ...types,
  ...storage,
  ...telemetry,
  ...stream,
  ...errors,
  ...attachments,
  ...client,
  ...platform,
  ...chatHook,
  ...routeHook,
  ...components,
  ...voice
};
