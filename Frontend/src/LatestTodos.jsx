import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "./utils/axiosInstance";
import { Link } from "react-router-dom";
import { formatDate } from "./utils/dateFormatter";

export default function LatestTodos() {
  const [todos, setTodos] = useState([]);

  const IconCheck = () => (
    <svg
      className="w-3 h-3"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 16 12"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
        d="M1 5.917 5.724 10.5 15 1.5"
      />
    </svg>
  );

  const fetchTodos = async () => {
    try {
      var result = await api.get("/Employee/GetToDos?take=5");
      setTodos(result.data);
    } catch (err) {
      toast.error("Error while fetching ToDos");
    }
  };

  const handleToggle = async (id) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );

    const toggled = todos.find((t) => t.id == id);

    const updateTodo = {
      id: id,
      completed: !toggled.completed,
    };

    await api
      .patch("/Employee/UpdateToDoCompletion", updateTodo)
      .catch((err) => {
        toast.error("Error while updating the ToDo.");
        setTodos((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        );
      });

    setTimeout(() => refreshToDos(), 1800);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div className="p-4 flex-1 bg-white border border-gray-200 rounded-lg shadow-md sm:p-8 dark:bg-gray-800 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-xl font-bold leading-none text-gray-900 dark:text-white">
          Latest ToDos
        </h5>
        <Link
          to="todos"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-500"
        >
          View all
        </Link>
      </div>

      <ul className="divide-y divide-gray-200">
        {todos.map((todo) => {
          return (
            <li
              key={todo.id}
              className={`group p-4 transition-colors ${todo.completed ? "bg-gray-50/50" : "hover:bg-gray-50"}`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <div className="flex items-center h-5 mt-1">
                  <button
                    onClick={() => handleToggle(todo.id)}
                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center focus:ring-4 focus:outline-none
                            ${
                              todo.completed
                                ? "bg-blue-600 border-blue-600 focus:ring-blue-300"
                                : "bg-white border-gray-300 hover:border-blue-500 focus:ring-blue-100"
                            }`}
                  >
                    {todo.completed && (
                      <span className="text-white">
                        <IconCheck />
                      </span>
                    )}
                  </button>
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                  <div>
                    <p
                      className={`text-sm font-medium leading-relaxed ${todo.completed ? "text-gray-400 line-through" : "text-gray-900"}`}
                    >
                      {todo.content}
                    </p>
                    <div className="text-xs text-gray-500 flex justify-start  mt-3">
                      <span className="group-hover:text-gray-700 mr-1">
                        {todo.author} for
                      </span>
                      <Link to={`/employee/${todo.employeeId}`}>
                        <span className="group-hover:text-gray-700 mr-2 font-medium hover:underline">
                          {todo.employee}
                        </span>
                      </Link>
                      <span className="flex items-center">
                        <span className="w-1 h-1 bg-slate-200 rounded-full mr-2" />
                        {formatDate(todo.createdDateTime)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
