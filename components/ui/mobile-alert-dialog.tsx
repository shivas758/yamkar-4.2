"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { Capacitor } from '@capacitor/core'

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const MobileAlertDialog = AlertDialogPrimitive.Root

const MobileAlertDialogTrigger = AlertDialogPrimitive.Trigger

const MobileAlertDialogPortal = AlertDialogPrimitive.Portal

const MobileAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
MobileAlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const MobileAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => {
  const isNative = React.useMemo(() => Capacitor.isNativePlatform(), []);
  
  return (
    <MobileAlertDialogPortal>
      <MobileAlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-50 grid w-[95%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg rounded-lg",
          // Different positioning for mobile native vs browser
          isNative 
            ? "left-[2.5%] top-[30vh] max-w-full" 
            : "left-[50%] top-[50%] max-w-lg translate-x-[-50%] translate-y-[-50%]",
          className
        )}
        {...props}
      />
    </MobileAlertDialogPortal>
  )
})
MobileAlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const MobileAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
MobileAlertDialogHeader.displayName = "MobileAlertDialogHeader"

const MobileAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
MobileAlertDialogFooter.displayName = "MobileAlertDialogFooter"

const MobileAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
MobileAlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const MobileAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
MobileAlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

const MobileAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
MobileAlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const MobileAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
MobileAlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  MobileAlertDialog,
  MobileAlertDialogPortal,
  MobileAlertDialogOverlay,
  MobileAlertDialogTrigger,
  MobileAlertDialogContent,
  MobileAlertDialogHeader,
  MobileAlertDialogFooter,
  MobileAlertDialogTitle,
  MobileAlertDialogDescription,
  MobileAlertDialogAction,
  MobileAlertDialogCancel,
} 