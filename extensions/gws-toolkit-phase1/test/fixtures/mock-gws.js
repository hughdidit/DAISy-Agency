#!/usr/bin/env node

const args = process.argv.slice(2);
const mode = process.env.MOCK_GWS_MODE || "ok";

function writeJson(payload, exitCode = 0) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(exitCode);
}

if (args.includes("--version")) {
  if (mode === "old_version") {
    process.stdout.write("gws 0.0.0\n");
    process.exit(0);
  }
  process.stdout.write("gws 0.1.0\n");
  process.exit(0);
}

if (mode === "timeout") {
  setTimeout(() => {
    writeJson({ ok: true, delayed: true });
  }, 60_000);
} else if (mode === "non_json") {
  process.stdout.write("NOT_JSON_OUTPUT");
  process.exit(0);
} else if (mode === "cli_error") {
  writeJson({ ok: false, error: "api disabled" }, 4);
} else {
  const [service, action] = args;

  if (!service || !action) {
    writeJson({ ok: false, error: "missing command" }, 2);
  }
  if (service === "auth" && action === "status") {
    if (mode === "auth_unhealthy") {
      writeJson(
        {
          plain_credentials_exists: true,
          token_valid: false,
          token_error: "invalid_grant",
          credential_source: process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE
            ? "credentials_file"
            : "token",
        },
        0,
      );
    }
    writeJson(
      {
        plain_credentials_exists: Boolean(process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE),
        token_valid: true,
        token_error: "",
        credential_source: process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE
          ? "credentials_file"
          : "token",
        impersonated_user: process.env.GOOGLE_WORKSPACE_CLI_IMPERSONATED_USER || null,
      },
      0,
    );
  }

  const payload = {
    ok: true,
    service,
    action,
    argv: args,
    tokenProvided: Boolean(process.env.GOOGLE_WORKSPACE_CLI_TOKEN),
    credentialsFile: process.env.GOOGLE_WORKSPACE_CLI_CREDENTIALS_FILE ? "present" : "absent",
  };

  writeJson(payload, 0);
}
