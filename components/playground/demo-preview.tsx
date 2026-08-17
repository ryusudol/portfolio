"use client";

import { createContext, type ReactNode, useContext } from "react";

const DemoPreviewContext = createContext(false);

/** Marks a demo tree as an index preview (no canvas stage fill). */
export function DemoPreviewProvider({ children }: { children: ReactNode }) {
  return (
    <DemoPreviewContext.Provider value={true}>
      {children}
    </DemoPreviewContext.Provider>
  );
}

export function useDemoPreview() {
  return useContext(DemoPreviewContext);
}
