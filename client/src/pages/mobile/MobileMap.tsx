import { MapPin, Navigation, Users } from 'lucide-react';

export default function MobileMap() {
  return (
    <div className="min-h-screen bg-[#1A1B3E] pb-32">
      {/* Header */}
      <div className="bg-[#2A2B5E] border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Employee Map</h1>
            <p className="text-gray-400 text-sm">Real-time employee locations</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm">Live</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="p-4">
        <div className="bg-[#2A2B5E] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Locations</h2>
            <span className="text-blue-400 text-sm">24 employees</span>
          </div>
          
          {/* Map Placeholder */}
          <div className="bg-gray-800 rounded-lg h-64 flex items-center justify-center mb-4">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">Interactive map will be displayed here</p>
            </div>
          </div>

          {/* Location Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
              <div className="text-green-400 text-xl font-bold">18</div>
              <div className="text-gray-400 text-xs">In Office</div>
            </div>
            <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
              <div className="text-blue-400 text-xl font-bold">6</div>
              <div className="text-gray-400 text-xs">In Field</div>
            </div>
            <div className="bg-[#1A1B3E] rounded-lg p-3 text-center">
              <div className="text-orange-400 text-xl font-bold">3</div>
              <div className="text-gray-400 text-xs">In Transit</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#2A2B5E] rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">Recent Location Updates</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">Ahmad Ali</p>
                <p className="text-gray-400 text-xs">Arrived at Main Office - 2 min ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <Navigation className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">Sara Khan</p>
                <p className="text-gray-400 text-xs">En route to Site-A - 5 min ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">Hassan Ahmed</p>
                <p className="text-gray-400 text-xs">Checked in at Site-B - 8 min ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}