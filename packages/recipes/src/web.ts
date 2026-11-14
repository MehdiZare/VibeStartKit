import type { Files, ProjectSpec, Versions } from "@vibestartkit/core";

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function webFiles(spec: ProjectSpec, v: Versions): Files {
  return {
    "apps/web/package.json": json({
      name: "@app/web",
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        typecheck: "next typegen && tsc --noEmit",
        test: "node --test tests/*.test.mjs",
      },
      dependencies: {
        next: v.next,
        react: v.react,
        "react-dom": v["react-dom"],
        "@supabase/supabase-js": v["@supabase/supabase-js"],
        "@supabase/ssr": v["@supabase/ssr"],
      },
      devDependencies: {
        "@types/node": v["@types/node"],
        "@types/react": v["@types/react"],
        "@types/react-dom": v["@types/react-dom"],
        typescript: v.typescript,
      },
    }),
    "apps/web/tsconfig.json": json({
      extends: "../../packages/config/tsconfig.json",
      compilerOptions: {
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        noEmit: true,
        jsx: "preserve",
        incremental: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        plugins: [{ name: "next" }],
        paths: { "@/*": ["./src/*"] },
      },
      include: [
        "next-env.d.ts",
        ".next/types/**/*.ts",
        ".next/dev/types/**/*.ts",
        "**/*.ts",
        "**/*.tsx",
      ],
      exclude: ["node_modules"],
    }),
    "apps/web/next-env.d.ts":
      '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
    "apps/web/next.config.mjs":
      "export default { reactStrictMode: true, poweredByHeader: false, typedRoutes: true };\n",
    "apps/web/.env.example": "NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\n",
    "apps/web/src/app/layout.tsx": `import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = { title: "${spec.name}", description: "Built with VibeStartKit" };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
`,
    "apps/web/src/app/globals.css":
      "body { font-family: system-ui, sans-serif; max-width: 52rem; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.6; } input,button { font: inherit; padding: .7rem; margin: .4rem 0; } form { display: grid; max-width: 24rem; gap: .5rem; } a { color: #384dc1; } code { background: #f1f2f7; padding: .15rem .3rem; }\n",
    "apps/web/src/app/page.tsx": `import Link from "next/link";
export default function Home() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <main>
    <h1>${spec.name}</h1>
    <p>Your VibeStartKit monorepo is running.</p>
    <p>Supabase: {configured ? "environment configured; sign-in still needs verification" : "add the project URL and publishable key to apps/web/.env.local"}</p>
    <p><Link href="/login">Sign in</Link> · <Link href="/dashboard">Dashboard</Link></p>
    <p>Read <code>SETUP.md</code> and give your coding agent the first issue in <code>.vibe-kit/first-issue.md</code>.</p>
  </main>;
}
`,
    "apps/web/src/lib/supabase/server.ts": `import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configure the Supabase URL and publishable key first.");
  const jar = await cookies();
  return createServerClient(url, key, { cookies: {
    getAll: () => jar.getAll(),
    setAll: (values) => { for (const item of values) { try { jar.set(item.name, item.value, item.options); } catch { /* Server Components rely on the proxy to persist refreshed cookies. */ } } },
  } });
}
`,
    "apps/web/src/lib/supabase/browser.ts": `import { createBrowserClient } from "@supabase/ssr";
export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Configure the Supabase URL and publishable key first.");
  return createBrowserClient(url, key);
}
`,
    "apps/web/src/proxy.ts": `import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const client = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values) => {
      for (const item of values) request.cookies.set(item.name, item.value);
      response = NextResponse.next({ request });
      for (const item of values) response.cookies.set(item.name, item.value, item.options);
    },
  } });
  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/dashboard/:path*", "/login"] };
`,
    "apps/web/src/app/login/actions.ts": `"use server";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
export async function signIn(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing");
  const client = await serverClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=signin");
  redirect("/dashboard");
}
export async function signOut() {
  const client = await serverClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error("Sign-out failed; please retry.");
  redirect("/");
}
`,
    "apps/web/src/app/login/page.tsx": `import { signIn } from "./actions";
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <main><h1>Sign in</h1>
    {!configured ? <p>Configure Supabase in apps/web/.env.local before signing in.</p> :
      <form action={signIn}>
        <label>Email <input type="email" name="email" autoComplete="email" required /></label>
        <label>Password <input type="password" name="password" autoComplete="current-password" required /></label>
        <button type="submit">Sign in</button>
      </form>}
    {error && <p role="alert">Sign-in could not be completed; check your details and try again.</p>}
  </main>;
}
`,
    "apps/web/src/app/dashboard/page.tsx": `import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect("/login");
  const client = await serverClient();
  const { data, error } = await client.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/login");
  return <main><h1>Dashboard</h1><p>Your session was verified for this request.</p><form action={signOut}><button type="submit">Sign out</button></form></main>;
}
`,
    "apps/web/src/app/api/health/route.ts": `export function GET() {
  return Response.json({
    status: "ok",
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "environment_present" : "needs_configuration",
  });
}
`,
    "apps/web/tests/health.test.mjs": `import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/health/route.ts";
test("health is available before account setup and never exposes credentials", async () => {
  const response = GET();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.ok(["environment_present", "needs_configuration"].includes(body.supabase));
  assert.deepEqual(Object.keys(body).sort(), ["status", "supabase"]);
});
`,
    ...(spec.deployment.web === "vercel"
      ? {
          "apps/web/vercel.json": json({
            $schema: "https://openapi.vercel.sh/vercel.json",
            framework: "nextjs",
            installCommand: `cd ../.. && npm exec --yes --package=pnpm@${v.pnpm} -- pnpm install --frozen-lockfile --prod=false`,
            buildCommand: `cd ../.. && npm exec --yes --package=pnpm@${v.pnpm} -- pnpm --filter @app/web build`,
          }),
        }
      : {}),
  };
}
