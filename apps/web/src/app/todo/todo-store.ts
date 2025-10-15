import { create } from "zustand";
import { persist } from "zustand/middleware";

type TodoStore = {
  tasks: TodoListTask[];
  addTask: (task?: Omit<TodoListTask, "id">) => void;
  updateTask: (id: string, value: Partial<TodoListTask>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  updateSubTask: (
    taskId: string,
    subTaskId: string,
    value: Partial<TodoListSubTask>,
  ) => void;
};

const useTodoStore = create<TodoStore>()(
  persist(
    (set, get) => ({
      tasks: [
        { id: "1", title: "Study for Bio Test", checked: false },
        { id: "2", title: "A&A Homework", checked: false },
      ],

      addTask: (task) =>
        set((state) => ({
          tasks: [
            ...state.tasks,
            { title: "", checked: false, ...task, id: crypto.randomUUID() },
          ],
        })),

      updateTask: (id, value) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...value } : task,
          ),
        })),

      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
        })),

      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, checked: !task.checked } : task,
          ),
        })),

      updateSubTask: (taskId, subTaskId, value) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subTasks: task.subTasks?.map((subTask) =>
                    subTask.id === subTaskId
                      ? { ...subTask, ...value }
                      : subTask,
                  ),
                }
              : task,
          ),
        })),
    }),
    {
      name: "todo-storage",
    },
  ),
);

export function useTodoList<T>(
  selector?: (state: TodoStore) => T,
): T extends undefined ? TodoStore : T {
  const results = selector ? useTodoStore(selector) : useTodoStore();

  return results as T extends undefined ? TodoStore : T;
}

export type TodoListTask = {
  id: string;
  title: string;
  checked: boolean;
  description?: string;
  date?: Date;
  dueDate?: Date;
  subTasks?: TodoListSubTask[];
};
export type TodoListSubTask = { id: string; title: string; checked: boolean };
