globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// react-test-renderer prints a deprecation notice per render; it is the lightest
// renderer that needs no native runtime, so keep it and silence only that notice.
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) return;
  origError(...args);
};
