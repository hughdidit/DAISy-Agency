import type { ResolvedCapabilityUnavailableReason } from "../../shared/resolved-capability-manifest.js";
import {
  getSandboxRuntimePrimaryImageRule,
  getSandboxRuntimeProfile,
  matchSandboxRuntimeImage,
  supportsSandboxRuntimeCapabilityFamily,
  supportsSandboxRuntimeSkillFamily,
  type SandboxRuntimeCapabilityFamilyId,
  type SandboxRuntimeProfileId,
  type SandboxRuntimeProfileMetadata,
  type SandboxRuntimeSkillFamilyId,
  type SandboxRuntimeSupportStatus,
} from "../../shared/sandbox-runtime-profiles.js";
import type { SandboxConfig } from "./types.js";

export type SandboxRuntimeResolutionMode = "gateway" | "readonly-sandbox";

export type ResolvedSandboxRuntimeProfile = {
  runtimeMode: SandboxRuntimeResolutionMode;
  declaredProfileId: SandboxRuntimeProfileId;
  profile: SandboxRuntimeProfileMetadata;
  supportStatus: SandboxRuntimeSupportStatus;
  declaredImage?: string;
  matchedImage?: string;
  customImage?: string;
  reasonCodes: ResolvedCapabilityUnavailableReason[];
  detail?: string;
  browserEnabled: boolean;
};

function combineDetail(parts: Array<string | undefined>): string | undefined {
  const cleaned = parts.map((part) => part?.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" | ") : undefined;
}

function resolveDeclaredProfileId(params: {
  mode: SandboxRuntimeResolutionMode;
  sandboxConfig: SandboxConfig;
}): SandboxRuntimeProfileId {
  if (params.mode === "readonly-sandbox") {
    return "ops-readonly";
  }
  return params.sandboxConfig.profile;
}

function classifyConfiguredImage(params: {
  declaredProfileId: SandboxRuntimeProfileId;
  declaredImage?: string;
  role: "docker" | "browser";
}):
  | {
      status: "official";
      matchedImage?: string;
      detail?: string;
    }
  | {
      status: "image-mismatch" | "custom-image";
      matchedImage?: string;
      customImage?: string;
      reasonCode: ResolvedCapabilityUnavailableReason;
      detail: string;
    } {
  const declaredImage = params.declaredImage?.trim();
  const expectedRule = getSandboxRuntimePrimaryImageRule(params.declaredProfileId, params.role);
  const matched = matchSandboxRuntimeImage({
    image: declaredImage,
    role: params.role,
  });

  if (declaredImage && expectedRule && declaredImage === expectedRule.image) {
    return {
      status: "official",
      matchedImage: expectedRule.image,
      detail: `Runtime profile ${params.declaredProfileId} matches the official ${params.role} image ${expectedRule.image}.`,
    };
  }

  if (declaredImage && matched && matched.profileId !== params.declaredProfileId) {
    return {
      status: "image-mismatch",
      matchedImage: matched.rule.image,
      reasonCode: "runtime-profile-image-mismatch",
      detail: combineDetail([
        `Configured ${params.role} image ${declaredImage} matches official profile ${matched.profileId}, not declared profile ${params.declaredProfileId}.`,
        `Expected ${expectedRule?.image ?? "a declared official image"}.`,
      ])!,
    };
  }

  if (declaredImage) {
    return {
      status: "custom-image",
      customImage: declaredImage,
      reasonCode: "custom-runtime-image",
      detail: combineDetail([
        `Configured ${params.role} image ${declaredImage} does not match an official image for declared profile ${params.declaredProfileId}.`,
        "Custom images remain partially supported and do not promote themselves into a new official runtime profile.",
      ])!,
    };
  }

  return {
    status: "image-mismatch",
    reasonCode: "runtime-profile-image-mismatch",
    detail: `Declared runtime profile ${params.declaredProfileId} is missing a configured ${params.role} image.`,
  };
}

