"use client";

import { useEffect } from "react";

/**
 * 서비스워커는 프로덕션에서만 등록한다.
 *
 * dev 에서 등록하면 서버를 잠깐 껐다 켜는 사이에 워커가 navigation 요청을
 * 가로채 캐시된 /offline 을 내주고, 앱이 "인터넷이 끊겼다"며 죽은 것처럼 보인다.
 * 코드는 정상인데 원인을 찾느라 시간을 버리게 되는 종류의 함정이다.
 *
 * 그래서 dev 에서는 등록하지 않고, 예전에 등록돼 남아 있는 워커와 캐시까지
 * 걷어낸다 — 한번 등록된 워커는 등록 코드를 지워도 계속 살아 있기 때문이다.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => {
          for (const key of keys) {
            if (key.startsWith("hindsight-")) void caches.delete(key);
          }
        });
      }
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("SW registration failed:", err));
  }, []);

  return null;
}
