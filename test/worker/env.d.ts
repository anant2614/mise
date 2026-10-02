// Types for `env` and `exports` from "cloudflare:workers" inside the workerd tests.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    InboxAgent: DurableObjectNamespace<import("../../src/agent").InboxAgent>;
  }
  interface GlobalProps {
    mainModule: typeof import("../../src/index");
    durableNamespaces: "InboxAgent";
  }
}
