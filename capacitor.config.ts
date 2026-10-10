import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ahmaduwaida.kalo',
  appName: 'Kalo',
  webDir: 'dist',
  ios: { backgroundColor: '#15120d', contentInset: 'never' },
  plugins: { CapacitorHttp: { enabled: true } },
};

export default config;
