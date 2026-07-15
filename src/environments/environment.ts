// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

// Hardening (context menu / DevTools shortcuts) runs only when production: true.
// Use `ng serve --configuration=production` to test it locally.
export const environment = {
  production: false,
  // API_URL: 'http://localhost:5000',
  API_URL: 'https://api.moneycrafttrader.com',
  /** Live Checkout key id (must match RAZORPAY_KEY_ID on the API server). */
  RAZORPAY_KEY_ID: 'rzp_live_SfJpxnRZwkAFD2'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
