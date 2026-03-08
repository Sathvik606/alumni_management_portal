import { motion } from 'framer-motion';
import logo from '@/assets/logo2.png';

export default function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [1, 0.8, 1],
          }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="flex flex-col items-center gap-3"
        >
          <img src={logo} alt="Alumni Link" className="h-28 w-auto" />
          <h1 className="text-3xl font-bold tracking-tight">ALUMNI LINK</h1>
        </motion.div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading platform...</p>
        </div>
      </motion.div>
    </div>
  );
}
