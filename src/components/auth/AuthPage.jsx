import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import MagicLinkForm from './MagicLinkForm';

const AUTH_MODES = {
  LOGIN: 'login',
  SIGNUP: 'signup',
  MAGIC_LINK: 'magic-link'
};

export default function AuthPage() {
  const [authMode, setAuthMode] = useState(AUTH_MODES.LOGIN);

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const [direction, setDirection] = useState(0);

  const switchToLogin = () => {
    setDirection(-1);
    setAuthMode(AUTH_MODES.LOGIN);
  };

  const switchToSignup = () => {
    setDirection(1);
    setAuthMode(AUTH_MODES.SIGNUP);
  };

  const switchToMagicLink = () => {
    setDirection(authMode === AUTH_MODES.LOGIN ? 1 : -1);
    setAuthMode(AUTH_MODES.MAGIC_LINK);
  };

  const renderCurrentForm = () => {
    switch (authMode) {
      case AUTH_MODES.LOGIN:
        return (
          <LoginForm 
            onSwitchToSignup={switchToSignup}
            onSwitchToMagicLink={switchToMagicLink}
          />
        );
      case AUTH_MODES.SIGNUP:
        return (
          <SignupForm 
            onSwitchToLogin={switchToLogin}
            onSwitchToMagicLink={switchToMagicLink}
          />
        );
      case AUTH_MODES.MAGIC_LINK:
        return (
          <MagicLinkForm 
            onSwitchToLogin={switchToLogin}
            onSwitchToSignup={switchToSignup}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            hello, I'm ember
          </h1>
          <p className="mt-2 text-gray-600">
            Your AI conversation companion
          </p>
        </div>

        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={authMode}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
            >
              {renderCurrentForm()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 