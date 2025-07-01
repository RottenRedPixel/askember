# Ember App Style Guide

> 📱 **Visual Style Guide**: Visit `/style` in the app to see all components in action!

## Modal & Dialog Specifications

### Desktop Modal Widths
- **Standard Modals**: `max-w-md` (448px / 28rem)
  - Contributors, Location, Date/Time, Share, Names, Voting
- **Story Modal**: `max-w-lg` (512px / 32rem)
- **Analysis Modal**: `max-w-2xl` (672px / 42rem)
- **Settings Panels**: `w-[90%]` (90% of screen width)

### Mobile Behavior
- All modals use `Drawer` component on mobile
- Mobile breakpoint: `md:hidden` / `md:block`
- Mobile drawers: `max-h-[70vh]` with `overflow-y-auto`

### Standard Modal Structure
```jsx
// Desktop Dialog
<DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto bg-white sm:w-full sm:max-w-md rounded-2xl focus:outline-none">

// Mobile Drawer  
<DrawerContent className="bg-white focus:outline-none">
  <div className="px-4 pb-4 bg-white max-h-[70vh] overflow-y-auto">
```

## Color Palette

### Primary Colors
- **Blue**: `text-blue-600`, `bg-blue-600`
- **Green**: `text-green-600`, `bg-green-50`, `border-green-200`
- **Red**: `text-red-600`, `bg-red-600` (destructive actions)
- **Purple**: `text-purple-600` (AI features)
- **Orange**: `text-orange-600` (time/date)

### Status Colors
- **Success**: `bg-green-50`, `text-green-800`, `border-green-200`
- **Warning**: `bg-yellow-50`, `text-yellow-800`, `border-yellow-200`
- **Error**: `bg-red-50`, `text-red-800`, `border-red-200`
- **Info**: `bg-blue-50`, `text-blue-800`, `border-blue-200`

### Gray Scale
- **Text Primary**: `text-gray-900`
- **Text Secondary**: `text-gray-600`
- **Text Muted**: `text-gray-500`
- **Borders**: `border-gray-200`
- **Backgrounds**: `bg-gray-50`, `bg-gray-100`

## Typography

### Headings
- **Modal Titles**: `text-xl font-bold text-gray-900`
- **Section Headers**: `text-lg font-semibold text-gray-900`
- **Card Titles**: `font-medium text-gray-900`

### Body Text
- **Primary**: `text-gray-900`
- **Secondary**: `text-gray-600`
- **Small**: `text-sm text-gray-500`
- **Description**: `text-gray-600`

## Spacing & Layout

### Container Widths
- **Desktop Container**: `max-w-4xl mx-auto`
- **Modal Container**: `container mx-auto px-1.5 py-8`

### Padding & Margins
- **Modal Padding**: `px-4 pb-4` (mobile), `p-6` (desktop)
- **Card Padding**: `p-4`, `p-6`
- **Section Spacing**: `space-y-4`, `space-y-6`
- **Button Spacing**: `gap-2`

### Border Radius
- **Cards**: `rounded-xl`, `rounded-2xl`
- **Buttons**: `rounded-lg`
- **Small Elements**: `rounded`

## Component Patterns

### Icon Usage
- **Size**: Most icons use `w-5 h-5` or `size={20}`
- **Small icons**: `w-4 h-4` or `size={16}`
- **Colors match context**: `text-blue-600`, `text-red-600`, etc.

### Button Variants
- **Primary**: `variant="blue"`
- **Secondary**: `variant="outline"`
- **Destructive**: `variant="destructive"`
- **Sizes**: `size="lg"` for important actions

### Loading States
```jsx
{isLoading ? (
  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
) : (
  <Icon size={16} className="mr-2" />
)}
```

### Alert/Message Boxes
```jsx
<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
  <p className="text-sm text-yellow-800">
    <strong>Warning:</strong> Message text
  </p>
</div>
```

## Responsive Design

### Breakpoints
- **Mobile**: `default` (no prefix)
- **Desktop**: `md:` and above
- **Large Desktop**: `lg:` and above

### Mobile-First Patterns
- Start with mobile styles
- Add `md:` prefixes for desktop
- Use `hidden md:block` / `md:hidden` for conditional rendering

### Panel Widths
- **Mobile**: `w-full`
- **Desktop**: `w-[90%]` (standard for all panels)

## Animation & Transitions

### Standard Transitions
- **Hover**: `transition-colors`, `hover:bg-gray-100`
- **Button States**: `transition-opacity`
- **Loading**: `animate-spin`

### Modal Animations
- Built into Radix UI Dialog/Drawer components
- `duration-200` for custom transitions

## Form Patterns

### Input Styling
- Standard inputs use UI components from `@/components/ui/`
- Labels: `text-sm font-medium text-gray-700`
- Descriptions: `text-xs text-gray-500 mt-1`

### Validation
- Error states: `border-red-300`, `text-red-600`
- Success states: `border-green-300`, `text-green-600`

## Feature-Specific Guidelines

### AI Features
- Use purple accent: `text-purple-600`
- Include brain/sparkle icons
- Show loading states for API calls

### Social Features (Sharing, Contributors)
- Use blue accent: `text-blue-600`
- Include user/share icons
- Show participant avatars when applicable

### Time/Date Features
- Use orange accent: `text-orange-600`
- Include calendar/clock icons

### Location Features
- Use blue accent: `text-blue-600`
- Include map pin icons

## Development Guidelines

### Component Structure
1. Import statements
2. Custom hooks (useMediaQuery)
3. Component logic
4. ModalContent component (extracted)
5. Responsive render (mobile Drawer, desktop Dialog)

### File Organization
- Modal components in `/components/`
- UI primitives in `/components/ui/`
- Utility functions in `/lib/`

### Naming Conventions
- Modal components: `*Modal.jsx`
- UI components: lowercase with dashes
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

---

## Quick Reference Card

**New Modal Checklist:**
- [ ] Use `max-w-md` for standard modals
- [ ] Include mobile Drawer + desktop Dialog
- [ ] Add appropriate icon with color theme
- [ ] Use `text-xl font-bold text-gray-900` for titles
- [ ] Include loading states
- [ ] Add proper padding: `px-4 pb-4` mobile, `p-6` desktop
- [ ] Use `w-[calc(100%-2rem)]` for responsive width
- [ ] Add `focus:outline-none` to prevent blue outline
- [ ] Include `max-h-[90vh] overflow-y-auto` for scrolling

**Color Quick Pick:**
- Blue: Primary actions, social features
- Green: Success, nature/location themes  
- Red: Destructive/delete actions
- Purple: AI features
- Orange: Time/date features
- Gray: Text hierarchy (900/600/500) 