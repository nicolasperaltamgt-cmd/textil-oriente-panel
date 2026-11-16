import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStateHistory } from "../endpoints/state/history_GET.schema";
import { postStateRestore } from "../endpoints/state/restore_POST.schema";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { BrandMark } from "../components/BrandMark";
import styles from "./recuperar.module.css";

export default function RecuperarPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isFetching, error: loadError } = useQuery({
    queryKey: ["state-history"],
    queryFn: () => getStateHistory(),
    staleTime: 0,
  });

  const restore = useMutation({
    mutationFn: (id: number) => postStateRestore({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["state-history"] });
      await queryClient.removeQueries({ queryKey: ["app-state"] });
      navigate("/");
    },
    onError: (e) => setError(e instanceof Error ? e.message : "No se pudo restaurar"),
  });

  const fmtDate = (d: Date) =>
    new Date(d).toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={styles.page}>
      <title>Recuperar datos | Textil Oriente</title>
      <header className={styles.header}>
        <BrandMark width={56} />
        <div>
          <h1 className={styles.title}>Recuperar datos</h1>
          <p className={styles.hint}>
            El sistema guarda un punto de restauración cada 15 minutos mientras se trabaja. Si algo salió mal, volvé a uno anterior. Antes de volver atrás se guarda lo actual, así que no se pierde nada.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Volver al panel</Link>
        </Button>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {loadError && <div className={styles.error} role="alert">No se pudo cargar el historial.</div>}
      {isFetching && !data && <Skeleton style={{ height: 220 }} />}
      {data && data.items.length === 0 && (
        <p className={styles.hint}>Todavía no hay puntos de restauración. Se crean solos al empezar a cargar datos.</p>
      )}
      {data && data.items.length > 0 && (
        <div className={styles.list}>
          {data.items.map((it) => (
            <div key={it.id} className={styles.row}>
              <div className={styles.when}>
                <b>{fmtDate(it.createdAt)}</b>
                <span>{it.telas} telas · {it.ventas} ventas</span>
              </div>
              <Button
                variant={confirmId === it.id ? "primary" : "outline"}
                disabled={restore.isPending}
                onClick={() => {
                  setError(null);
                  if (confirmId !== it.id) {
                    setConfirmId(it.id);
                    setTimeout(() => setConfirmId((c) => (c === it.id ? null : c)), 4000);
                    return;
                  }
                  restore.mutate(it.id);
                }}
              >
                {confirmId === it.id ? "¿Confirmás volver a este punto?" : "Volver a este punto"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
