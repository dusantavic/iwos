import { useState, useMemo, useEffect } from "react";
import { IoFilter } from "react-icons/io5";
import { toast } from "react-toastify";
import api from "../utils/axiosInstance";
import { Link } from "react-router-dom";
import { formatDate } from "../utils/dateFormatter";
import Skeleton from "./Skeleton";

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
const IconEdit = () => (
  <svg
    className="w-4 h-4"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 20 18"
  >
    <path d="M12.687 14.408a3.01 3.01 0 0 1-1.533.821l-3.566.713a3 3 0 0 1-3.53-3.53l.713-3.566a3.01 3.01 0 0 1 .821-1.533L10.905 2H2.167A2.169 2.169 0 0 0 0 4.167v11.666A2.169 2.169 0 0 0 2.167 18h11.666A2.169 2.169 0 0 0 16 15.833V11.1l-3.313 3.308Zm5.53-9.065.546-.546a2.518 2.518 0 0 0 0-3.56 2.576 2.576 0 0 0-3.559 0l-.547.547 3.56 3.56Z" />
    <path d="M13.243 3.2 7.359 9.081a.5.5 0 0 0-.136.256L6.51 12.9a.5.5 0 0 0 .59.59l3.566-.713a.5.5 0 0 0 .255-.136L16.8 6.757 13.243 3.2Z" />
  </svg>
);
const IconTrash = () => (
  <svg
    className="w-4 h-4"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 18 20"
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M1 5h16M7 8v8m4-8v8M7 1h4a1 1 0 0 1 1 1v3H6V2a1 1 0 0 1 1-1ZM3 5h12v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5Z"
    />
  </svg>
);

const groupingOptions = [
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
  { key: "author", label: "Author" },
  { key: "employee", label: "Employee" },
  { key: "resolution", label: "Resolution" },
];

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function TodosPage() {
  const [loading, setLoading] = useState(true); 
  const [todos, setTodos] = useState([]);

  const [grouping, setGrouping] = useState("month");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");

  useEffect(() => {
    if (grouping == "resolution") {
      refreshToDos(true);
    } else {
      refreshToDos();
    }
  }, [grouping]);

  const handleDeleteTodo = async (id) => {
    await api.delete(`/Employee/DeleteToDo?toDoId=${id}`).catch(() => {
      toast.error("The ToDo couldn't be deleted");
    });

    refreshToDos();
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

  const refreshToDos = async (all) => {
    try {
      if (all) {
        var result = await api.get(`/Employee/GetToDos?all=true`);
        setTodos(result.data);
      } else {
        var result = await api.get("/Employee/GetToDos");
        setTodos(result.data);
      }
    } catch (err) {
      toast.error("Error while refreshing ToDos");
    }
    finally { 
      setLoading(false); 
    }
  };

  const filtered = useMemo(
    () =>
      todos.filter(
        (td) =>
          td.content.toLowerCase().includes(search.toLowerCase()) ||
          td.author.toLowerCase().includes(search.toLowerCase()) ||
          td.employee.toLowerCase().includes(search.toLowerCase()),
      ),
    [todos, search],
  );

  const getLabel = (grouping, key) => {
    if (grouping === "month") {
      return `${monthNames[+key.split("-")[1]]} ${key.split("-")[0]}`;
    } else if (grouping === "resolution") {
      return key ? "Uncompleted" : "Completed";
    }
    return key;
  };

  const handleEditTodo = (todo) => {
    setEditingId(todo.id);
    setEditVal(todo.content);
  };

  const handleSaveEdit = async () => {
    if (editVal.trim() === "") {
      toast.error("ToDo content can't be empty.");
      return;
    }

    var updateToDo = {
      id: editingId,
      content: editVal,
    };

    await api.patch("/Employee/UpdateToDoContent", updateToDo).catch((err) => {
      toast.error("Error while updating the ToDo.");
    });

    setEditingId(null);
    setEditVal("");
    refreshToDos();
  };

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((todo) => {
      const d = new Date(todo.createdDateTime);
      let key = "";
      switch (grouping) {
        case "month":
          key = `${d.getFullYear()}-${d.getMonth()}`;
          break;
        case "year":
          key = `${d.getFullYear()}`;
          break;
        case "author":
          key = todo.author;
          break;
        case "employee":
          key = todo.employee;
          break;
        case "resolution":
          key = !todo.completed;
          break;
      }
      map.has(key) ? map.get(key).push(todo) : map.set(key, [todo]);
    });

    return Array.from(map.entries())
      .sort((a, b) => {
        if (grouping === "month") {
          const [aYear, aMonth] = a[0].split("-").map(Number);
          const [bYear, bMonth] = b[0].split("-").map(Number);

          if (aYear !== bYear) return bYear - aYear;
          return bMonth - aMonth;
        }

        return a[0] < b[0] ? 1 : -1;
      })
      .map(([key, arr]) => {
        const label = getLabel(grouping, key);
        arr.sort(
          (a, b) => new Date(b.createdDateTime) - new Date(a.createdDateTime),
        );
        return { label, todos: arr };
      });
  }, [filtered, grouping]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-4">
      {loading && <Skeleton />}
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold mb-4 md:mb-0">All ToDos</h1>
        <div className="flex items-center space-x-2 w-full md:w-auto"></div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between mb-6">
        <div className="flex space-x-2 overflow-x-auto">
          {groupingOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setGrouping(opt.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
                grouping === opt.key
                  ? "bg-blue-600 text-white shadow-inner"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <div className="flex items-center space-x-2 mt-2 md:mt-0">
            <IoFilter className="text-gray-500" />
            <span className="text-sm text-gray-600">
              {filtered.length} ToDos
            </span>
          </div>

          <div>
            <div className="relative">
              <div className="absolute inset-y-0 rtl:inset-r-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  />
                </svg>
              </div>
              <input
                type="text"
                id="table-search-users"
                value={search ?? ""}
                onChange={(e) => setSearch(e.target.value)}
                className="block p-2 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg w-80 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Search ToDos"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ToDos Sections */}
      {grouped.map((section) => (
        <div key={section.label} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b border-gray-200 pb-1">
            {section.label}
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {section.todos.map((todo) => {
                const isEdit = editingId === todo.id;

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
                        {isEdit ? (
                          <div className="mt-1">
                            <textarea
                              value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                              rows="3"
                            />
                            <div className="flex mt-3 space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-xs px-3 py-2"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="py-2 px-3 text-xs font-medium text-gray-900 bg-white rounded-lg border border-gray-200 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
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
                        )}
                      </div>

                      {/* Actions */}
                      {!isEdit && !todo.completed && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTodo(todo)}
                            className="p-2 text-gray-500 rounded-lg hover:text-blue-600 hover:bg-blue-50 focus:ring-4 focus:ring-gray-100"
                          >
                            <IconEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="p-2 text-gray-500 rounded-lg hover:text-red-600 hover:bg-red-50 focus:ring-4 focus:ring-gray-100"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
