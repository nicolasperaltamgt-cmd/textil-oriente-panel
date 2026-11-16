import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Form, FormControl, FormItem, FormLabel, FormMessage, useForm } from "../components/Form";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { BrandMark } from "../components/BrandMark";
import { schema, postUsersCreate } from "../endpoints/users/create_POST.schema";
import styles from "./usuarios.module.css";

export default function UsuariosPage() {
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({
    defaultValues: { email: "", displayName: "", password: "" },
    schema,
  });

  const onSubmit = async (values: { email: string; displayName: string; password: string }) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await postUsersCreate(values);
      setMessage({ kind: "ok", text: `Usuario creado: ${result.email}. Ya puede ingresar con esa contraseña.` });
      form.setValues({ email: "", displayName: "", password: "" });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "No se pudo crear el usuario" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <title>Usuarios | Textil Oriente</title>
      <div className={styles.card}>
        <BrandMark width={64} />
        <h1 className={styles.title}>Crear usuario</h1>
        <p className={styles.hint}>
          Solo el administrador crea usuarios. Anotá la contraseña y pasásela en persona a quien va a usar el panel.
        </p>
        {message && (
          <div className={message.kind === "ok" ? styles.ok : styles.error} role="status">
            {message.text}
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
            <FormItem name="displayName">
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  placeholder="Tomás"
                  disabled={busy}
                  value={form.values.displayName}
                  onChange={(e) => form.setValues((p) => ({ ...p, displayName: e.target.value }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem name="email">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="tomas@correo.com"
                  disabled={busy}
                  value={form.values.email}
                  onChange={(e) => form.setValues((p) => ({ ...p, email: e.target.value }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem name="password">
              <FormLabel>Contraseña (mínimo 8 caracteres)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="off"
                  disabled={busy}
                  value={form.values.password}
                  onChange={(e) => form.setValues((p) => ({ ...p, password: e.target.value }))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <Button type="submit" disabled={busy}>
              {busy ? "Creando…" : "Crear usuario"}
            </Button>
          </form>
        </Form>
        <Button asChild variant="outline">
          <Link to="/">Volver al panel</Link>
        </Button>
      </div>
    </div>
  );
}
