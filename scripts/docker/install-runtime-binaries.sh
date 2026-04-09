#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_PATH="${SCRIPT_DIR}/runtime-binaries.json"
INSTALL_PREFIX="${INSTALL_PREFIX:-/usr/local/bin}"
TARGET_ARCH_RAW="${TARGETARCH:-$(dpkg --print-architecture)}"
NPM_INSTALL_ROOT="${NPM_INSTALL_ROOT:-/usr/local}"

normalize_arch() {
  case "${1}" in
    amd64|x86_64)
      printf 'amd64\n'
      ;;
    arm64|aarch64)
      printf 'arm64\n'
      ;;
    *)
      printf 'Unsupported architecture: %s\n' "${1}" >&2
      return 1
      ;;
  esac
}

TARGET_ARCH="$(normalize_arch "${TARGET_ARCH_RAW}")"
INSTALL_TMP="$(mktemp -d)"
NPM_INSTALL_OCCURRED=0

cleanup() {
  rm -rf "${INSTALL_TMP}"
}
trap cleanup EXIT

log() {
  printf 'runtime-binaries: %s\n' "$*"
}

json_field() {
  local entry_json="${1:?entry json required}"
  local jq_expression="${2:?jq expression required}"
  jq -r "${jq_expression}" <<<"${entry_json}"
}

download_file() {
  local url="${1:?url required}"
  local destination="${2:?destination required}"
  curl -fsSL "${url}" -o "${destination}"
}

expected_checksum_from_file() {
  local checksum_type="${1:?checksum type required}"
  local checksum_path="${2:?checksum path required}"
  local asset_name="${3:?asset name required}"

  case "${checksum_type}" in
    sha256sum-file)
      awk -v asset="${asset_name}" '
        {
          candidate = $2
          sub(/^\*/, "", candidate)
          sub(/^.*\//, "", candidate)
          if (candidate == asset) {
            print $1
            exit
          }
        }
      ' "${checksum_path}"
      ;;
    sidecar)
      awk 'NR == 1 { print $1 }' "${checksum_path}"
      ;;
    *)
      printf 'Unsupported checksum type: %s\n' "${checksum_type}" >&2
      return 1
      ;;
  esac
}

verify_archive_checksum() {
  local entry_json="${1:?entry json required}"
  local archive_path="${2:?archive path required}"
  local asset_name="${3:?asset name required}"
  local checksum_type checksum_asset checksum_path expected actual

  checksum_type="$(json_field "${entry_json}" '.install.checksum.type')"
  if [[ "${checksum_type}" == "null" || -z "${checksum_type}" ]]; then
    printf 'Checksum metadata missing for %s\n' "$(json_field "${entry_json}" '.name')" >&2
    return 1
  fi

  case "${checksum_type}" in
    sha256sum-file)
      checksum_asset="$(json_field "${entry_json}" '.install.checksum.asset')"
      ;;
    sidecar)
      checksum_asset="$(jq -r --arg arch "${TARGET_ARCH}" '.install.checksum.asset_by_arch[$arch]' <<<"${entry_json}")"
      ;;
    *)
      printf 'Unsupported checksum type: %s\n' "${checksum_type}" >&2
      return 1
      ;;
  esac

  if [[ -z "${checksum_asset}" || "${checksum_asset}" == "null" ]]; then
    printf 'Checksum asset missing for %s on %s\n' "$(json_field "${entry_json}" '.name')" "${TARGET_ARCH}" >&2
    return 1
  fi

  checksum_path="${INSTALL_TMP}/${checksum_asset##*/}"
  download_file \
    "https://github.com/$(json_field "${entry_json}" '.install.repo')/releases/download/$(json_field "${entry_json}" '.install.tag')/${checksum_asset}" \
    "${checksum_path}"

  expected="$(expected_checksum_from_file "${checksum_type}" "${checksum_path}" "${asset_name}")"
  actual="$(sha256sum "${archive_path}" | awk '{print $1}')"

  if [[ -z "${expected}" ]]; then
    printf 'Unable to resolve expected checksum for %s\n' "${asset_name}" >&2
    return 1
  fi

  if [[ "${expected}" != "${actual}" ]]; then
    printf 'Checksum mismatch for %s: expected %s, got %s\n' "${asset_name}" "${expected}" "${actual}" >&2
    return 1
  fi
}

