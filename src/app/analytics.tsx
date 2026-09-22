import { headers } from "next/headers";
import Script from "next/script";

export default async function Analytics() {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  return <Script id="analytics" nonce={nonce} strategy="afterInteractive">{`window.track()`}</Script>
}
