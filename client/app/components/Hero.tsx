"use client";

import { Button } from "@/components/ui/button";
import { SparklesCore } from "@/components/ui/sparkles";
import Link from "next/link";

const Hero = () => {
  return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center overflow-hidden rounded-md">
      <h1 className="md:text-5xl text-2xl lg:text-7xl font-bold text-center text-white relative z-20 mb-3">
        Welcome To Streamly
      </h1>
      <div className="w-250 h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-20 top-0 bg-linear-to-r from-transparent via-indigo-500 to-transparent h-0.5 w-3/4 blur-sm" />
        <div className="absolute inset-x-20 top-0 bg-linear-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
        <div className="absolute inset-x-60 top-0 bg-linear-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
        <div className="absolute inset-x-60 top-0 bg-linear-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={1200}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-background mask-[radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
      </div>
      <div className="w-100 flex items-center justify-between gap-4 mt-8">
        <Link href={"/movies"} className="w-full">
          <Button variant="secondary" className="w-full cursor-pointer">
            Browse Movies
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Hero;
