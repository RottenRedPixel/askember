import * as React from "react";
import { cn } from "@/lib/utils";

const Sheet = ({ children, open, onOpenChange, ...props }) => {
  // Filter out sheet-specific props before spreading to DOM element
  const { open: _, onOpenChange: __, ...domProps } = { open, onOpenChange, ...props };
  
  return (
    <div {...domProps}>
      {React.Children.map(children, child => 
        React.cloneElement(child, { open, onOpenChange })
      )}
    </div>
  );
};

const SheetTrigger = React.forwardRef(({ className, children, asChild, ...props }, ref) => {
  if (asChild) {
    return React.cloneElement(children, {
      ref,
      className: cn(className, children.props.className),
      ...props,
      ...children.props
    });
  }
  
  return (
    <div ref={ref} className={className} {...props}>
      {children}
    </div>
  );
});
SheetTrigger.displayName = "SheetTrigger";

const SheetContent = React.forwardRef(({ 
  className, 
  children, 
  side = "right", 
  open, 
  onOpenChange,
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleClose = () => {
    setIsOpen(false);
    if (onOpenChange) onOpenChange(false);
  };

  if (!isOpen) return null;

  const sideClasses = {
    top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
    bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
    left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
    right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
  };

  // Filter out sheet-specific props before spreading to DOM element
  const { open: _, onOpenChange: __, side: ___, ...domProps } = props;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Sheet Content */}
      <div
        ref={ref}
        className={cn(
          "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:duration-300 data-[state=open]:duration-500",
          sideClasses[side],
          className
        )}
        {...domProps}
      >
        {children}
      </div>
    </>
  );
});
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-gray-900", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}; 