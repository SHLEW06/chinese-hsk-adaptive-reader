"use client";

import { useEffect, useState } from "react";

const firebaseEnv = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function FirebaseDebugPanel() {
  const [hostname, setHostname] = useState("Loading…");

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  return (
    <aside className="fixed bottom-3 left-3 z-50 max-w-sm rounded-lg border border-amber-500 bg-amber-50 p-3 font-mono text-xs text-amber-950 shadow-lg">
      <p className="mb-2 font-semibold">Firebase debug (development only)</p>
      <p>Project ID: {firebaseEnv.projectId || "missing"}</p>
      <p>Auth domain: {firebaseEnv.authDomain || "missing"}</p>
      <p>Hostname: {hostname}</p>
      <p className="mt-2 font-semibold">Environment variables</p>
      <ul>
        {Object.entries(firebaseEnv).map(([name, value]) => (
          <li key={name}>{name}: {value ? "present" : "missing"}</li>
        ))}
      </ul>
    </aside>
  );
}
