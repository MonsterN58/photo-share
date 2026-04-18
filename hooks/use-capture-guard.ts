"use client";

import { useEffect, useState } from "react";

function hasFinePointer() {
  return window.matchMedia("(pointer: fine)").matches;
}

export function useCaptureGuard(enabled: boolean) {
  const [isObscured, setIsObscured] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleVisibilityChange = () => {
      setIsObscured(document.hidden);
    };

    const handleWindowBlur = () => {
      setIsObscured(true);
    };

    const handleWindowFocus = () => {
      if (!document.hidden) {
        setIsObscured(false);
      }
    };

    const handleMouseOut = (event: MouseEvent) => {
      if (hasFinePointer() && event.relatedTarget === null) {
        setIsObscured(true);
      }
    };

    const handleMouseOver = () => {
      if (hasFinePointer() && !document.hidden) {
        setIsObscured(false);
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pagehide", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pagehide", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, [enabled]);

  return { isObscured: enabled && isObscured };
}
