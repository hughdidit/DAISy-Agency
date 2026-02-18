<<<<<<< HEAD
=======
import type { ConsoleLoggerSettings, ConsoleStyle } from "./logging/console.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import type { LogLevel } from "./logging/levels.js";
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
import type { SubsystemLogger } from "./logging/subsystem.js";
>>>>>>> ed11e93cf (chore(format))
=======
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import type { LogLevel } from "./logging/levels.js";
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
import type { SubsystemLogger } from "./logging/subsystem.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import {
  enableConsoleCapture,
  getConsoleSettings,
  getResolvedConsoleSettings,
  routeLogsToStderr,
  setConsoleSubsystemFilter,
  setConsoleConfigLoaderForTests,
  setConsoleTimestampPrefix,
  shouldLogSubsystemToConsole,
} from "./logging/console.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { ConsoleLoggerSettings, ConsoleStyle } from "./logging/console.js";
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
import type { LogLevel } from "./logging/levels.js";
=======
import type { LogLevel } from "./logging/levels.js";
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
>>>>>>> ed11e93cf (chore(format))
=======
import type { LogLevel } from "./logging/levels.js";
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { LogLevel } from "./logging/levels.js";
import { ALLOWED_LOG_LEVELS, levelToMinLevel, normalizeLogLevel } from "./logging/levels.js";
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import {
  DEFAULT_LOG_DIR,
  DEFAULT_LOG_FILE,
  getChildLogger,
  getLogger,
  getResolvedLoggerSettings,
  isFileLogLevelEnabled,
  resetLogger,
  setLoggerOverride,
  toPinoLikeLogger,
} from "./logging/logger.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import type { LoggerResolvedSettings, LoggerSettings, PinoLikeLogger } from "./logging/logger.js";
=======
import type { SubsystemLogger } from "./logging/subsystem.js";
>>>>>>> 90ef2d6bd (chore: Update formatting.)
=======
>>>>>>> ed11e93cf (chore(format))
=======
import type { SubsystemLogger } from "./logging/subsystem.js";
>>>>>>> d0cb8c19b (chore: wtf.)
=======
>>>>>>> 31f9be126 (style: run oxfmt and fix gate failures)
=======
import type { SubsystemLogger } from "./logging/subsystem.js";
>>>>>>> b8b43175c (style: align formatting with oxfmt 0.33)
import {
  createSubsystemLogger,
  createSubsystemRuntime,
  runtimeForLogger,
  stripRedundantSubsystemPrefixForConsole,
} from "./logging/subsystem.js";
import type { SubsystemLogger } from "./logging/subsystem.js";

export {
  enableConsoleCapture,
  getConsoleSettings,
  getResolvedConsoleSettings,
  routeLogsToStderr,
  setConsoleSubsystemFilter,
  setConsoleConfigLoaderForTests,
  setConsoleTimestampPrefix,
  shouldLogSubsystemToConsole,
  ALLOWED_LOG_LEVELS,
  levelToMinLevel,
  normalizeLogLevel,
  DEFAULT_LOG_DIR,
  DEFAULT_LOG_FILE,
  getChildLogger,
  getLogger,
  getResolvedLoggerSettings,
  isFileLogLevelEnabled,
  resetLogger,
  setLoggerOverride,
  toPinoLikeLogger,
  createSubsystemLogger,
  createSubsystemRuntime,
  runtimeForLogger,
  stripRedundantSubsystemPrefixForConsole,
};

export type {
  ConsoleLoggerSettings,
  ConsoleStyle,
  LogLevel,
  LoggerResolvedSettings,
  LoggerSettings,
  PinoLikeLogger,
  SubsystemLogger,
};
