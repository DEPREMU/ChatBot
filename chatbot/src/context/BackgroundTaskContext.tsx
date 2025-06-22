import {
  ScreensAvailable,
  RootStackParamList,
} from "@navigation/navigationTypes";
import { StatusBar } from "react-native";
import { log, logError } from "@utils";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import React, { createContext, useContext, useRef, useState } from "react";

type BackgroundTask = () => void | Promise<void>;

/**
 * Context type for managing background tasks and navigation-related utilities.
 *
 * @remarks
 * This context provides methods for running tasks immediately or queuing them for sequential execution,
 * as well as utilities for updating navigation state and status bar appearance.
 *
 * @property runTask - Executes a given background task immediately, bypassing the queue.
 * @property addTaskQueue - Adds a background task to the queue for sequential execution.
 * @property updateScreen - Updates or replaces the current screen in the navigation stack.
 * @property getCurrentRouteName - Retrieves the name of the current route.
 * @property setBgColorStatusBar - Sets the background color of the status bar.
 * @property setTranslucentStatusBar - Sets the translucency of the status bar.
 */
interface BackgroundTaskContextType {
  /**
   * Runs a given task immediately.
   *
   * @param task - The task to run.
   *
   * @remarks
   * - This function executes the task immediately, without adding it to the queue.
   * - It is useful for tasks that need to be executed right away, rather than waiting for the queue.
   *
   * @example
   * ```tsx
   * const { runTask } = useContext(BackgroundTaskContext);
   * runTask(() => {
   *  log("Task executed immediately");
   * });
   * ```
   *
   * Practical example:
   * ```tsx
   * const { runTask } = useContext(BackgroundTaskContext);
   * const updateDB = async () => {
   * // This function will be executed immediately
   * // This is good for updating a database or making an API call
   * // without blocking the main thread. And avoiding the cancellation of the task
   * // if the user closes the app or navigates to another screen.
   * await fetch("https://example.com/api/update", {
   *  method: "POST",
   * body: JSON.stringify({ data: "new data" }),
   * headers: {
   *     "Content-Type": "application/json",
   * },
   * });
   * log("Database updated");
   * };
   *
   * runTask(updateDB);
   * ```
   *
   */
  runTask: (task: BackgroundTask) => void;

  /**
   * Adds a new background task to the task queue.
   *
   * @param task - The background task to be added to the queue.
   *
   * @remarks
   * - This function allows you to queue a task that will be executed later.
   * - The tasks in the queue are executed sequentially, ensuring that each task is completed before the next one starts.
   * @example
   * ```tsx
   * const { addTaskQueue } = useContext(BackgroundTaskContext);
   * addTaskQueue(() => {
   *  log("Task added to queue");
   * });
   * ```
   *
   * Practical example:
   * ```tsx
   * const { addTaskQueue } = useContext(BackgroundTaskContext);
   * const updateDB = async () => {
   *   // This function will be executed in the background
   *   // This is good for updating a database or making an API call
   *   // without blocking the main thread. And avoiding the cancellation of the task
   *   // if the user closes the app or navigates to another screen.
   *   await fetch("https://example.com/api/update", {
   *     method: "POST",
   *     body: JSON.stringify({ data: "new data" }),
   *     headers: {
   *       "Content-Type": "application/json",
   *     },
   *   });
   *   log("Database updated");
   * };
   * addTaskQueue(updateDB);
   *
   * ```
   */
  addTaskQueue: (task: BackgroundTask) => void;

  /**
   * Updates the current screen in the navigation stack.
   *
   * @param screen - The screen to navigate to.
   * @param force - If true, replaces the current screen regardless of the current route.
   *
   * @remarks
   * - If `force` is true, the current screen is replaced with the specified screen.
   * - If `force` is false and the specified screen is the current screen, it is replaced.
   * - If `force` is false and the specified screen is not the current screen, a message is logged.
   *
   * @example
   * ```tsx
   * updateScreen("Home");
   * ```
   *
   * Practical example:
   * ```tsx
   * const { updateScreen, addTaskQueue, getCurrentRouteName } = useContext(BackgroundTaskContext);
   * const updateDB = async () => {
   * // Simulate a background task
   * // After the task is done, update the screen
   * // This is just in case the data on the screen must be updated
   * updateScreen(getCurrentRouteName());
   * };
   *
   * addTaskQueue(updateDB);
   * ```
   */
  updateScreen: (screen: ScreensAvailable, force?: boolean) => void;

  /**
   * Retrieves the name of the current route from the navigation state.
   *
   * @returns {ScreensAvailable} The name of the current route as a `ScreensAvailable` type.
   */
  getCurrentRouteName: () => ScreensAvailable;

  /**
   * Sets the background color of the status bar.
   *
   * @param color - The color to set for the status bar background.
   */
  setBgColorStatusBar: React.Dispatch<React.SetStateAction<string>>;

