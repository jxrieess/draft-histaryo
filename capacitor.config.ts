import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'histaryo-f',
  webDir: 'www',
  plugins: {
    CapacitorCamera: {
      permissions: {
        camera: {
          description: 'This app requires access to your camera for scanning QR codes'
        }
      }
    },
     Geolocation: {
      permissions: ['location']
    }
  }
};

export default config;
