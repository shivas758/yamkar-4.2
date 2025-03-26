import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle, AlertCircle, Info, Camera, Image as ImageIcon, MapPin } from "lucide-react";
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {type === "check-in" ? "Check-in Meter Reading" : "Check-out Meter Reading"}
          </DialogTitle>
          <DialogDescription>
            Please enter the current meter reading of your vehicle
            {type === "check-in" ? " before starting your journey." : "."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="meter-reading">Meter Reading (km)</Label>
            <Input
              id="meter-reading"
              type="number"
              min="0"
              placeholder="Enter current meter reading"
              value={meterReading}
              onChange={(e) => setMeterReading(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Location sharing option */}
          <div className="flex items-center justify-between space-x-2 py-3">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-[#228B22]" />
              <Label htmlFor="share-location" className="text-sm font-medium">
                Share my location
              </Label>
            </div>
            <Switch
              id="share-location"
              checked={shareLocation}
              onCheckedChange={setShareLocation}
              disabled={isSubmitting || !navigator.geolocation}
            />
          </div>
          
          {shareLocation && (
            <div className="text-sm">
              {geolocation.loading ? (
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  Acquiring location...
                </div>
              ) : geolocation.error ? (
                <div className="flex items-center text-destructive">
                  <AlertCircle className="h-3 w-3 mr-2" />
                  {geolocation.error}
                </div>
              ) : geolocation.latitude && geolocation.longitude ? (
                <div className="flex items-center text-muted-foreground">
                  <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                  Location acquired
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground">
                  <Info className="h-3 w-3 mr-2" />
                  No location available
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <Label>Odometer Photo (Optional)</Label>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
              <TabsList className="grid grid-cols-2 mb-2">
                <TabsTrigger value="camera" disabled={isSubmitting || !checkCameraSupport()}>
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </TabsTrigger>
                <TabsTrigger value="preview" disabled={isSubmitting || !imagePreview}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="camera" className="mt-2">
                <div className="flex flex-col gap-2">
                  <div className="relative border border-input rounded-md overflow-hidden bg-black">
                    <video 
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-auto"
                      style={{ maxHeight: "240px" }}
                    ></video>
                  </div>
                  <Button 
                    type="button" 
                    onClick={capturePhoto} 
                    disabled={isSubmitting || !cameraStream}
                    className="mt-2"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Capture Photo
                  </Button>
                  {!hasCameraSupport && (
                    <div className="text-sm text-amber-600 flex items-center mt-2">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Camera not supported on this device
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {imagePreview && (
                <TabsContent value="preview" className="mt-2">
                  <div className="relative rounded-md overflow-hidden border border-input">
                    <img 
                      src={imagePreview} 
                      alt="Odometer preview" 
                      className="w-full h-auto object-contain"
                      style={{ maxHeight: "240px" }}
                    />
                  </div>
                  <div className="text-sm text-green-600 flex items-center mt-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Photo selected
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
          
          {error && (
            <div className="bg-red-50 p-2 rounded-md text-red-600 text-sm flex items-start">
              <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {compressionStatus && !error && (
            <div className="bg-blue-50 p-2 rounded-md text-blue-600 text-sm flex items-start">
              <Info className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              <span>{compressionStatus}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="sm:w-full"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting || !meterReading}
            className="sm:w-full bg-[#228B22] hover:bg-[#1a6b1a]"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {submissionStage || "Processing..."}
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MeterReadingPopup; 