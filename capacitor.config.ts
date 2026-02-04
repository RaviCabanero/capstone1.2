import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.adelante.alumni',
  appName: 'Adelante Alumni',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'centerCrop',
      showSpinner: false,
      spinnerColor: '#ffffff'
    }
  }
};

export default config;
