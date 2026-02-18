import type { RuntimeEnv } from "../runtime.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { defaultRuntime } from "../runtime.js";
<<<<<<< HEAD
<<<<<<< HEAD
import type { WizardSection } from "./configure.shared.js";
=======
=======
import type { WizardSection } from "./configure.shared.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { WizardSection } from "./configure.shared.js";
import { defaultRuntime } from "../runtime.js";
>>>>>>> ed11e93cf (chore(format))
=======
import { defaultRuntime } from "../runtime.js";
import type { WizardSection } from "./configure.shared.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { WizardSection } from "./configure.shared.js";
import { defaultRuntime } from "../runtime.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import { defaultRuntime } from "../runtime.js";
import type { WizardSection } from "./configure.shared.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import { CONFIGURE_WIZARD_SECTIONS, parseConfigureWizardSections } from "./configure.shared.js";
>>>>>>> 1a758135d (refactor(cli): share configure section runner)
import { runConfigureWizard } from "./configure.wizard.js";

export async function configureCommand(runtime: RuntimeEnv = defaultRuntime) {
  await runConfigureWizard({ command: "configure" }, runtime);
}

export async function configureCommandWithSections(
  sections: WizardSection[],
  runtime: RuntimeEnv = defaultRuntime,
) {
  await runConfigureWizard({ command: "configure", sections }, runtime);
}

export async function configureCommandFromSectionsArg(
  rawSections: unknown,
  runtime: RuntimeEnv = defaultRuntime,
): Promise<void> {
  const { sections, invalid } = parseConfigureWizardSections(rawSections);
  if (sections.length === 0) {
    await configureCommand(runtime);
    return;
  }

  if (invalid.length > 0) {
    runtime.error(
      `Invalid --section: ${invalid.join(", ")}. Expected one of: ${CONFIGURE_WIZARD_SECTIONS.join(", ")}.`,
    );
    runtime.exit(1);
    return;
  }

  await configureCommandWithSections(sections as never, runtime);
}
