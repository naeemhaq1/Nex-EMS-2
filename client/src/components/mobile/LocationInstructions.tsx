import React from 'react';
import { Smartphone, Monitor, Settings, Globe } from 'lucide-react';

interface DeviceInfo {
  type: 'iOS' | 'Android' | 'Desktop' | 'Unknown';
  browser: string;
}

const LocationInstructions: React.FC = () => {
  const detectDevice = (): DeviceInfo => {
    const userAgent = navigator.userAgent;
    let type: DeviceInfo['type'] = 'Unknown';
    let browser = 'Unknown';

    // Detect device type
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      type = 'iOS';
    } else if (/Android/.test(userAgent)) {
      type = 'Android';
    } else if (!/Mobi|Android/i.test(userAgent)) {
      type = 'Desktop';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Replit')) browser = 'Replit App';

    return { type, browser };
  };

  const deviceInfo = detectDevice();

  const getInstructions = () => {
    switch (deviceInfo.type) {
      case 'iOS':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-red-300">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium">iOS Device - Location Settings:</span>
            </div>
            <div className="text-xs text-red-200 space-y-1 ml-6">
              <div>1. Go to <strong>Settings</strong> → <strong>Privacy & Security</strong></div>
              <div>2. Tap <strong>Location Services</strong></div>
              <div>3. Find <strong>{deviceInfo.browser}</strong> in the list</div>
              <div>4. Select <strong>While Using App</strong> or <strong>Always</strong></div>
              <div className="text-xs text-yellow-300 mt-2">
                💡 If using Replit app, ensure location permission is enabled
              </div>
            </div>
          </div>
        );

      case 'Android':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-red-300">
              <Smartphone className="w-4 h-4" />
              <span className="font-medium">Android Device - Location Settings:</span>
            </div>
            <div className="text-xs text-red-200 space-y-1 ml-6">
              <div>1. Go to <strong>Settings</strong> → <strong>Apps</strong></div>
              <div>2. Find <strong>{deviceInfo.browser}</strong></div>
              <div>3. Tap <strong>Permissions</strong> → <strong>Location</strong></div>
              <div>4. Select <strong>Allow all the time</strong> or <strong>Allow only while using the app</strong></div>
              <div className="text-xs text-yellow-300 mt-2">
                💡 Alternative: Settings → Location → App permissions
              </div>
            </div>
          </div>
        );

      case 'Desktop':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-red-300">
              <Monitor className="w-4 h-4" />
              <span className="font-medium">Desktop Browser - Location Settings:</span>
            </div>
            <div className="text-xs text-red-200 space-y-1 ml-6">
              {deviceInfo.browser === 'Chrome' && (
                <>
                  <div>1. Click the <strong>🔒 Lock icon</strong> in the address bar</div>
                  <div>2. Set <strong>Location</strong> to <strong>Allow</strong></div>
                  <div>3. Refresh the page</div>
                </>
              )}
              {deviceInfo.browser === 'Firefox' && (
                <>
                  <div>1. Click the <strong>🔒 Shield icon</strong> in the address bar</div>
                  <div>2. Click <strong>Permissions</strong> → Enable <strong>Location</strong></div>
                  <div>3. Refresh the page</div>
                </>
              )}
              {deviceInfo.browser === 'Safari' && (
                <>
                  <div>1. Safari menu → <strong>Preferences</strong> → <strong>Websites</strong></div>
                  <div>2. Select <strong>Location</strong> → Find this site</div>
                  <div>3. Change to <strong>Allow</strong></div>
                </>
              )}
              {!['Chrome', 'Firefox', 'Safari'].includes(deviceInfo.browser) && (
                <>
                  <div>1. Look for <strong>🔒 location icon</strong> in address bar</div>
                  <div>2. Click and select <strong>Allow location access</strong></div>
                  <div>3. Refresh the page if needed</div>
                </>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-red-300">
              <Settings className="w-4 h-4" />
              <span className="font-medium">Enable Location Access:</span>
            </div>
            <div className="text-xs text-red-200 space-y-1 ml-6">
              <div>1. Check your browser settings</div>
              <div>2. Allow location permissions for this site</div>
              <div>3. Refresh the page</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
      {getInstructions()}
      
      <div className="mt-3 pt-2 border-t border-red-500/30">
        <div className="flex items-center space-x-2 text-xs text-red-200">
          <Globe className="w-3 h-3" />
          <span>Detected: {deviceInfo.type} • {deviceInfo.browser}</span>
        </div>
      </div>
    </div>
  );
};

export default LocationInstructions;