install_from_github_release() {
  local entry_json="${1:?entry json required}"
  local asset_name archive_path extract_dir source_path="" binary fallback_source_path=""

  asset_name="$(jq -r --arg arch "${TARGET_ARCH}" '.install.asset_by_arch[$arch]' <<<"${entry_json}")"
  binary="$(json_field "${entry_json}" '.binary')"

  if [[ -z "${asset_name}" || "${asset_name}" == "null" ]]; then
    log "Skipping ${binary}: no release asset for ${TARGET_ARCH}"
    return 0
  fi

  archive_path="${INSTALL_TMP}/${asset_name##*/}"
  extract_dir="${INSTALL_TMP}/extract-${binary}"
  mkdir -p "${extract_dir}"

  download_file \
    "https://github.com/$(json_field "${entry_json}" '.install.repo')/releases/download/$(json_field "${entry_json}" '.install.tag')/${asset_name}" \
    "${archive_path}"
  verify_archive_checksum "${entry_json}" "${archive_path}" "${asset_name}"

  tar -xzf "${archive_path}" -C "${extract_dir}"
  while IFS= read -r candidate_path; do
    if [[ -z "${fallback_source_path}" ]]; then
      fallback_source_path="${candidate_path}"
    fi
    if [[ -x "${candidate_path}" ]]; then
      source_path="${candidate_path}"
      break
    fi
  done < <(
    {
      find "${extract_dir}" \( -type f -o -type l \) -name "${binary}" \
        \( -path '*/bin/*' -o -path '*/sbin/*' -o -path '*/usr/bin/*' -o -path '*/usr/local/bin/*' \)
      find "${extract_dir}" \( -type f -o -type l \) -name "${binary}"
    } | awk '!seen[$0]++'
  )
  if [[ -z "${source_path}" ]]; then
    source_path="${fallback_source_path:-}"
  fi
  if [[ -z "${source_path}" ]]; then
    printf 'Unable to locate binary %s in archive %s\n' "${binary}" "${asset_name}" >&2
    return 1
  fi

  install -Dm755 "${source_path}" "${INSTALL_PREFIX}/${binary}"
}

install_from_npm() {
  local entry_json="${1:?entry json required}"
  local package_name package_version wrapper_type entrypoint binary package_root wrapper_path npm_global_bin

  package_name="$(json_field "${entry_json}" '.install.package')"
  package_version="$(json_field "${entry_json}" '.install.version')"
  npm install -g --prefix="${NPM_INSTALL_ROOT}" --omit=dev --no-audit --no-fund "${package_name}@${package_version}"
  npm_global_bin="${NPM_INSTALL_ROOT}/bin"

  wrapper_type="$(json_field "${entry_json}" '.install.wrapper.type')"
  if [[ "${wrapper_type}" == "node-entrypoint" ]]; then
    entrypoint="$(json_field "${entry_json}" '.install.wrapper.entrypoint')"
    binary="$(json_field "${entry_json}" '.binary')"
    if [[ -z "${entrypoint}" || "${entrypoint}" == "null" || -z "${binary}" || "${binary}" == "null" ]]; then
      printf 'Wrapper metadata missing for npm package %s\n' "${package_name:-<unknown>}" >&2
      return 1
    fi
    package_root="${NPM_INSTALL_ROOT}/lib/node_modules/${package_name}"
    wrapper_path="${npm_global_bin}/${binary}"
    install -d "${npm_global_bin}"
    rm -f "${wrapper_path}"
    cat >"${wrapper_path}" <<EOF
#!/usr/bin/env sh
exec node "${package_root}/${entrypoint}" "\$@"
EOF
    chmod 755 "${wrapper_path}"
  fi

  NPM_INSTALL_OCCURRED=1
}

install_entry() {
  local entry_json="${1:?entry json required}"
  local method binary version

  method="$(json_field "${entry_json}" '.install.method')"
  binary="$(json_field "${entry_json}" '.binary')"
  version="$(json_field "${entry_json}" '.version')"

  case "${method}" in
    system)
      log "Validating system binary ${binary} (${version})"
      ;;
    npm)
      log "Installing ${binary} (${version}) from npm"
      install_from_npm "${entry_json}"
      ;;
    github-release)
      log "Installing ${binary} (${version}) from GitHub release"
      install_from_github_release "${entry_json}"
      ;;
    *)
      printf 'Unsupported install method for %s: %s\n' "${binary}" "${method}" >&2
      return 1
      ;;
  esac
}

validate_entry() {
  local entry_json="${1:?entry json required}"
  local binary smoke_command binary_path smoke_stderr smoke_stderr_path

  binary="$(json_field "${entry_json}" '.binary')"
  smoke_command="$(json_field "${entry_json}" '.smoke')"
  binary_path="$(command -v "${binary}" || true)"
  if [[ -z "${binary_path}" ]]; then
    printf 'Binary missing after install: %s\n' "${binary}" >&2
    return 1
  fi

  smoke_stderr_path="$(mktemp "${INSTALL_TMP}/smoke-${binary}.XXXXXX.log")"
  if ! bash -lc "${smoke_command}" >/dev/null 2>"${smoke_stderr_path}"; then
    smoke_stderr="$(cat "${smoke_stderr_path}")"
    printf 'Smoke check failed for %s using command: %s\n' "${binary}" "${smoke_command}" >&2
    if [[ -n "${smoke_stderr}" ]]; then
      printf 'Smoke stderr for %s: %s\n' "${binary}" "${smoke_stderr}" >&2
    fi
    rm -f "${smoke_stderr_path}"
    return 1
  fi
  rm -f "${smoke_stderr_path}"

  log "Validated ${binary} at ${binary_path}"
}

while IFS= read -r entry_json; do
  install_entry "${entry_json}"
done < <(jq -c --arg arch "${TARGET_ARCH}" '.[] | select(.architectures | index($arch))' "${MANIFEST_PATH}")

if [[ "${NPM_INSTALL_OCCURRED}" == "1" ]]; then
  npm cache clean --force >/dev/null 2>&1 || true
fi

while IFS= read -r entry_json; do
  validate_entry "${entry_json}"
done < <(jq -c --arg arch "${TARGET_ARCH}" '.[] | select(.architectures | index($arch))' "${MANIFEST_PATH}")
