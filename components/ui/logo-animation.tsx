"use client"
import { motion } from "framer-motion"

export function LogoAnimation() {
  return (
    <div className="relative w-10 h-10">
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-connect"
        initial={{ rotate: 0, scale: 0.8 }}
        animate={{
          rotate: 360,
          scale: [0.8, 1, 0.8],
          transition: {
            rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
          },
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-share"
        initial={{ rotate: 45, scale: 0.9 }}
        animate={{
          rotate: 405,
          scale: [0.9, 1.1, 0.9],
          transition: {
            rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 },
          },
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-safe"
        initial={{ rotate: 90, scale: 1 }}
        animate={{
          rotate: 450,
          scale: [1, 1.2, 1],
          transition: {
            rotate: { duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            scale: { duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 2 },
          },
        }}
      />
    </div>
  )
}

