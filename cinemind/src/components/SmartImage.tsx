"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  eager?: boolean;
  /** Shown instead of a broken-image icon when the image fails to load. */
  fallback: React.ReactNode;
};

export function SmartImage({ src, srcSet, sizes, alt, className, eager, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // An image that failed before hydration never fires onError for React, so check once on mount
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  return (
    <img
      ref={ref}
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
