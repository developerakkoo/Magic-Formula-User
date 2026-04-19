import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

// Disable console.log, warn, and debug in production to avoid leaking info and reduce noise
if (environment.production) {
  window.console.log = () => {};
  window.console.warn = () => {};
  window.console.debug = () => {};
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