export function resolveSandboxRuntimeProfile(params: {
  mode: SandboxRuntimeResolutionMode;
  sandboxConfig: SandboxConfig;
}): ResolvedSandboxRuntimeProfile {
  const declaredProfileId = resolveDeclaredProfileId(params);
  const profile = getSandboxRuntimeProfile(declaredProfileId);
  if (!profile) {
    throw new Error(`Unsupported sandbox runtime profile "${declaredProfileId}".`);
  }

  if (params.mode === "readonly-sandbox") {
    return {
      runtimeMode: params.mode,
      declaredProfileId,
      profile,
      supportStatus: "synthetic-readonly",
      reasonCodes: [],
      detail: "Readonly sandbox diagnostics synthesize the ops-readonly profile from runtime mode.",
      browserEnabled: false,
    };
  }

  const primaryRole = profile.browserRuntimeRequired ? "browser" : "docker";
  const imageClassifications = profile.imageRules.map((rule) =>
    classifyConfiguredImage({
      declaredProfileId: profile.id,
      declaredImage:
        rule.role === "browser"
          ? params.sandboxConfig.browser.image
          : params.sandboxConfig.docker.image,
      role: rule.role,
    }),
  );
  const primaryClassification =
    imageClassifications.find((classification, index) => profile.imageRules[index]?.primary) ??
    imageClassifications[0];
  const declaredImage =
    primaryRole === "browser"
      ? params.sandboxConfig.browser.image.trim()
      : params.sandboxConfig.docker.image.trim();
  const reasonCodes: ResolvedCapabilityUnavailableReason[] = [];
  const detailParts: string[] = [];

  for (const classification of imageClassifications) {
    if (classification.status !== "official") {
      reasonCodes.push(classification.reasonCode);
    }
    if (classification.detail) {
      detailParts.push(classification.detail);
    }
  }

  let supportStatus: SandboxRuntimeSupportStatus = "official";
  if (imageClassifications.some((classification) => classification.status === "image-mismatch")) {
    supportStatus = "image-mismatch";
  } else if (
    imageClassifications.some((classification) => classification.status === "custom-image")
  ) {
    supportStatus = "custom-image";
  }

  const mismatchedOrCustomClassification = imageClassifications.find(
    (classification) => classification.status !== "official",
  );
  if (
    profile.browserRuntimeRequired &&
    !params.sandboxConfig.browser.enabled &&
    supportStatus === "official"
  ) {
    supportStatus = "image-mismatch";
    detailParts.push(
      "Declared browser-automation profile requires the dedicated browser runtime, but sandbox.browser.enabled=false.",
    );
  }

  return {
    runtimeMode: params.mode,
    declaredProfileId,
    profile,
    supportStatus,
    declaredImage: declaredImage || undefined,
    matchedImage: primaryClassification?.matchedImage,
    customImage:
      supportStatus === "custom-image"
        ? mismatchedOrCustomClassification?.status === "custom-image"
          ? mismatchedOrCustomClassification.customImage
          : declaredImage || undefined
        : undefined,
    reasonCodes: Array.from(new Set(reasonCodes)),
    detail: combineDetail(detailParts),
    browserEnabled: params.sandboxConfig.browser.enabled,
  };
}

export function resolveSandboxRuntimeCapabilitySupport(params: {
  resolvedProfile: ResolvedSandboxRuntimeProfile;
  family: SandboxRuntimeCapabilityFamilyId;
}): {
  reasonCodes: ResolvedCapabilityUnavailableReason[];
  detail?: string;
} {
  const reasonCodes = [...params.resolvedProfile.reasonCodes];
  const detailParts: string[] = [];
  if (params.resolvedProfile.detail) {
    detailParts.push(params.resolvedProfile.detail);
  }

  if (
    !supportsSandboxRuntimeCapabilityFamily(params.resolvedProfile.declaredProfileId, params.family)
  ) {
    reasonCodes.push("unsupported-runtime-family");
    detailParts.push(
      `Declared runtime profile ${params.resolvedProfile.declaredProfileId} does not support capability family ${params.family}.`,
    );
  }

  if (
    params.family === "browser-automation" &&
    params.resolvedProfile.profile.browserRuntimeRequired &&
    !params.resolvedProfile.browserEnabled
  ) {
    reasonCodes.push("browser-runtime-disabled");
    detailParts.push(
      "Dedicated sandbox browser support is disabled, so browser-only capability families are unavailable.",
    );
  }

  return {
    reasonCodes: Array.from(new Set(reasonCodes)),
    detail: combineDetail(detailParts),
  };
}

export function resolveSandboxRuntimeSkillSupport(params: {
  resolvedProfile: ResolvedSandboxRuntimeProfile;
  family: SandboxRuntimeSkillFamilyId;
}): {
  reasonCodes: ResolvedCapabilityUnavailableReason[];
  detail?: string;
} {
  const reasonCodes = [...params.resolvedProfile.reasonCodes];
  const detailParts: string[] = [];
  if (params.resolvedProfile.detail) {
    detailParts.push(params.resolvedProfile.detail);
  }

  if (!supportsSandboxRuntimeSkillFamily(params.resolvedProfile.declaredProfileId, params.family)) {
    reasonCodes.push("unsupported-runtime-family");
    detailParts.push(
      `Declared runtime profile ${params.resolvedProfile.declaredProfileId} does not support skill family ${params.family}.`,
    );
  }

  if (
    params.family === "browser-web-automation" &&
    params.resolvedProfile.profile.browserRuntimeRequired &&
    !params.resolvedProfile.browserEnabled
  ) {
    reasonCodes.push("browser-runtime-disabled");
    detailParts.push(
      "Dedicated sandbox browser support is disabled, so browser-oriented skills are unavailable.",
    );
  }

  return {
    reasonCodes: Array.from(new Set(reasonCodes)),
    detail: combineDetail(detailParts),
  };
}
