"use client";

import { Button } from "@/components/ui/button";
import { Highlighter } from "@/components/ui/highlighter";
import { SparklesCore } from "@/components/ui/sparkles";
import Link from "next/link";
import Carousel from "./Carousel";

const Hero = () => {
  return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center overflow-hidden rounded-md">
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Streamly
      </h1>
      <div className="w-160 h-40 relative">
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
      <div className="w-160 mx-auto text-center">
        <h4 className="scroll-m-20 text-center w-160 text-xl font-semibold tracking-tight">
          Streamly - Just a better place for watching online moves.
        </h4>
        <p className="leading-7 not-first:mt-6">
          This is a sample site for me to practice building a movie streaming
          platform. This is strictly for{" "}
          <Highlighter action="underline" color="#FF9800">
            educational purposes only
          </Highlighter>{" "}
          and not intended for commercial use and most importantly, no movies
          are actually hosted and just trailers.
        </p>
      </div>

      <div className="w-100 flex items-center justify-between gap-4 mt-8">
        <Link href={"/movies"} className="w-full">
          <Button variant="secondary" className="w-full cursor-pointer">
            Browse Movies
          </Button>
        </Link>
      </div>

      <Carousel />
    </div>
  );
};

export default Hero;
