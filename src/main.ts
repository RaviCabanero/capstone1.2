import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(async () => {
    // Hide splash screen after app loads (if Capacitor is available)
    setTimeout(async () => {
      try {
        // Check if Capacitor is available in window
        const capacitor = (window as any).Capacitor;
        
        if (capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform()) {
          // Use the global Capacitor SplashScreen if available
          if (capacitor.Plugins && capacitor.Plugins.SplashScreen) {
            capacitor.Plugins.SplashScreen.hide().catch((err: any) => console.log('Splash screen error:', err));
          }
        }
      } catch (e) {
        // Capacitor not available in development mode
        console.log('Capacitor SplashScreen not available');
      }
    }, 100);
  })
  .catch((err: any) => console.log(err));


