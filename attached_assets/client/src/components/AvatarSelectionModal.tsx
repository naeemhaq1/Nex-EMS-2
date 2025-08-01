import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Crop, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AvatarOption {
  id: string;
  name: string;
  url: string;
  category: string;
}

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  employeeCode: string;
  currentAvatar?: string;
}

export function AvatarSelectionModal({ 
  isOpen, 
  onClose, 
  employeeId, 
  employeeCode,
  currentAvatar 
}: AvatarSelectionModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cameraImage, setCameraImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch avatar options
  const { data: avatarOptions = [], isLoading } = useQuery<AvatarOption[]>({
    queryKey: ['/api/avatar/options'],
    enabled: isOpen
  });

  // Avatar selection mutation
  const selectAvatarMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return apiRequest(`/api/avatar/select/${employeeId}`, {
        method: 'POST',
        body: JSON.stringify({
          optionId,
          employeeCode
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Avatar updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update avatar", variant: "destructive" });
    }
  });

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return fetch(`/api/avatar/upload/${employeeId}`, {
        method: 'POST',
        body: formData
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Photo uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Camera access denied", variant: "destructive" });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(video, -video.videoWidth / 2, -video.videoHeight / 2);
        ctx.restore();
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCameraImage(imageData);
        
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setCameraActive(false);
      }
    }
  };

  const handleSavePhoto = async (imageData: string) => {
    try {
      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      
      uploadPhotoMutation.mutate(formData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to process image", variant: "destructive" });
    }
  };

  const groupedOptions = (avatarOptions as AvatarOption[]).reduce((acc: Record<string, AvatarOption[]>, option: AvatarOption) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1A1B3E] border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Select Avatar or Upload Photo
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="avatars" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#2A2B5E]">
            <TabsTrigger value="avatars" className="text-white data-[state=active]:bg-blue-600">
              Choose Avatar
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-white data-[state=active]:bg-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </TabsTrigger>
            <TabsTrigger value="camera" className="text-white data-[state=active]:bg-blue-600">
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatars" className="space-y-4">
            {isLoading ? (
              <div className="text-center text-white">Loading avatar options...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedOptions).map(([category, options]) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold text-white mb-3">{category}</h3>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {options.map((option) => (
                        <Card 
                          key={option.id}
                          className={`cursor-pointer transition-all hover:scale-105 ${
                            selectedOptionId === option.id
                              ? 'ring-2 ring-blue-500 bg-blue-600/20'
                              : 'bg-[#2A2B5E] hover:bg-[#3A3B6E]'
                          }`}
                          onClick={() => setSelectedOptionId(option.id)}
                        >
                          <CardContent className="p-2 text-center">
                            <img 
                              src={option.url} 
                              alt={option.name}
                              className="w-16 h-16 mx-auto rounded-full mb-2"
                            />
                            <p className="text-xs text-gray-300 truncate">{option.name}</p>
                            {selectedOptionId === option.id && (
                              <Check className="w-4 h-4 text-green-400 mx-auto mt-1" />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
                
                {selectedOptionId && (
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-600">
                    <Button 
                      variant="outline" 
                      onClick={onClose}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => selectAvatarMutation.mutate(selectedOptionId)}
                      disabled={selectAvatarMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {selectAvatarMutation.isPending ? 'Saving...' : 'Save Avatar'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300 mb-4">Click to upload or drag and drop</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Choose File
              </Button>
            </div>

            {uploadedImage && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Preview & Adjust</h3>
                  <div className="relative inline-block">
                    <img 
                      src={uploadedImage}
                      alt="Upload preview"
                      className="max-w-xs max-h-64 rounded-lg"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                    className="bg-gray-600 text-white hover:bg-gray-700"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                    className="bg-gray-600 text-white hover:bg-gray-700"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRotation(rotation + 90)}
                    className="bg-gray-600 text-white hover:bg-gray-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setUploadedImage(null)}
                    className="bg-gray-600 text-white hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleSavePhoto(uploadedImage)}
                    disabled={uploadPhotoMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {uploadPhotoMutation.isPending ? 'Uploading...' : 'Save Photo'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="camera" className="space-y-4">
            <div className="text-center">
              {!cameraActive && !cameraImage && (
                <div className="space-y-4">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto" />
                  <p className="text-gray-300">Take a photo with your camera</p>
                  <Button 
                    onClick={startCamera}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Camera
                  </Button>
                </div>
              )}

              {cameraActive && (
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="max-w-md mx-auto rounded-lg"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                    }}
                  />
                  
                  <div className="flex justify-center space-x-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRotation(rotation + 90)}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button 
                    onClick={capturePhoto}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
                  </Button>
                </div>
              )}

              {cameraImage && (
                <div className="space-y-4">
                  <img 
                    src={cameraImage}
                    alt="Captured photo"
                    className="max-w-xs mx-auto rounded-lg"
                  />
                  
                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCameraImage(null);
                        startCamera();
                      }}
                      className="bg-gray-600 text-white hover:bg-gray-700"
                    >
                      Retake
                    </Button>
                    <Button 
                      onClick={() => handleSavePhoto(cameraImage)}
                      disabled={uploadPhotoMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {uploadPhotoMutation.isPending ? 'Saving...' : 'Save Photo'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}