import React from "react";
import { BrandMark } from "../components/BrandMark";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <title>Ingresar | Textil Oriente</title>
      <div className={styles.card}>
        <BrandMark className={styles.mark} width={84} />
        <h1 className={styles.brand}>Textil Oriente</h1>
        <span className={styles.sub}>Telas</span>
        <p className={styles.hint}>Ingresá con tu email y tu contraseña.</p>
        <PasswordLoginForm className={styles.form} />
      </div>
    </div>
  );
}
