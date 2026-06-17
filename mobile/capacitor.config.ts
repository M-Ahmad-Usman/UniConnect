import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.uniconnect.app',
  appName: 'UniConnect',
  webDir: 'www',
  server: {
    url: 'https://uni-connect.dev',
    allowNavigation: ['uni-connect.dev'],
    cleartext: false,
  },
  android: {
    minWebViewVersion: 60,
    allowMixedContent: false,
    backgroundColor: '#ffffff',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e293b',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e293b',
    },
  },
};

export default config;
