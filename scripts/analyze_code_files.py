#!/usr/bin/env python3
"""
Lists the longest and shortest code files in the project, and counts duplicated function names across files. Useful for identifying potential refactoring targets and enforcing code size guidelines.
Threshold can be set to warn about files longer or shorter than a certain number of lines.

CI mode (--compare-to): Only warns about files that grew past threshold compared to a base ref.
Use --strict to exit non-zero on violations for CI gating.
"""

import os
import re
import sys
import subprocess
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Set, Optional
from collections import defaultdict

# File extensions to consider as code files
CODE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",  # TypeScript/JavaScript
    ".swift",  # macOS/iOS
    ".kt",
    ".java",  # Android
    ".py",
    ".sh",  # Scripts
}

# Directories to skip
SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".turbo",
    "out",
    ".worktrees",
    "vendor",
    "Pods",
    "DerivedData",
    ".gradle",
    ".idea",
    "Swabble",  # Separate Swift package
    "skills",  # Standalone skill scripts
    ".pi",  # Pi editor extensions
}

# Filename patterns to skip in short-file warnings (barrel exports, stubs)
SKIP_SHORT_PATTERNS = {
    "index.js",
    "index.ts",
    "postinstall.js",
}
SKIP_SHORT_SUFFIXES = ("-cli.ts",)

# Function names to skip in duplicate detection (common utilities, test helpers)
SKIP_DUPLICATE_FUNCTIONS = {
<<<<<<< HEAD
    # Common utility names
    'main', 'init', 'setup', 'teardown', 'cleanup', 'dispose', 'destroy',
    'open', 'close', 'connect', 'disconnect', 'execute', 'run', 'start', 'stop',
    'render', 'update', 'refresh', 'reset', 'clear', 'flush',
}

SKIP_DUPLICATE_PREFIXES = (
    # Transformers
    'normalize', 'parse', 'validate', 'serialize', 'deserialize',
    'convert', 'transform', 'extract', 'encode', 'decode',
    # Predicates
    'is', 'has', 'can', 'should', 'will',
    # Constructors/factories
    'create', 'make', 'build', 'generate', 'new',
    # Accessors
    'get', 'set', 'read', 'write', 'load', 'save', 'fetch',
    # Handlers
    'handle', 'on', 'emit',
    # Modifiers
    'add', 'remove', 'delete', 'update', 'insert', 'append',
    # Other common
    'to', 'from', 'with', 'apply', 'process', 'resolve', 'ensure', 'check',
    'filter', 'map', 'reduce', 'merge', 'split', 'join', 'find', 'search',
    'register', 'unregister', 'subscribe', 'unsubscribe',
)
SKIP_DUPLICATE_FILE_PATTERNS = ('.test.ts', '.test.tsx', '.spec.ts')
=======
    # Lifecycle / framework plumbing
    "main",
    "init",
    "setup",
    "teardown",
    "cleanup",
    "dispose",
    "destroy",
    "open",
    "close",
    "connect",
    "disconnect",
    "execute",
    "run",
    "start",
    "stop",
    "render",
    "update",
    "refresh",
    "reset",
    "clear",
    "flush",
    # Too-short / too-generic identifiers
    "text",
    "json",
    "pad",
    "mask",
    "digest",
    "confirm",
    "intro",
    "outro",
    "exists",
    "send",
    "receive",
    "listen",
    "log",
    "warn",
    "error",
    "info",
    "help",
    "version",
    "config",
    "configure",
    "describe",
    "test",
    "action",
}
SKIP_DUPLICATE_FILE_PATTERNS = (".test.ts", ".test.tsx", ".spec.ts")
>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)

# Known packages in the monorepo
PACKAGES = {"src", "apps", "extensions", "packages", "scripts", "ui", "test", "docs"}


def get_package(file_path: Path, root_dir: Path) -> str:
    """Get the package name for a file, or 'root' if at top level."""
    try:
        relative = file_path.relative_to(root_dir)
        parts = relative.parts
        if len(parts) > 0 and parts[0] in PACKAGES:
            return parts[0]
        return "root"
    except ValueError:
        return "root"


