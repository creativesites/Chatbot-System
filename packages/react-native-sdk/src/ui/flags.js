/** Remote feature flags for the UI (kill switch). Defaults: everything on. */
import { createContext, useContext } from 'react';
import { DEFAULT_FLAGS } from '../ops/remoteFlags';

export const MyaFlagsContext = createContext(DEFAULT_FLAGS);
export const MyaFlagsProvider = MyaFlagsContext.Provider;
export const useMyaFlags = () => useContext(MyaFlagsContext);
