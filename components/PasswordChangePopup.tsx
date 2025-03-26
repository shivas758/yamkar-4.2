import { useState } from "react";
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
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/ui/use-toast";

interface PasswordChangePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const PasswordChangePopup: React.FC<PasswordChangePopupProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  // Reset form function
  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setStatus("idle");
    setErrorMessage("");
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus("error");
      setErrorMessage("All fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setErrorMessage("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setStatus("error");
      setErrorMessage("New password must be at least 6 characters");
      return;
    }
    
    try {
      // First step: Verify current password by getting the current user's email
      setStatus("verifying");
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) {
        console.error("Error getting user:", userError);
        setStatus("error");
        setErrorMessage("Authentication error. Please try logging in again.");
        return;
      }
      
      // Verify the current password works by attempting to sign in
      const email = user.email;
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: currentPassword
      });
      
      if (signInError) {
        console.error("Verification failed:", signInError);
        setStatus("error");
        setErrorMessage("Current password is incorrect");
        return;
      }
      
      // Successfully verified current password, now update to new password
      setStatus("loading");
      
      // Using a manual timeout to prevent UI getting stuck
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Request timed out")), 10000)
      );
      
      try {
        // Race between password update and timeout
        await Promise.race([
          (async () => {
            // Update password
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
          })(),
          timeoutPromise
        ]);
        
        // If we get here, the password was updated successfully
        // First clear the form fields before showing success state to avoid flashing an empty form
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Then update status to success
        setStatus("success");
        
        // Success message
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully. Please log out and log back in with your new password.",
          duration: 5000,
        });
        
        // Close dialog after a longer delay so user can see the success message
        setTimeout(() => onClose(), 4000);
      
      } catch (error: any) {
        console.error("Password update error:", error);
        
        if (error.message === "Request timed out") {
          // Special case for timeout - the password might have been updated
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setStatus("success");
          
          toast({
            title: "Password May Be Updated",
            description: "The request timed out, but your password may have been changed. Please try logging out and back in with your new password.",
            duration: 5000,
          });
          
          // Close after a longer delay
          setTimeout(() => onClose(), 4000);
        } else {
          setStatus("error");
          setErrorMessage(error.message || "Failed to update password");
        }
      }
      
    } catch (error: any) {
      console.error("Error during password change:", error);
      setStatus("error");
      setErrorMessage(error.message || "An unexpected error occurred");
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    if (status !== "loading" && status !== "verifying") {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and a new password.
          </DialogDescription>
        </DialogHeader>
        
        {status === "success" ? (
          <div className="py-6 space-y-4">
            <div className="flex flex-col items-center justify-center text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-lg font-medium">Password Updated Successfully</h3>
              <p className="text-sm text-gray-500">
                Your password has been changed. For security reasons, please log out and log back in with your new password.
              </p>
              <Button 
                onClick={onClose}
                className="mt-4 bg-[#228B22] hover:bg-[#1a6b1a] w-full"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={status === "loading" || status === "verifying"}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={status === "loading" || status === "verifying"}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={status === "loading" || status === "verifying"}
              />
            </div>
            
            {status === "error" && (
              <div className="text-sm text-red-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errorMessage}
              </div>
            )}
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleDialogClose}
                disabled={status === "loading" || status === "verifying"}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit"
                disabled={status === "loading" || status === "verifying"}
                className="bg-[#228B22] hover:bg-[#1a6b1a]"
              >
                {status === "verifying" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : "Update Password"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PasswordChangePopup; 