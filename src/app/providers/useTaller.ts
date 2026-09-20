import { useContext } from "react";
import type { Taller } from "@/features/taller/api";
import { TallerContext } from "./contextos";

/** Taller actual. Solo se puede usar dentro de un `TallerProvider`. */
export function useTaller(): Taller {
  const taller = useContext(TallerContext);
  if (!taller) throw new Error("useTaller() solo puede usarse dentro de <TallerProvider>");
  return taller;
}
