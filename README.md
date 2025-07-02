# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Development

This project uses Vercel serverless functions for API endpoints. To run the development server with full API support:

### Option 1: Full Development (with API endpoints working)
```bash
npm run dev:vercel
```
This runs the application on `http://localhost:3000` with all API endpoints functional.

### Option 2: Frontend Only (API endpoints will fail)
```bash
npm run dev
```
This runs only the Vite development server on `http://localhost:5173` but API calls will fail with 404 errors.

**Recommended:** Use `npm run dev:vercel` for development to avoid API-related errors.

## 🐛 Common Issues & Solutions

### Modal Input Cursor Jumping Issue

**Problem:** In modal components, input fields lose focus after typing the first character, causing the cursor to "jump out" of the input box.

**Root Cause:** This happens when `ModalContent` components are defined inside the main component function, causing them to be recreated on every render. React treats the recreated component as "new" and unmounts/remounts the input, losing focus.

**Solution:** Extract `ModalContent` outside the main component function.

#### ❌ Bad Pattern (Causes Cursor Jumping):
```jsx
export default function MyModal({ isOpen, onClose }) {
  const [inputValue, setInputValue] = useState('');

  // ❌ This component gets recreated on every render!
  const ModalContent = () => (
    <div>
      <Input 
        value={inputValue} 
        onChange={(e) => setInputValue(e.target.value)} // This triggers re-render
      />
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent />
    </Dialog>
  );
}
```

#### ✅ Good Pattern (Fixes Cursor Jumping):
```jsx
// ✅ Extract ModalContent OUTSIDE the main component
const ModalContent = ({ inputValue, setInputValue }) => (
  <div>
    <Input 
      value={inputValue} 
      onChange={(e) => setInputValue(e.target.value)}
    />
  </div>
);

export default function MyModal({ isOpen, onClose }) {
  const [inputValue, setInputValue] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ModalContent 
        inputValue={inputValue}
        setInputValue={setInputValue}
      />
    </Dialog>
  );
}
```

**Fixed Components:**
- ✅ `InviteModal.jsx` - Input focus preserved
- ✅ `ShareModal.jsx` - Input focus preserved  
- ✅ `TimeDateModal.jsx` - Input focus preserved
- ✅ `EmberNamesModal.jsx` - Already properly structured
- ✅ `ImageAnalysisModal.jsx` - Already properly structured
- ✅ `LocationModal.jsx` - Already properly structured
- ✅ `StoryModal.jsx` - Already properly structured

**Key Points:**
1. Always define `ModalContent` components **outside** the main component function
2. Pass all necessary state and functions as props
3. Use `useRef` for inputs that need persistent focus
4. This pattern applies to any component that contains form inputs, not just modals
