import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCcw, ZoomIn, ZoomOut, Move, Check, Camera, Upload } from 'lucide-react';

interface PhotoEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (croppedImage: string) => void;
  imageUrl?: string;
}

export default function PhotoEditor({ isOpen, onClose, onSave, imageUrl }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  
  const cropSize = 200; // Square crop area

  useEffect(() => {
    if (imageUrl && isOpen) {
      loadImage(imageUrl);
    }
  }, [imageUrl, isOpen]);

  const loadImage = (src: string) => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      // Center the image initially
      const canvas = canvasRef.current;
      if (canvas) {
        const centerX = (canvas.width - img.width * scale) / 2;
        const centerY = (canvas.height - img.height * scale) / 2;
        setPosition({ x: centerX, y: centerY });
      }
    };
    img.src = src;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        loadImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        loadImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    );

    // Draw crop overlay
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const cropX = centerX - cropSize / 2;
    const cropY = centerY - cropSize / 2;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, cropSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw crop circle border
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, cropSize / 2, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw crop guidelines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(cropX, centerY - cropSize / 6);
    ctx.lineTo(cropX + cropSize, centerY - cropSize / 6);
    ctx.moveTo(cropX, centerY + cropSize / 6);
    ctx.lineTo(cropX + cropSize, centerY + cropSize / 6);
    ctx.stroke();
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(centerX - cropSize / 6, cropY);
    ctx.lineTo(centerX - cropSize / 6, cropY + cropSize);
    ctx.moveTo(centerX + cropSize / 6, cropY);
    ctx.lineTo(centerX + cropSize / 6, cropY + cropSize);
    ctx.stroke();
    
    ctx.setLineDash([]);
  };

  useEffect(() => {
    drawCanvas();
  }, [image, position, scale]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setInitialPosition(position);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    
    setPosition({
      x: initialPosition.x + deltaX,
      y: initialPosition.y + deltaY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    const canvas = canvasRef.current;
    if (canvas && image) {
      const centerX = (canvas.width - image.width) / 2;
      const centerY = (canvas.height - image.height) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return;

    cropCanvas.width = cropSize;
    cropCanvas.height = cropSize;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sourceX = centerX - cropSize / 2 - position.x;
    const sourceY = centerY - cropSize / 2 - position.y;

    // Draw the cropped portion
    cropCtx.drawImage(
      image,
      sourceX / scale,
      sourceY / scale,
      cropSize / scale,
      cropSize / scale,
      0,
      0,
      cropSize,
      cropSize
    );

    // Create circular mask
    cropCtx.globalCompositeOperation = 'destination-in';
    cropCtx.beginPath();
    cropCtx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, 2 * Math.PI);
    cropCtx.fill();

    const croppedImageUrl = cropCanvas.toDataURL('image/png');
    onSave(croppedImageUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1A1B3E] text-white">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[#2A2B5E] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Edit Profile Photo</h2>
        <button
          onClick={handleSave}
          disabled={!image}
          className="p-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Check className="w-5 h-5" />
        </button>
      </div>

      {/* Photo Selection Options */}
      {!image && (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-white">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Add Profile Photo</h3>
            <p className="text-gray-400">Choose how you'd like to add your photo</p>
          </div>
          
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center space-x-3 bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg p-4 min-w-[200px] transition-colors"
            >
              <Camera className="w-6 h-6" />
              <span>Take Photo</span>
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center space-x-3 bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg p-4 min-w-[200px] transition-colors"
            >
              <Upload className="w-6 h-6" />
              <span>Choose from Gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* Canvas Editor */}
      {image && (
        <>
          <div className="flex-1 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="border border-gray-600 rounded-lg"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Instructions */}
          <div className="px-4 py-2 text-center">
            <p className="text-gray-400 text-sm">
              Drag to position • Use zoom controls to adjust size
            </p>
          </div>

          {/* Control Panel */}
          <div className="bg-[#1A1B3E] p-4 space-y-4">
            {/* Zoom Controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handleZoomOut}
                className="p-3 bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg transition-colors"
              >
                <ZoomOut className="w-5 h-5 text-white" />
              </button>
              
              <div className="flex items-center space-x-2 text-white">
                <span className="text-sm">{Math.round(scale * 100)}%</span>
              </div>
              
              <button
                onClick={handleZoomIn}
                className="p-3 bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg transition-colors"
              >
                <ZoomIn className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg transition-colors text-white"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-4 py-2 bg-[#2A2B5E] hover:bg-[#3A3B6E] rounded-lg transition-colors text-white"
              >
                <Upload className="w-4 h-4" />
                <span>Change Photo</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleCameraCapture}
        className="hidden"
      />
    </div>
  );
}