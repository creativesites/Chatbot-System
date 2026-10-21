# @myavana/react-native-sdk

Mya for the MYAVANA app: a headless streaming client and hook, and the Mya conversation UI.

```js
// Headless: client, hook, protocol, errors, attachments. No react-native import.
import { useMyaChat, MyaMobileClient, AsyncStorageAdapter } from '@myavana/react-native-sdk';

// UI: the full conversation screen and its building blocks.
import { MyaChat } from '@myavana/react-native-sdk/ui';
```

## Minimal usage

```jsx
<MyaChat
  apiBase="https://your-mya-api"          // required: there is no default
  storage={new AsyncStorageAdapter(AsyncStorage)}
  userId={member.id}                      // the host's id always wins over any stored id
  userName={member.firstName}
  getAuthToken={() => AsyncStorage.getItem('token')}
  screen={{ name: 'Dashboard', title: 'Dashboard' }}
  starters={[{ id: 'a', label: 'Plan wash day', prompt: 'Walk me through my wash day.' }]}
  getContext={(extra) => ({ ...appContext, ...extra })}
  onBack={() => navigation.goBack()}
  onBlockAction={(action, payload) => handled}   // return true if you handled it
  launchCamera={...} launchImageLibrary={...}    // picker must return base64 (includeBase64: true)
  photosInChat                                   // one flag; false removes photo attach
  menuItems={[{ key, icon, title, subtitle, onPress }]}
>
  {({ send }) => <YourModals />}
</MyaChat>
```

On logout call `client.clearSession()` (or `clearSession()` from the hook) so the next member never inherits the previous member's conversation.

## Peer dependencies
`react`, `react-native`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-vector-icons`.

## Rules the SDK keeps
- MYAVANA sells services, not hair products. Product blocks from the server render nothing (`SUPPRESSED_TYPES`).
- No hard-coded prices and no invented values: a card shows only what the server sends, and a missing measurement reads "Not yet analysed".
- A photo is context for Mya, never an in-app analysis. Photos that can't be read are rejected before any request.
- Unknown block types render a generic card, never a blank.

## Tests
```bash
npm test          # headless suite + UI suite
```
UI tests run against stubbed react-native (see `__mocks__/ui`); layout, gestures and native animation need a device.
