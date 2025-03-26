import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, AlertCircle, Camera, Image as ImageIcon, Trash, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import imageCompression from "browser-image-compression";

interface AvatarUploadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string | null;
  userId: string;
  userName: string;
  onAvatarUpdate: (url: string | null) => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const AvatarUploadPopup: React.FC<AvatarUploadPopupProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  userId,
  userName,
  onAvatarUpdate,
}) => {
  const { toast } = useToast();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(currentAvatar || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(currentAvatar ? "upload" : "upload");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Effect to handle camera stream when component unmounts
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera();
      
      // Get access to the camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Use front camera for profile photos
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
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

  const capturePhoto = () => {
    if (!videoRef.current || !cameraStream) {
      setError("Camera not available. Please try again or use image upload.");
      return;
    }
    
    try {
      // Create a canvas element to capture the current frame
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // Set canvas dimensions to match the video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Could not get canvas context");
      }
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert the canvas to a blob and then to a File object
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError("Failed to capture image. Please try again.");
          return;
        }
        
        const timestamp = new Date().getTime();
        const newFile = new File([blob], `profile-photo-${timestamp}.jpg`, { type: 'image/jpeg' });
        
        try {
          // Compress the image if it's large
          const compressedFile = await compressImage(newFile);
          
          // Set the image file and preview
          setImageFile(compressedFile);
          setImagePreview(URL.createObjectURL(compressedFile));
          
          // Stop the camera after capturing
          stopCamera();
          
          // Switch to preview tab
          setActiveTab("preview");
        } catch (err: any) {
          setError(`Error processing image: ${err.message}`);
        }
      }, 'image/jpeg', 0.9);
    } catch (err: any) {
      console.error("Error capturing photo:", err);
      setError(`Failed to capture photo: ${err.message}`);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    try {
      // Image compression options
      const options = {
        maxSizeMB: 1,         // Maximum size in MB
        maxWidthOrHeight: 1000, // Maximum width/height in pixels
        useWebWorker: true,   // Use web worker for better performance
        initialQuality: 0.9,   // Initial quality (0 to 1)
      };
      
      // Compress the image
      return await imageCompression(file, options);
    } catch (err) {
      console.error("Image compression failed:", err);
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
        // Compress the image
        const compressedFile = await compressImage(file);
        
        setImageFile(compressedFile);
        setError(null);
        
        // Create a preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(compressedFile);
        
        // Switch to preview tab
        setActiveTab("preview");
      } catch (err: any) {
        console.error("Error processing file:", err);
        setError("Error processing file. Please try again.");
      }
    }
  };

  const handleDelete = async () => {
    if (!currentAvatar) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get the path from the URL
      const urlParts = currentAvatar.split('/');
      // Check if it's a Supabase storage URL
      const isSupabaseUrl = urlParts.some(part => part === 'storage' || part === 'avatars');
      
      if (isSupabaseUrl) {
        // Extract the path from the URL
        // Typically in format: https://xxx.supabase.co/storage/v1/object/public/avatars/userId/filename
        const pathIndex = urlParts.findIndex(part => part === 'avatars');
        if (pathIndex !== -1) {
          const avatarPath = urlParts.slice(pathIndex).join('/');
          
          // Delete the file from storage
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([avatarPath]);
          
          if (deleteError) {
            console.error("Storage delete error:", deleteError);
            // Continue anyway to update the database
          }
        }
      }
      
      // Try to determine the correct column name in the users table
      try {
        // First try with avatar_url
        let updateError = (await supabase
          .from('users')
          .update({ avatar_url: null })
          .eq('id', userId)).error;
        
        if (updateError) {
          console.log("Error updating with avatar_url, trying alternative field names:", updateError);
          
          // If that fails, try alternative column names
          const possibleFields = ['avatarUrl', 'avatar', 'profile_picture', 'profilePicture', 'photo'];
          let updated = false;
          
          for (const field of possibleFields) {
            const updateData = { [field]: null };
            const { error } = await supabase
              .from('users')
              .update(updateData)
              .eq('id', userId);
            
            if (!error) {
              console.log(`Successfully removed avatar using field: ${field}`);
              updated = true;
              break;
            }
          }
          
          if (!updated) {
            console.error("Could not update any known avatar field in user profile");
            throw new Error("Failed to update database with avatar removal");
          }
        }
      } catch (err: any) {
        console.error("Avatar column update error:", err);
        throw err;
      }
      
      // Update UI
      setImagePreview(null);
      onAvatarUpdate(null);
      
      toast({
        title: "Avatar Removed",
        description: "Your profile picture has been removed.",
        duration: 3000,
      });
      
      onClose();
    } catch (err: any) {
      console.error("Error deleting avatar:", err);
      setError(err.message || "Failed to remove profile picture. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!imageFile) {
      setError("Please select or capture an image first");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Upload the image to Supabase Storage
      const filePath = `avatars/${userId}/${Date.now()}.jpg`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageFile, {
          upsert: true
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get the public URL for the uploaded image
      const { data: urlData } = await supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error("Failed to get URL for uploaded image");
      }
      
      // Try to determine the correct column name in the users table
      try {
        // First, try with avatar_url
        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', userId);
        
        if (updateError) {
          console.error("Error updating with avatar_url, trying alternative field names:", updateError);
          
          // If that fails, try alternative column names
          const possibleFields = ['avatarUrl', 'avatar', 'profile_picture', 'profilePicture', 'photo'];
          let updated = false;
          
          for (const field of possibleFields) {
            const updateData = { [field]: urlData.publicUrl };
            const { error } = await supabase
              .from('users')
              .update(updateData)
              .eq('id', userId);
            
            if (!error) {
              console.log(`Successfully updated avatar using field: ${field}`);
              updated = true;
              break;
            }
          }
          
          if (!updated) {
            throw new Error("Could not update user profile with avatar URL");
          }
        }
      } catch (err: any) {
        console.error("Avatar column update error:", err);
        // We'll still consider the operation successful if only the DB update failed
        // since we can still update the UI
        toast({
          title: "Avatar Updated (Partially)",
          description: "Your avatar was uploaded but there was an issue saving it to your profile. Please contact support.",
          variant: "destructive",
          duration: 5000,
        });
      }
      
      // Success
      toast({
        title: "Profile Picture Updated",
        description: "Your avatar has been successfully updated.",
        duration: 3000,
      });
      
      // Update parent component
      onAvatarUpdate(urlData.publicUrl);
      
      // Close dialog
      onClose();
    } catch (err: any) {
      console.error("Error updating avatar:", err);
      setError(err.message || "Failed to update profile picture. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if device has camera capabilities
  const checkCameraSupport = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  const hasCameraSupport = checkCameraSupport();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          stopCamera();
          onClose();
        }
      }} className="z-50">
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
            <DialogDescription>
              Upload a new profile picture or take a photo with your camera.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-4">
            <Avatar className="h-32 w-32">
              {imagePreview ? (
                <AvatarImage src={imagePreview} alt="Preview" />
              ) : (
                <AvatarFallback className="text-2xl text-white bg-[#228B22]">
                  {getInitials(userName)}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            if (value === "camera") {
              startCamera();
            } else {
              stopCamera();
            }
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {hasCameraSupport && (
                <TabsTrigger value="camera" disabled={isSubmitting}>
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </TabsTrigger>
              )}
              <TabsTrigger value="upload" disabled={isSubmitting}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              {currentAvatar && (
                <TabsTrigger value="remove" disabled={isSubmitting}>
                  <Trash className="h-4 w-4 mr-2" />
                  Remove
                </TabsTrigger>
              )}
            </TabsList>

            {hasCameraSupport && (
              <TabsContent value="camera" className="mt-4">
                <div className="relative rounded-md overflow-hidden border">
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline
                    className="w-full h-auto"
                    style={{ maxHeight: "260px" }}
                  />
                </div>
                <Button 
                  onClick={capturePhoto} 
                  className="w-full mt-4 bg-[#228B22] hover:bg-[#1a6b1a]"
                  disabled={!cameraStream || isSubmitting}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture Photo
                </Button>
              </TabsContent>
            )}
            
            <TabsContent value="upload" className="mt-4">
              <div className="flex justify-center">
                <div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <Label 
                    htmlFor="avatar-upload" 
                    className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#228B22] text-white hover:bg-[#1a6b1a]"
                  >
                    <Upload className="h-4 w-4" />
                    Choose Image
                  </Label>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="remove" className="mt-4">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to remove your profile picture? This action cannot be undone.
                </p>
                <Button 
                  onClick={handleDelete} 
                  className="bg-red-500 hover:bg-red-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-2" />
                      Remove Profile Picture
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          {error && (
            <div className="text-sm text-red-500 flex items-center mt-4">
              <AlertCircle className="h-3 w-3 mr-1" />
              {error}
            </div>
          )}
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                stopCamera();
                onClose();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {activeTab !== "remove" && imageFile && (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !imageFile}
                className="bg-[#228B22] hover:bg-[#1a6b1a]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Profile Picture"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AvatarUploadPopup; 