  /**
   * Sets whether the status bar is translucent.
   *
   * @param translucent - If true, the status bar will be translucent; otherwise, it will not be.
   */
  setTranslucentStatusBar: React.Dispatch<React.SetStateAction<boolean>>;
}

interface BackgroundTaskProviderProps {
  children: React.ReactNode;
}

/**
 * BackgroundTaskContext provides a way to manage background tasks in a React application.
 *
 * It allows adding tasks to a queue and executing them sequentially, as well as
 * updating the current screen in the navigation stack.
 *
 * @context
 * @returns {BackgroundTaskContextType} The context value containing the `runTask`,
 * `addTaskQueue`, `updateScreen`, and `getCurrentRouteName` methods.
 */
const BackgroundTaskContext = createContext<BackgroundTaskContextType | null>(
  null
);

/**
 * A React context provider component for managing background tasks.
 *
 * This provider maintains a queue of background tasks and ensures they are executed
 * sequentially. It provides methods to add tasks to the queue and to run tasks directly.
 *
 * @param children - The child components that will have access to the context.
 *
 * @returns A context provider that supplies the `runTask` and `addTaskQueue` methods.
 *
 * @remarks
 * - The `tasksQueue` state holds the queue of background tasks.
 * - The `addTaskQueue` function adds a new task to the queue.
 * - The `runTask` function executes a given task immediately.
 * - The `useEffect` hook monitors the `tasksQueue` and ensures tasks are executed
 *   sequentially, removing each task from the queue after execution.
 *
 * @example
 * ```tsx
 * const { addTaskQueue } = useContext(BackgroundTaskContext);
 *
 * addTaskQueue(() => {
 *   log("Task 1 executed");
 * });
 * ```
 *
 * Practical example:
 * ```tsx
 * const { addTaskQueue } = useContext(BackgroundTaskContext);
 * const updateDB = async () => {
 * // This function will be executed in the background
 * // This is good for updating a database or making an API call
 * // without blocking the main thread. And avoiding the cancellation of the task
 * // if the user closes the app or navigates to another screen.
 * await fetch("https://example.com/api/update", {
 *  method: "POST",
 *  body: JSON.stringify({ data: "new data" }),
 *  headers: {
 *      "Content-Type": "application/json",
 *  },
 *  });
 *  log("Database updated");
 * };
 *
 * addTaskQueue(updateDB);
 * ```
 *
 */
export const BackgroundTaskProvider: React.FC<BackgroundTaskProviderProps> = ({
  children,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [bgColorStatusBar, setBgColorStatusBar] =
    useState<string>("transparent");
  const [translucentStatusBar, setTranslucentStatusBar] =
    useState<boolean>(true);

  const taskQueueRef = useRef<BackgroundTask[]>([]);
  const isProcessingRef = useRef<boolean>(false);

  const getCurrentRouteName = () => {
    return useNavigationState((state) => {
      const route = state.routes[state.index];
      return route.name as ScreensAvailable;
    });
  };

  const addTaskQueue = (task: BackgroundTask) => {
    taskQueueRef.current.push(task);
    processQueue();
  };

  const runTask = async (task: BackgroundTask) => {
    try {
      await task();
    } catch {}
  };

  const updateScreen = (screen: ScreensAvailable, force?: boolean) => {
    const currentRouteName = getCurrentRouteName();

    if (force || currentRouteName === screen) navigation.replace(screen);
    else log("The screen given is not the current screen");
  };

  const processQueue = async () => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;

    while (taskQueueRef.current.length > 0) {
      const task = taskQueueRef.current.shift();
      if (!task) continue;

      try {
        await task();
      } catch (err) {
        logError("Error in background task:", err);
      }
    }

    isProcessingRef.current = false;
  };

  return (
    <BackgroundTaskContext.Provider
      value={{
        runTask,
        addTaskQueue,
        updateScreen,
        getCurrentRouteName,
        setBgColorStatusBar,
        setTranslucentStatusBar,
      }}
    >
      <StatusBar
        backgroundColor={bgColorStatusBar}
        translucent={translucentStatusBar}
      />
      {children}
    </BackgroundTaskContext.Provider>
  );
};

/**
 * Custom hook to use the BackgroundTaskContext.
 *
 * @returns {BackgroundTaskContextType} The context value containing the `runTask`,
 * `addTaskQueue`, `updateScreen`, `getCurrentRouteName`, `setBgColorStatusBar`, and `setTranslucentStatusBar` methods.
 *
 * @throws {Error} If used outside of a BackgroundTaskProvider.
 */
export const useBackgroundTask = (): BackgroundTaskContextType => {
  const context = useContext(BackgroundTaskContext);
  if (!context) {
    throw new Error(
      "useBackgroundTask must be used within a BackgroundTaskProvider"
    );
  }
  return context;
};
