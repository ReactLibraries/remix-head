# remix-head

Provides the ability to set the content of the Remix head from within the component

## Sample

### root.tsx

```tsx
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "./tailwind.css";
import { RemixHeadProvider, RemixHeadRoot } from "remix-head";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // Providers required to control the content of headers
    <RemixHeadProvider>
      <html lang="ja">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <Meta />
          <Links />
          {/* Dynamic output of header content */}
          <RemixHeadRoot />
        </head>
        <body>
          {children}
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    </RemixHeadProvider>
  );
}

export default function App() {
  return <Outlet />;
}
```

### routes/test.tsx

```tsx
import { RemixHead } from "remix-head";

export default function Page() {
  return (
    <div>
      Test
      <RemixHead>
        <title>Test page</title>
      </RemixHead>
    </div>
  );
}
```
