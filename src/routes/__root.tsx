import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth-context";
import { EmpresaProvider } from "@/lib/empresa-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { httpEquiv: "Content-Language", content: "pt-BR" },
      { name: "google", content: "notranslate" },
      { title: "GestãoRHPRO" },
      { name: "description", content: "Gestão total dos colaboradores - Ferramenta simples que economiza 2 horas do RH por dia" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "GestãoRHPRO" },
      { property: "og:description", content: "Gestão total dos colaboradores - Ferramenta simples que economiza 2 horas do RH por dia" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "GestãoRHPRO" },
      { name: "twitter:description", content: "Gestão total dos colaboradores - Ferramenta simples que economiza 2 horas do RH por dia" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/71c2f7f0-9236-43b7-8f4f-2f654c716ec7" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/71c2f7f0-9236-43b7-8f4f-2f654c716ec7" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <head>
        <HeadContent />
      </head>
      <body translate="no" className="notranslate">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EmpresaProvider>
          <Outlet />
          <Toaster richColors position="top-right" />
        </EmpresaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
