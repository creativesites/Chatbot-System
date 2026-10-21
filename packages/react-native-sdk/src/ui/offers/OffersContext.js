/**
 * What a service_offer card needs from its surroundings, supplied by MyaChat.
 * Kept in one context so the card stays a pure presenter of what the server
 * sent: it never picks a service, never decides routing, never talks to a store.
 */

import { createContext, useContext } from 'react';

/**
 * @typedef {object} OffersApi
 * @property {object|null} storage                 for dismissals
 * @property {string[]} entitlements               services the member owns
 * @property {{track:Function, offerShown:Function}} tracker
 * @property {(offer:object)=>boolean} canHandle   can the host fulfil this offer's route?
 * @property {(offer:object)=>Promise<{status:string}>} openPaywall  native purchase
 * @property {(url:string, offer:object)=>Promise<void>} openLink    in-app browser
 * @property {(offer:object)=>void} onPurchaseCompleted
 */

export const MyaOffersContext = createContext(null);
export const MyaOffersProvider = MyaOffersContext.Provider;
export const useMyaOffers = () => useContext(MyaOffersContext);
