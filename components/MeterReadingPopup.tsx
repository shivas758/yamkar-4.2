import { useState, useEffect, useRef } from "react";
import {
  MobileDialog,
  MobileDialogContent,
  MobileDialogDescription,
  MobileDialogFooter,
  MobileDialogHeader,
  MobileDialogTitle,
} from "@/components/ui/mobile-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle, AlertCircle, Info, Camera, Image as ImageIcon, MapPin, X } from "lucide-react";
import { supabase, checkStorageBucket } from "@/lib/supabaseClient";
import imageCompression from "browser-image-compression";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useGeolocation } from "@/hooks/useGeolocation";

interface MeterReadingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reading: number, imageUrl: string | null, location?: { latitude: number, longitude: number }) => Promise<void>;
  type: "check-in" | "check-out";
  userId: string;
}

const MeterReadingPopup: React.FC<MeterReadingPopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  userId,
}) => {
  const [meterReading, setMeterReading] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [submissionStage, setSubmissionStage] = useState<string | null>(null);
  const [bucketStatus, setBucketStatus] = useState<{ exists: boolean; checked: boolean }>({ 
    exists: false, 
    checked: false 
  });
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shareLocation, setShareLocation] = useState<boolean>(true);
  
  // Get the user's geolocation
  const geolocation = useGeolocation();

  // Check if the bucket exists when the component mounts
  useEffect(() => {
    if (isOpen) {
      checkBucketExists();
    }
    
    // Cleanup function to stop camera when component unmounts
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Effect to handle camera stream when tab changes or dialog closes
  useEffect(() => {
    if (activeTab === "camera" && isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    // Ensure camera is stopped when dialog closes
    return () => {
      stopCamera();
    };
  }, [activeTab, isOpen]);

  // Additional effect to ensure camera is stopped when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        stopCamera();
      }
    };
  }, []);

  const checkBucketExists = async () => {
    try {
      const result = await checkStorageBucket('meter-readings');
      console.log("[DEBUG] Bucket check result:", result);
      setBucketStatus({ exists: result.exists, checked: true });
      
      if (!result.exists) {
        console.log("[DEBUG] Bucket does not exist, setting error");
        setError(result.error || "Storage configuration issue. Please contact support. You can still submit readings without images.");
      } else {
        console.log("[DEBUG] Bucket exists or is assumed to exist");
      }
    } catch (err: any) {
      console.error("[DEBUG] Error checking storage bucket:", err);
      setBucketStatus({ exists: true, checked: true }); // Assume bucket exists on error
      setError("Storage check failed. You can still submit readings without images.");
    }
  };

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera();
      
      // Get access to the camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use the back camera if available
        audio: false
      });
      
      // Store the stream and set it as the source for the video element
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setError(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError(`Camera access error: ${err.message}. Please try using image upload instead.`);
      setActiveTab("upload");
    }
  };

  const stopCamera = () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (err) {
            console.error("Error stopping camera track:", err);
          }
        });
        setCameraStream(null);
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.load(); // Force cleanup
        }
      }
    } catch (err) {
      console.error("Error in stopCamera:", err);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraStream) {
      setError("Camera not available. Please try again or use image upload.");
      return;
    }
    
    try {
      // Create a canvas element to capture the current frame
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert the canvas to a data URL and then to a File object
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError("Failed to capture image. Please try again.");
          return;
        }
        
        const timestamp = new Date().getTime();
        const newFile = new File([blob], `camera-capture-${timestamp}.jpg`, { type: 'image/jpeg' });
        
        // Compress the image if it's large
        let fileToUse = newFile;
        if (newFile.size > 500 * 1024) {
          fileToUse = await compressImage(newFile);
        }
        
        // Set the image file and preview
        setImageFile(fileToUse);
        setImagePreview(URL.createObjectURL(fileToUse));
        setCompressionStatus("Photo captured successfully");
        
        // Stop the camera after capturing
        stopCamera();
        
        // Switch to preview tab
        setActiveTab("preview");
      }, 'image/jpeg', 0.8);
    } catch (err: any) {
      console.error("Error capturing photo:", err);
      setError(`Failed to capture photo: ${err.message}`);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    setCompressionStatus("Compressing image...");
    
    try {
      // Image compression options
      const options = {
        maxSizeMB: 2,         // Maximum size in MB
        maxWidthOrHeight: 1920, // Maximum width/height in pixels
        useWebWorker: true,   // Use web worker for better performance
        initialQuality: 0.8,   // Initial quality (0 to 1)
      };
      
      // Compress the image
      const compressedFile = await imageCompression(file, options);
      
      // Get compression ratio for status message
      const ratio = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
      if (file.size > compressedFile.size) {
        setCompressionStatus(`Compressed by ${ratio}% (${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB)`);
      } else {
        setCompressionStatus("Image already optimized");
      }
      
      return compressedFile;
    } catch (err) {
      console.error("Image compression failed:", err);
      setError("Image compression failed. Uploading original image.");
      return file; // Return original file if compression fails
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validate file is an image
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }
      
      try {
        // Compress image if it's larger than 500KB
        let fileToUse = file;
        if (file.size > 500 * 1024) {
          fileToUse = await compressImage(file);
        } else {
          setCompressionStatus("Image is already small enough");
        }
        
        setImageFile(fileToUse);
        setError(null);
        
        // Create a preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(fileToUse);
        
        // Switch to preview tab
        setActiveTab("preview");
      } catch (err) {
        console.error("Error processing file:", err);
        setError("Error processing file. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent default form submission behavior
    e.preventDefault();
    
    console.log("[DEBUG] Submit button clicked in MeterReadingPopup");
    
    if (!meterReading || isNaN(Number(meterReading))) {
      setError("Please enter a valid meter reading");
      return;
    }

    // If already submitting, prevent duplicate submissions
    if (isSubmitting) {
      console.log("[DEBUG] Already submitting, ignoring click");
      return;
    }

    // Stop camera if it's running to free up resources during submission
    stopCamera();

    // If the bucket status hasn't been checked yet, check it now
    if (!bucketStatus.checked) {
      await checkBucketExists();
    }

    // Update state to show we're submitting
    setIsSubmitting(true);
    setSubmissionStage("Preparing submission...");
    setError(null);

    try {
      let imageUrl: string | null = null;

      // Only attempt to upload if a file was selected and bucket exists
      if (imageFile && bucketStatus.exists) {
        setSubmissionStage("Uploading image...");
        
        try {
          // Generate a unique path for the image
          const timestamp = new Date().getTime();
          const fileExtension = imageFile.name.split('.').pop() || 'jpg';
          const filePath = `odometer/${userId}/${type}-${timestamp}.${fileExtension}`;

          console.log("[DEBUG] Uploading image to path:", filePath);
          
          // Try uploading with a timeout
          const uploadPromise = supabase.storage
            .from('meter-readings')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: false
            });
            
          // Set a timeout for the upload
          const timeoutPromise = new Promise<any>((_, reject) => {
            setTimeout(() => reject(new Error('Upload timed out')), 15000);
          });
          
          // Race the upload against the timeout
          const { data: uploadData, error: uploadError } = await Promise.race([
            uploadPromise,
            timeoutPromise
          ]);

          if (uploadError) {
            console.error("[DEBUG] Upload error:", uploadError);
            setSubmissionStage("Continuing without image due to upload error");
            // Continue without image
          } else if (uploadData) {
            console.log("[DEBUG] Upload successful, getting public URL");
            // Get the public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
              .from('meter-readings')
              .getPublicUrl(filePath);

            imageUrl = publicUrl;
            console.log("[DEBUG] Image public URL:", imageUrl);
            setSubmissionStage("Image uploaded successfully");
          }
        } catch (uploadError) {
          console.error("[DEBUG] Image upload error:", uploadError);
          // Continue without image
          setSubmissionStage("Continuing without image due to upload error");
        }
      }

      // Prepare location data if user has allowed it
      let locationData: { latitude: number, longitude: number } | undefined;
      if (shareLocation && geolocation.latitude && geolocation.longitude) {
        locationData = {
          latitude: geolocation.latitude,
          longitude: geolocation.longitude
        };
        console.log("[DEBUG] Including location data:", locationData);
      }

      // Capture the values we need to submit before potentially resetting state
      const meterReadingValue = Number(meterReading);
      
      // Submit the reading with optional location
      console.log("[DEBUG] Calling onSubmit with:", { 
        meterReading: meterReadingValue, 
        imageUrl, 
        locationData 
      });
      
      setSubmissionStage("Submitting meter reading...");
      
      // Call the parent's onSubmit function
      await onSubmit(meterReadingValue, imageUrl, locationData);
      
      console.log("[DEBUG] onSubmit completed successfully");
      
      // Reset form state
      setMeterReading("");
      setImageFile(null);
      setImagePreview(null);
      
      // Close dialog after successful submission
      onClose();
    } catch (err: any) {
      console.error("[DEBUG] Submission error:", err);
      setError(`Submission failed: ${err?.message || 'Unknown error'}`);
      // Keep the dialog open so the user can try again
    } finally {
      setIsSubmitting(false);
      setSubmissionStage(null);
    }
  };

  // Check if device has camera capabilities
  const checkCameraSupport = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const hasCameraSupport = checkCameraSupport();

  // Ensure cleanup on component unmount
  useEffect(() => {
    // Cleanup timeout to prevent memory leaks
    let submissionTimeout: NodeJS.Timeout | null = null;
    
    // Cleanup function
    return () => {
      if (submissionTimeout) {
        clearTimeout(submissionTimeout);
      }
      
      // Make sure camera is stopped
      stopCamera();
      
      // Clear any checkout in progress flags if this is a checkout operation
      if (type === "check-out" && typeof window !== 'undefined') {
        localStorage.removeItem('checkout_in_progress');
      }
    };
  }, [type]);

  return (
    <MobileDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <MobileDialogContent className="overflow-y-auto max-h-[90vh]">
        <MobileDialogHeader>
          <MobileDialogTitle>
            {type === "check-in" ? "Check-In" : "Check-Out"} Meter Reading
          </MobileDialogTitle>
          <MobileDialogDescription>
            Please enter the current meter reading and take or upload a photo as evidence.
          </MobileDialogDescription>
        </MobileDialogHeader>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 p-3 rounded-md flex items-start space-x-2 text-sm text-red-800 mb-4">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <div className="space-y-4">
          {/* Meter reading input */}
          <div className="space-y-2">
            <Label htmlFor="meterReading" className="text-sm font-medium">
              Meter Reading (km)
            </Label>
            <Input
              id="meterReading"
              type="number"
              min="0"
              step="0.01"
              value={meterReading}
              onChange={(e) => setMeterReading(e.target.value)}
              placeholder="Enter current meter reading"
              className="w-full"
            />
          </div>

          {/* Share location toggle */}
          <div className="flex items-center justify-between space-x-2 py-2">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="share-location" className="text-sm font-medium">
                Share My Location
              </Label>
            </div>
            <Switch
              id="share-location"
              checked={shareLocation}
              onCheckedChange={setShareLocation}
            />
          </div>

          {/* Image upload/capture tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upload">
                <div className="flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </div>
              </TabsTrigger>
              <TabsTrigger value="camera">
                <div className="flex items-center">
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <div className="text-sm text-gray-500">
                    Drag and drop your image here or click to browse
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="camera" className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video">
                {cameraStream ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-3 shadow-lg"
                    >
                      <div className="w-6 h-6 rounded-full border-2 border-gray-800" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-4">
                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 text-center">
                      Click to access your camera
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={startCamera}
                    >
                      Start Camera
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto object-contain max-h-[200px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {compressionStatus && (
                <div className="mt-2 text-xs text-gray-500">
                  <Info className="inline h-3 w-3 mr-1" />
                  {compressionStatus}
                </div>
              )}
            </div>
          )}
        </div>

        <MobileDialogFooter className="sm:justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !meterReading}
            className={isSubmitting ? "opacity-70" : ""}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {submissionStage ?? "Submitting..."}
              </>
            ) : (
              "Submit"
            )}
          </Button>
        </MobileDialogFooter>
      </MobileDialogContent>
    </MobileDialog>
  );
};

export default MeterReadingPopup;