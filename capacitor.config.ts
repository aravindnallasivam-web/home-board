import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homeboard.walltablet',
  appName: 'Home Board',
  webDir: 'dist',
  android: {
    backgroundColor: '#14181f',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_board',
      iconColor: '#F2B544',
    },
  },
};

export default config;