def count_lines(file_path: Path) -> int:
    """Count the number of lines in a file."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def find_code_files(root_dir: Path) -> List[Tuple[Path, int]]:
    """Find all code files and their line counts."""
    files_with_counts = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Remove skip directories from dirnames to prevent walking into them
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        for filename in filenames:
            file_path = Path(dirpath) / filename
            if file_path.suffix.lower() in CODE_EXTENSIONS:
                line_count = count_lines(file_path)
                files_with_counts.append((file_path, line_count))

    return files_with_counts


# Regex patterns for TypeScript functions (exported and internal)
TS_FUNCTION_PATTERNS = [
    # export function name(...) or function name(...)
    re.compile(r"^(?:export\s+)?(?:async\s+)?function\s+(\w+)", re.MULTILINE),
    # export const name = or const name =
    re.compile(
        r"^(?:export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>", re.MULTILINE
    ),
]


def extract_functions(file_path: Path) -> Set[str]:
    """Extract function names from a TypeScript file."""
    if file_path.suffix.lower() not in {".ts", ".tsx"}:
        return set()

    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return set()

    return extract_functions_from_content(content)


def find_duplicate_functions(
    files: List[Tuple[Path, int]], root_dir: Path
) -> Dict[str, List[Path]]:
    """Find function names that appear in multiple files."""
    function_locations: Dict[str, List[Path]] = defaultdict(list)

    for file_path, _ in files:
        # Skip test files for duplicate detection
        if any(file_path.name.endswith(pat) for pat in SKIP_DUPLICATE_FILE_PATTERNS):
            continue

        functions = extract_functions(file_path)
        for func in functions:
            # Skip known common function names
            if func in SKIP_DUPLICATE_FUNCTIONS:
                continue
            if any(func.startswith(prefix) for prefix in SKIP_DUPLICATE_PREFIXES):
                continue
            function_locations[func].append(file_path)
<<<<<<< HEAD
    
    # Filter to only duplicates
    return {name: paths for name, paths in function_locations.items() if len(paths) > 1}
=======

    # Filter to only duplicates, ignoring cross-package duplicates.
    # Independent packages (extensions/*, apps/*, ui/) are treated like separate codebases —
    # the same function name in extensions/telegram and extensions/discord,
    # or in apps/ios and apps/macos, is expected, not duplication.
    result: Dict[str, List[Path]] = {}
    for name, paths in function_locations.items():
        if len(paths) < 2:
            continue

        # Identify which independent package each path belongs to (if any)
        # Returns a unique package key or None if it's core code
        def get_independent_package(p: Path) -> Optional[str]:
            try:
                rel = p.relative_to(root_dir)
                parts = rel.parts
                if len(parts) >= 2:
                    # extensions/<name>, apps/<name> are each independent
                    if parts[0] in ("extensions", "apps"):
                        return f"{parts[0]}/{parts[1]}"
                # ui/ is a single independent package (browser frontend)
                if len(parts) >= 1 and parts[0] == "ui":
                    return "ui"
                return None
            except ValueError:
                return None

        package_keys = set()
        has_core = False
        for p in paths:
            pkg = get_independent_package(p)
            if pkg:
                package_keys.add(pkg)
            else:
                has_core = True

        # Skip if ALL instances are in different independent packages (no core overlap)
        if not has_core and len(package_keys) == len(paths):
            continue
        result[name] = paths
    return result
>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)


def validate_git_ref(root_dir: Path, ref: str) -> bool:
    """Validate that a git ref exists. Exits with error if not."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--verify", ref],
            capture_output=True,
            cwd=root_dir,
            encoding="utf-8",
        )
        return result.returncode == 0
    except Exception:
        return False


