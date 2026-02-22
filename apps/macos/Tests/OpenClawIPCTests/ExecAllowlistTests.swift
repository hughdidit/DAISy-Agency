import Foundation
import Testing
@testable import OpenClaw

struct ExecAllowlistTests {
    @Test func matchUsesResolvedPath() {
        let entry = ExecAllowlistEntry(pattern: "/opt/homebrew/bin/rg")
        let resolution = ExecCommandResolution(
            rawExecutable: "rg",
            resolvedPath: "/opt/homebrew/bin/rg",
            executableName: "rg",
            cwd: nil)
        let match = ExecAllowlistMatcher.match(entries: [entry], resolution: resolution)
        #expect(match?.pattern == entry.pattern)
    }

    @Test func matchUsesBasenameForSimplePattern() {
        let entry = ExecAllowlistEntry(pattern: "rg")
        let resolution = ExecCommandResolution(
            rawExecutable: "rg",
            resolvedPath: "/opt/homebrew/bin/rg",
            executableName: "rg",
            cwd: nil)
        let match = ExecAllowlistMatcher.match(entries: [entry], resolution: resolution)
        #expect(match?.pattern == entry.pattern)
    }

    @Test func matchIsCaseInsensitive() {
        let entry = ExecAllowlistEntry(pattern: "RG")
        let resolution = ExecCommandResolution(
            rawExecutable: "rg",
            resolvedPath: "/opt/homebrew/bin/rg",
            executableName: "rg",
            cwd: nil)
        let match = ExecAllowlistMatcher.match(entries: [entry], resolution: resolution)
        #expect(match?.pattern == entry.pattern)
    }

    @Test func matchSupportsGlobStar() {
        let entry = ExecAllowlistEntry(pattern: "/opt/**/rg")
        let resolution = ExecCommandResolution(
            rawExecutable: "rg",
            resolvedPath: "/opt/homebrew/bin/rg",
            executableName: "rg",
            cwd: nil)
        let match = ExecAllowlistMatcher.match(entries: [entry], resolution: resolution)
        #expect(match?.pattern == entry.pattern)
    }
<<<<<<< HEAD
=======

    @Test func resolveForAllowlistSplitsShellChains() {
        let command = ["/bin/sh", "-lc", "echo allowlisted && /usr/bin/touch /tmp/openclaw-allowlist-test"]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: "echo allowlisted && /usr/bin/touch /tmp/openclaw-allowlist-test",
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.count == 2)
        #expect(resolutions[0].executableName == "echo")
        #expect(resolutions[1].executableName == "touch")
    }

    @Test func resolveForAllowlistKeepsQuotedOperatorsInSingleSegment() {
        let command = ["/bin/sh", "-lc", "echo \"a && b\""]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: "echo \"a && b\"",
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.count == 1)
        #expect(resolutions[0].executableName == "echo")
    }

    @Test func resolveForAllowlistFailsClosedOnCommandSubstitution() {
        let command = ["/bin/sh", "-lc", "echo $(/usr/bin/touch /tmp/openclaw-allowlist-test-subst)"]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: "echo $(/usr/bin/touch /tmp/openclaw-allowlist-test-subst)",
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.isEmpty)
    }

    @Test func resolveForAllowlistFailsClosedOnQuotedCommandSubstitution() {
        let command = ["/bin/sh", "-lc", "echo \"ok $(/usr/bin/touch /tmp/openclaw-allowlist-test-quoted-subst)\""]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: "echo \"ok $(/usr/bin/touch /tmp/openclaw-allowlist-test-quoted-subst)\"",
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.isEmpty)
    }

    @Test func resolveForAllowlistFailsClosedOnQuotedBackticks() {
        let command = ["/bin/sh", "-lc", "echo \"ok `/usr/bin/id`\""]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: "echo \"ok `/usr/bin/id`\"",
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.isEmpty)
    }

    @Test func resolveForAllowlistMatchesSharedShellParserFixture() throws {
        let fixtures = try Self.loadShellParserParityCases()
        for fixture in fixtures {
            let resolutions = ExecCommandResolution.resolveForAllowlist(
                command: ["/bin/sh", "-lc", fixture.command],
                rawCommand: fixture.command,
                cwd: nil,
                env: ["PATH": "/usr/bin:/bin"])

            #expect(!resolutions.isEmpty == fixture.ok)
            if fixture.ok {
                let executables = resolutions.map { $0.executableName.lowercased() }
                let expected = fixture.executables.map { $0.lowercased() }
                #expect(executables == expected)
            }
        }
    }

    @Test func resolveForAllowlistTreatsPlainShInvocationAsDirectExec() {
        let command = ["/bin/sh", "./script.sh"]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: nil,
            cwd: "/tmp",
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.count == 1)
        #expect(resolutions[0].executableName == "sh")
    }

    @Test func resolveForAllowlistUnwrapsEnvShellWrapperChains() {
        let command = ["/usr/bin/env", "/bin/sh", "-lc", "echo allowlisted && /usr/bin/touch /tmp/openclaw-allowlist-test"]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: nil,
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.count == 2)
        #expect(resolutions[0].executableName == "echo")
        #expect(resolutions[1].executableName == "touch")
    }

    @Test func resolveForAllowlistUnwrapsEnvToEffectiveDirectExecutable() {
        let command = ["/usr/bin/env", "FOO=bar", "/usr/bin/printf", "ok"]
        let resolutions = ExecCommandResolution.resolveForAllowlist(
            command: command,
            rawCommand: nil,
            cwd: nil,
            env: ["PATH": "/usr/bin:/bin"])
        #expect(resolutions.count == 1)
        #expect(resolutions[0].resolvedPath == "/usr/bin/printf")
        #expect(resolutions[0].executableName == "printf")
    }

    @Test func matchAllRequiresEverySegmentToMatch() {
        let first = ExecCommandResolution(
            rawExecutable: "echo",
            resolvedPath: "/usr/bin/echo",
            executableName: "echo",
            cwd: nil)
        let second = ExecCommandResolution(
            rawExecutable: "/usr/bin/touch",
            resolvedPath: "/usr/bin/touch",
            executableName: "touch",
            cwd: nil)
        let resolutions = [first, second]

        let partial = ExecAllowlistMatcher.matchAll(
            entries: [ExecAllowlistEntry(pattern: "/usr/bin/echo")],
            resolutions: resolutions)
        #expect(partial.isEmpty)

        let full = ExecAllowlistMatcher.matchAll(
            entries: [ExecAllowlistEntry(pattern: "/USR/BIN/ECHO"), ExecAllowlistEntry(pattern: "/usr/bin/touch")],
            resolutions: resolutions)
        #expect(full.count == 2)
    }
>>>>>>> 2b63592be (fix: harden exec allowlist wrapper resolution)
}
