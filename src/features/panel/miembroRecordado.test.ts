import { afterEach, describe, expect, it, vi } from "vitest";
import { leerMiembroRecordado, recordarMiembro } from "./miembroRecordado";

const miembros = [
  { id: 4, nombre: "Ana" },
  { id: 7, nombre: "Pau" },
];

function almacenEnMemoria(): Storage {
  const datos = new Map<string, string>();
  return {
    getItem: (clave) => datos.get(clave) ?? null,
    setItem: (clave, valor) => void datos.set(clave, valor),
    removeItem: (clave) => void datos.delete(clave),
    clear: () => datos.clear(),
    key: (i) => [...datos.keys()][i] ?? null,
    get length() {
      return datos.size;
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("miembro recordado", () => {
  it("recuerda el último por taller", () => {
    vi.stubGlobal("localStorage", almacenEnMemoria());
    expect(leerMiembroRecordado(2, miembros)).toBeNull();
    recordarMiembro(2, 7);
    expect(leerMiembroRecordado(2, miembros)).toBe(7);
    expect(leerMiembroRecordado(3, miembros)).toBeNull();
  });

  it("no preselecciona a quien ya no está en la lista", () => {
    vi.stubGlobal("localStorage", almacenEnMemoria());
    recordarMiembro(2, 9);
    expect(leerMiembroRecordado(2, miembros)).toBeNull();
  });

  it("sin almacenamiento no falla", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(() => recordarMiembro(2, 4)).not.toThrow();
    expect(leerMiembroRecordado(2, miembros)).toBeNull();
  });
});
