import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getState } from "../endpoints/state_GET.schema";
import { mountPanel } from "../helpers/panelApp";
import { panelCss } from "../helpers/panelCss";
import { useAuth } from "../helpers/useAuth";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";
import styles from "./StockPanel.module.css";

const STATE_KEY = ["app-state"] as const;

export const StockPanel: React.FC = () => {
  const { authState, logout } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);

  // Siempre se pide el estado fresco al entrar: nunca se edita sobre datos viejos.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: STATE_KEY,
    queryFn: () => getState(),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  useEffect(() => {
    if (!data || !hostRef.current) return;
    const dispose = mountPanel(hostRef.current, {
      initialData: data.data,
      initialVersion: data.version,
      onConflict: () => {
        // Se vuelve a pedir el estado del servidor; el panel se monta de nuevo con los datos nuevos.
        void refetch();
      },
    });
    return dispose;
  }, [data, refetch]);

  const user = authState.type === "authenticated" ? authState.user : null;
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BrandMark className={styles.mark} width={72} />
        <div className={styles.brand}>
          <h1 className={styles.title}>Textil Oriente</h1>
          <span className={styles.sub}>Telas</span>
        </div>
        <div className={styles.right}>
          <span className={styles.today}>{today}</span>
          <div className={styles.userRow}>
            {user && <span className={styles.userName}>{user.displayName}</span>}
            <Button asChild variant="outline" size="sm">
              <Link to="/recuperar">Recuperar datos</Link>
            </Button>
            {user?.role === "admin" && (
              <Button asChild variant="outline" size="sm">
                <Link to="/usuarios">Usuarios</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className={styles.loading}>
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 420 }} />
        </div>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <p>No se pudieron cargar los datos del servidor. No se edita nada hasta que carguen, para no pisar información.</p>
          <Button onClick={() => void refetch()}>Reintentar</Button>
        </div>
      )}
      <style>{panelCss}</style>
      <div ref={hostRef} className="txPanel" hidden={!data} />
    </div>
  );
};
