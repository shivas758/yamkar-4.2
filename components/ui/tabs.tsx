"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => {
  // Track if this tab is active
  const [isActive, setIsActive] = React.useState(false);
  const internalRef = React.useRef<HTMLDivElement>(null);
  
  // Use imperative handle to forward ref
  React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement);
  
  // Check data-state attribute to determine if tab is active
  React.useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    
    // Function to check active state
    const checkActive = () => {
      const isCurrentlyActive = el.getAttribute('data-state') === 'active';
      if (isActive !== isCurrentlyActive) {
        setIsActive(isCurrentlyActive);
      }
    };
    
    // Initial check
    checkActive();
    
    // Set up observer for future changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-state') {
          checkActive();
        }
      });
    });
    
    observer.observe(el, { attributes: true });
    
    return () => observer.disconnect();
  }, [isActive]);
  
  // Trigger resize events when tab becomes active
  React.useEffect(() => {
    if (!isActive) return;
    
    // Trigger resize events with delays to ensure maps initialize properly
    const triggerResize = () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    };
    
    // Delayed resize timers with various intervals for better reliability
    const timers = [
      setTimeout(triggerResize, 0),
      setTimeout(triggerResize, 50),
      setTimeout(triggerResize, 200),
      setTimeout(triggerResize, 500),
      setTimeout(triggerResize, 1000)
    ];
    
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isActive]);
  
  return (
    <TabsPrimitive.Content
      ref={internalRef}
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