def get_file_content_at_ref(file_path: Path, root_dir: Path, ref: str) -> Optional[str]:
    """Get content of a file at a specific git ref. Returns None if file doesn't exist at ref."""
    try:
        relative_path = file_path.relative_to(root_dir)
        # Use forward slashes for git paths
        git_path = str(relative_path).replace("\\", "/")
        result = subprocess.run(
            ["git", "show", f"{ref}:{git_path}"],
            capture_output=True,
            cwd=root_dir,
            encoding="utf-8",
            errors="ignore",
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            # "does not exist" or "exists on disk, but not in" = file missing at ref (OK)
            if "does not exist" in stderr or "exists on disk" in stderr:
                return None
            # Other errors (bad ref, git broken) = genuine failure
            if stderr:
                print(f"⚠️  git show error for {git_path}: {stderr}", file=sys.stderr)
            return None
        return result.stdout
    except Exception as e:
        print(f"⚠️  failed to read {file_path} at {ref}: {e}", file=sys.stderr)
        return None


def get_line_count_at_ref(file_path: Path, root_dir: Path, ref: str) -> Optional[int]:
    """Get line count of a file at a specific git ref. Returns None if file doesn't exist at ref."""
    content = get_file_content_at_ref(file_path, root_dir, ref)
    if content is None:
        return None
    return len(content.splitlines())


def extract_functions_from_content(content: str) -> Set[str]:
    """Extract function names from TypeScript content string."""
    functions = set()
    for pattern in TS_FUNCTION_PATTERNS:
        for match in pattern.finditer(content):
            functions.add(match.group(1))
    return functions


def get_changed_files(root_dir: Path, compare_ref: str) -> Set[str]:
    """Get set of files changed between compare_ref and HEAD (relative paths with forward slashes)."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", compare_ref, "HEAD"],
            capture_output=True,
            cwd=root_dir,
            encoding="utf-8",
            errors="ignore",
        )
        if result.returncode != 0:
            return set()
        return {line.strip() for line in result.stdout.splitlines() if line.strip()}
    except Exception:
        return set()


def find_duplicate_regressions(
    files: List[Tuple[Path, int]],
    root_dir: Path,
    compare_ref: str,
) -> Dict[str, List[Path]]:
    """
    Find new duplicate function names that didn't exist at the base ref.
    Only checks functions in files that changed to keep CI fast.
    Returns dict of function_name -> list of current file paths, only for
    duplicates that are new (weren't duplicated at compare_ref).
    """
    # Build current duplicate map
    current_dupes = find_duplicate_functions(files, root_dir)
    if not current_dupes:
        return {}

    # Get changed files to scope the comparison
    changed_files = get_changed_files(root_dir, compare_ref)
    if not changed_files:
        return {}  # Nothing changed, no new duplicates possible

    # Only check duplicate functions that involve at least one changed file
    relevant_dupes: Dict[str, List[Path]] = {}
    for func_name, paths in current_dupes.items():
        involves_changed = any(
            str(p.relative_to(root_dir)).replace("\\", "/") in changed_files
            for p in paths
        )
        if involves_changed:
            relevant_dupes[func_name] = paths

    if not relevant_dupes:
        return {}

    # For relevant duplicates, check if they were already duplicated at base ref
    # Only need to read base versions of files involved in these duplicates
    files_to_check: Set[Path] = set()
    for paths in relevant_dupes.values():
        files_to_check.update(paths)

    base_function_locations: Dict[str, List[Path]] = defaultdict(list)
    for file_path in files_to_check:
        if file_path.suffix.lower() not in {".ts", ".tsx"}:
            continue
        content = get_file_content_at_ref(file_path, root_dir, compare_ref)
        if content is None:
            continue
        functions = extract_functions_from_content(content)
        for func in functions:
            if func in SKIP_DUPLICATE_FUNCTIONS:
                continue
            if any(func.startswith(prefix) for prefix in SKIP_DUPLICATE_PREFIXES):
                continue
            base_function_locations[func].append(file_path)

    base_dupes = {
        name for name, paths in base_function_locations.items() if len(paths) > 1
    }

    # Return only new duplicates
    return {
        name: paths for name, paths in relevant_dupes.items() if name not in base_dupes
    }


def find_threshold_regressions(
    files: List[Tuple[Path, int]],
    root_dir: Path,
    compare_ref: str,
    threshold: int,
) -> List[Tuple[Path, int, Optional[int]]]:
    """
    Find files that crossed the threshold compared to a base ref.
    Returns list of (path, current_lines, base_lines) for files that:
    - Were under threshold (or didn't exist) at compare_ref
    - Are now at or over threshold
    """
<<<<<<< HEAD
    regressions = []
    
=======
    crossed = []
    grew = []

>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)
    for file_path, current_lines in files:
        if current_lines < threshold:
            continue  # Not over threshold now, skip

        base_lines = get_line_count_at_ref(file_path, root_dir, compare_ref)
<<<<<<< HEAD
        
        # Regression if: file is new OR was under threshold before
        if base_lines is None or base_lines < threshold:
            regressions.append((file_path, current_lines, base_lines))
    
<<<<<<< HEAD
    return regressions
=======
=======

        if base_lines is None or base_lines < threshold:
            # New file or crossed the threshold
            crossed.append((file_path, current_lines, base_lines))
        elif current_lines > base_lines:
            # Already over threshold and grew larger
            grew.append((file_path, current_lines, base_lines))

>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)
    return crossed, grew


def _write_github_summary(
    summary_path: str,
    crossed: List[Tuple[Path, int, Optional[int]]],
    grew: List[Tuple[Path, int, int]],
    new_dupes: Dict[str, List[Path]],
    root_dir: Path,
    threshold: int,
    compare_ref: str,
) -> None:
    """Write a Markdown job summary to $GITHUB_STEP_SUMMARY."""
    lines: List[str] = []
    lines.append("## Code Size Check Failed\n")
    lines.append("> ⚠️ **DO NOT trash the code base!** The goal is maintainability.\n")

    if crossed:
        lines.append(
            f"### {len(crossed)} file(s) crossed the {threshold}-line threshold\n"
        )
        lines.append("| File | Before | After | Delta |")
        lines.append("|------|-------:|------:|------:|")
        for file_path, current, base in crossed:
            rel = str(file_path.relative_to(root_dir)).replace("\\", "/")
            before = f"{base:,}" if base is not None else "new"
            lines.append(
                f"| `{rel}` | {before} | {current:,} | +{current - (base or 0):,} |"
            )
        lines.append("")

    if grew:
        lines.append(f"### {len(grew)} already-large file(s) grew larger\n")
        lines.append("| File | Before | After | Delta |")
        lines.append("|------|-------:|------:|------:|")
        for file_path, current, base in grew:
            rel = str(file_path.relative_to(root_dir)).replace("\\", "/")
            lines.append(f"| `{rel}` | {base:,} | {current:,} | +{current - base:,} |")
        lines.append("")

    if new_dupes:
        lines.append(f"### {len(new_dupes)} new duplicate function name(s)\n")
        lines.append("| Function | Files |")
        lines.append("|----------|-------|")
        for func_name in sorted(new_dupes.keys()):
            paths = new_dupes[func_name]
            file_list = ", ".join(
                f"`{str(p.relative_to(root_dir)).replace(chr(92), '/')}`" for p in paths
            )
            lines.append(f"| `{func_name}` | {file_list} |")
        lines.append("")

    lines.append("<details><summary>How to fix</summary>\n")
    lines.append("- Split large files into smaller, focused modules")
    lines.append("- Extract helpers, types, or constants into separate files")
    lines.append("- See `AGENTS.md` for guidelines (~500–700 LOC target)")
    lines.append(f"- This check compares your PR against `{compare_ref}`")
    lines.append(
        f"- Only code files are checked: {', '.join(f'`{e}`' for e in sorted(CODE_EXTENSIONS))}"
    )
    lines.append("- Docs, test names, and config files are **not** affected")
    lines.append("\n</details>")

    try:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    except Exception as e:
        print(f"⚠️  Failed to write job summary: {e}", file=sys.stderr)
>>>>>>> b40a7771e (ci: imprpove warning for  size check)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze code files: list longest/shortest files, find duplicate function names"
    )
    parser.add_argument(
        "-t",
        "--threshold",
        type=int,
        default=1000,
        help="Warn about files longer than this many lines (default: 1000)",
    )
    parser.add_argument(
        "--min-threshold",
        type=int,
        default=10,
        help="Warn about files shorter than this many lines (default: 10)",
    )
    parser.add_argument(
        "-n",
        "--top",
        type=int,
        default=20,
        help="Show top N longest files (default: 20)",
    )
    parser.add_argument(
        "-b",
        "--bottom",
        type=int,
        default=10,
        help="Show bottom N shortest files (default: 10)",
    )
    parser.add_argument(
        "-d",
        "--directory",
        type=str,
        default=".",
        help="Directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--compare-to",
        type=str,
        default=None,
        help="Git ref to compare against (e.g., origin/main). Only warn about files that grew past threshold.",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with non-zero status if any violations found (for CI)",
    )

    args = parser.parse_args()

    root_dir = Path(args.directory).resolve()

    # CI delta mode: only show regressions
    if args.compare_to:
        print(f"\n📂 Scanning: {root_dir}")
        print(f"🔍 Comparing to: {args.compare_to}\n")

        if not validate_git_ref(root_dir, args.compare_to):
            print(f"❌ Invalid git ref: {args.compare_to}", file=sys.stderr)
            print(
                "   Make sure the ref exists (e.g. run 'git fetch origin <branch>')",
                file=sys.stderr,
            )
            sys.exit(2)

        files = find_code_files(root_dir)
        violations = False

        # Check file length regressions
<<<<<<< HEAD
        regressions = find_threshold_regressions(files, root_dir, args.compare_to, args.threshold)
        
        if regressions:
            print(f"⚠️  {len(regressions)} file(s) crossed {args.threshold} line threshold:\n")
            for file_path, current, base in regressions:
=======
        crossed, grew = find_threshold_regressions(
            files, root_dir, args.compare_to, args.threshold
        )

        if crossed:
            print(
                f"⚠️  {len(crossed)} file(s) crossed {args.threshold} line threshold:\n"
            )
            for file_path, current, base in crossed:
>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)
                relative_path = file_path.relative_to(root_dir)
                if base is None:
                    print(f"   {relative_path}: {current:,} lines (new file)")
                else:
                    print(
                        f"   {relative_path}: {base:,} → {current:,} lines (+{current - base:,})"
                    )
            print()
            violations = True
        else:
            print(f"✅ No files crossed {args.threshold} line threshold")

<<<<<<< HEAD
=======
        if grew:
            print(f"⚠️  {len(grew)} already-large file(s) grew larger:\n")
            for file_path, current, base in grew:
                relative_path = file_path.relative_to(root_dir)
                print(
                    f"   {relative_path}: {base:,} → {current:,} lines (+{current - base:,})"
                )
            print()
            violations = True
        else:
            print(f"✅ No already-large files grew")

>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)
        # Check new duplicate function names
        new_dupes = find_duplicate_regressions(files, root_dir, args.compare_to)

        if new_dupes:
            print(f"⚠️  {len(new_dupes)} new duplicate function name(s):\n")
            for func_name in sorted(new_dupes.keys()):
                paths = new_dupes[func_name]
                print(f"   {func_name}:")
                for path in paths:
                    print(f"       {path.relative_to(root_dir)}")
            print()
            violations = True
        else:
            print(f"✅ No new duplicate function names")

        print()
        if args.strict and violations:
<<<<<<< HEAD
=======
            # Emit GitHub Actions file annotations so violations appear inline in the PR diff
            in_gha = os.environ.get("GITHUB_ACTIONS") == "true"
            if in_gha:
                for file_path, current, base in crossed:
                    rel = str(file_path.relative_to(root_dir)).replace("\\", "/")
                    if base is None:
                        print(
                            f"::error file={rel},title=File over {args.threshold} lines::{rel} is {current:,} lines (new file). Split into smaller modules."
                        )
                    else:
                        print(
                            f"::error file={rel},title=File crossed {args.threshold} lines::{rel} grew from {base:,} to {current:,} lines (+{current - base:,}). Split into smaller modules."
                        )
                for file_path, current, base in grew:
                    rel = str(file_path.relative_to(root_dir)).replace("\\", "/")
                    print(
                        f"::error file={rel},title=Large file grew larger::{rel} is already {base:,} lines and grew to {current:,} (+{current - base:,}). Consider refactoring."
                    )
                for func_name in sorted(new_dupes.keys()):
                    for p in new_dupes[func_name]:
                        rel = str(p.relative_to(root_dir)).replace("\\", "/")
                        print(
                            f"::error file={rel},title=Duplicate function '{func_name}'::Function '{func_name}' appears in multiple files. Centralize or rename."
                        )

            # Write GitHub Actions job summary (visible in the Actions check details)
            summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
            if summary_path:
                _write_github_summary(
                    summary_path,
                    crossed,
                    grew,
                    new_dupes,
                    root_dir,
                    args.threshold,
                    args.compare_to,
                )

            # Print actionable summary so contributors know what to do
            print("─" * 60)
            print("❌ Code size check failed\n")
            print("   ⚠️  DO NOT just trash the code base!")
            print("   The goal is maintainability.\n")
            if crossed:
                print(
                    f"   {len(crossed)} file(s) grew past the {args.threshold}-line limit."
                )
            if grew:
                print(
                    f"   {len(grew)} file(s) already over {args.threshold} lines got larger."
                )
            print()
            print("   How to fix:")
            print("   • Split large files into smaller, focused modules")
            print("   • Extract helpers, types, or constants into separate files")
            print("   • See AGENTS.md for guidelines (~500-700 LOC target)")
            print()
            print(f"   This check compares your PR against {args.compare_to}.")
            print(
                f"   Only code files are checked ({', '.join(sorted(e for e in CODE_EXTENSIONS))})."
            )
            print("   Docs, tests names, and config files are not affected.")
            print("─" * 60)
>>>>>>> b40a7771e (ci: imprpove warning for  size check)
            sys.exit(1)
<<<<<<< HEAD
        
=======
        elif args.strict:
            print("─" * 60)
            print("✅ Code size check passed — no files exceed thresholds.")
            print("─" * 60)

>>>>>>> 5c62e4d51 (Improve code analyzer for independent packages, CI: only run release-check on push to main)
        return

    print(f"\n📂 Scanning: {root_dir}\n")

    # Find and sort files by line count
    files = find_code_files(root_dir)
    files_desc = sorted(files, key=lambda x: x[1], reverse=True)
    files_asc = sorted(files, key=lambda x: x[1])

    # Show top N longest files
    top_files = files_desc[: args.top]

    print(f"📊 Top {min(args.top, len(top_files))} longest code files:\n")
    print(f"{'Lines':>8}  {'File'}")
    print("-" * 60)

    long_warnings = []

    for file_path, line_count in top_files:
        relative_path = file_path.relative_to(root_dir)

        # Check if over threshold
        if line_count >= args.threshold:
            marker = " ⚠️"
            long_warnings.append((relative_path, line_count))
        else:
            marker = ""

        print(f"{line_count:>8}  {relative_path}{marker}")

    # Show bottom N shortest files
    bottom_files = files_asc[: args.bottom]

    print(f"\n📉 Bottom {min(args.bottom, len(bottom_files))} shortest code files:\n")
    print(f"{'Lines':>8}  {'File'}")
    print("-" * 60)

    short_warnings = []

    for file_path, line_count in bottom_files:
        relative_path = file_path.relative_to(root_dir)
        filename = file_path.name

        # Skip known barrel exports and stubs
        is_expected_short = filename in SKIP_SHORT_PATTERNS or any(
            filename.endswith(suffix) for suffix in SKIP_SHORT_SUFFIXES
        )

        # Check if under threshold
        if line_count <= args.min_threshold and not is_expected_short:
            marker = " ⚠️"
            short_warnings.append((relative_path, line_count))
        else:
            marker = ""

        print(f"{line_count:>8}  {relative_path}{marker}")

    # Summary
    total_files = len(files)
    total_lines = sum(count for _, count in files)

    print("-" * 60)
    print(f"\n📈 Summary:")
    print(f"   Total code files: {total_files:,}")
    print(f"   Total lines: {total_lines:,}")
    print(
        f"   Average lines/file: {total_lines // total_files if total_files else 0:,}"
    )

    # Per-package breakdown
    package_stats: dict[str, dict] = {}
    for file_path, line_count in files:
        pkg = get_package(file_path, root_dir)
        if pkg not in package_stats:
            package_stats[pkg] = {"files": 0, "lines": 0}
        package_stats[pkg]["files"] += 1
        package_stats[pkg]["lines"] += line_count

    print(f"\n📦 Per-package breakdown:\n")
    print(f"{'Package':<15} {'Files':>8} {'Lines':>10} {'Avg':>8}")
    print("-" * 45)

    for pkg in sorted(
        package_stats.keys(), key=lambda p: package_stats[p]["lines"], reverse=True
    ):
        stats = package_stats[pkg]
        avg = stats["lines"] // stats["files"] if stats["files"] else 0
        print(f"{pkg:<15} {stats['files']:>8,} {stats['lines']:>10,} {avg:>8,}")

    # Long file warnings
    if long_warnings:
        print(
            f"\n⚠️  Warning: {len(long_warnings)} file(s) exceed {args.threshold} lines (consider refactoring):"
        )
        for path, count in long_warnings:
            print(f"   - {path} ({count:,} lines)")
    else:
        print(f"\n✅ No files exceed {args.threshold} lines")

    # Short file warnings
    if short_warnings:
        print(
            f"\n⚠️  Warning: {len(short_warnings)} file(s) are {args.min_threshold} lines or less (check if needed):"
        )
        for path, count in short_warnings:
            print(f"   - {path} ({count} lines)")
    else:
        print(f"\n✅ No files are {args.min_threshold} lines or less")

    # Duplicate function names
    duplicates = find_duplicate_functions(files, root_dir)
    if duplicates:
        print(
            f"\n⚠️  Warning: {len(duplicates)} function name(s) appear in multiple files (consider renaming):"
        )
        for func_name in sorted(duplicates.keys()):
            paths = duplicates[func_name]
            print(f"   - {func_name}:")
            for path in paths:
                print(f"       {path.relative_to(root_dir)}")
    else:
        print(f"\n✅ No duplicate function names")

    print()

    # Exit with error if --strict and there are violations
    if args.strict and long_warnings:
        sys.exit(1)


if __name__ == "__main__":
    main()
