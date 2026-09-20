import { useContext } from "react";
import type { TallerConfig } from "@/features/taller/api";
import { TallerContext } from "./contextos";

/** Taller actual con sus servicios y campos. Solo se puede usar dentro de un `TallerProvider`. */
export function useTaller(): TallerConfig {
  const taller = useContext(TallerContext);
  if (!taller) throw new Error("useTaller() solo puede usarse dentro de <TallerProvider>");
  return taller;
}
